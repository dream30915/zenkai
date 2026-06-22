/**
 * Image Processing Pipeline
 * 1. Phaya (text-to-image) — สร้างรูปอาหาร (async generate→poll, ~1฿/รูป)
 * 2. rembg — background removal (self-hosted Docker)
 * 3. Sharp — resize, overlay text, format conversion
 */

import axios from "axios";
import sharp from "sharp";

// ----------------------------------------------------------------
// Config — Phaya (จ่ายบาท, ~1฿/รูป) · provider เดียวกับ LLM
// ----------------------------------------------------------------
const REMBG_URL = process.env.REMBG_URL || "http://localhost:7000";
const PHAYA_KEY = process.env.PHAYA_API_KEY || "";
const PHAYA_BASE = "https://api.phaya.io/api/v1";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

// ----------------------------------------------------------------
// generateFoodImage — สร้างรูปอาหารด้วย Phaya (text-to-image, async)
// ----------------------------------------------------------------
export async function generateFoodImage(
  menuName: string,
  style: "photo" | "artistic" = "photo"
): Promise<GeneratedImage> {
  if (!PHAYA_KEY) throw new Error("PHAYA_API_KEY not set");

  const prompt =
    style === "photo"
      ? `Professional food photography of ${menuName}, Japanese restaurant, top-down view, high quality, appetizing, natural lighting, on elegant plate`
      : `Artistic illustration of ${menuName}, Japanese food art style, vibrant colors, menu design`;

  // 1) สร้าง job
  const create = await axios.post(
    `${PHAYA_BASE}/text-to-image/generate`,
    { prompt: prompt.slice(0, 1000), aspect_ratio: "4:3" },
    {
      headers: { Authorization: `Bearer ${PHAYA_KEY}`, "Content-Type": "application/json" },
      timeout: 30000,
    },
  );
  const jobId = create.data?.job_id;
  if (!jobId) {
    throw new Error("Phaya: no job_id — " + JSON.stringify(create.data).slice(0, 200));
  }

  // 2) poll จนเสร็จ (สูงสุด ~90 วินาที)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const st = await axios.get(`${PHAYA_BASE}/text-to-image/status/${jobId}`, {
      headers: { Authorization: `Bearer ${PHAYA_KEY}` },
      timeout: 20000,
    });
    const status = String(st.data?.status || "");
    if (/COMPLETED|SUCCEEDED/i.test(status)) {
      const url: string | undefined = st.data?.image_url || st.data?.url;
      if (!url) throw new Error("Phaya: completed but no image_url");
      return { url, width: 1024, height: 768 };
    }
    if (/FAILED|ERROR/i.test(status)) throw new Error("Phaya: generation failed");
  }
  throw new Error("Phaya: timeout waiting for image");
}

// ----------------------------------------------------------------
// removeBackground — ลบพื้นหลังรูปด้วย rembg (self-hosted)
// ----------------------------------------------------------------
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const formData = new FormData();
  const blob = new Blob([imageBuffer as unknown as BlobPart], { type: "image/jpeg" });
  formData.append("file", blob, "image.jpg");

  const res = await axios.post(`${REMBG_URL}/api/remove`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "arraybuffer",
    timeout: 30000,
  });

  return Buffer.from(res.data);
}

// escape ข้อความก่อนฝังลง SVG — กันชื่อเมนูที่มี & < > " ทำให้ SVG พัง
function escapeXml(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ----------------------------------------------------------------
// addTextOverlay — ใส่ข้อความบนรูป (ชื่อเมนู + ราคา)
// ----------------------------------------------------------------
export async function addTextOverlay(
  imageBuffer: Buffer,
  options: {
    menuName: string;
    price?: string;
    position?: "top" | "bottom" | "center";
  }
): Promise<Buffer> {
  const { menuName, price, position = "bottom" } = options;

  const img = sharp(imageBuffer);
  const meta = await img.metadata();
  const w = meta.width || 1080;
  const h = meta.height || 1080;

  // สร้าง gradient overlay
  const gradientHeight = Math.floor(h * 0.3);
  const yPos = position === "bottom" ? h - gradientHeight : 0;

  const svgText = `
    <svg width="${w}" height="${h}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="${position === "bottom" ? "0%" : "100%"}" x2="0%" y2="${position === "bottom" ? "100%" : "0%"}">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0)" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.75)" />
        </linearGradient>
      </defs>
      <rect x="0" y="${yPos}" width="${w}" height="${gradientHeight}" fill="url(#grad)" />
      <text
        x="${w / 2}"
        y="${position === "bottom" ? h - 60 : 80}"
        text-anchor="middle"
        font-family="'Noto Sans Thai', 'Loma', 'Garuda', 'Sarabun', sans-serif"
        font-size="${Math.floor(w * 0.055)}px"
        font-weight="bold"
        fill="white"
      >${escapeXml(menuName)}</text>
      ${
        price
          ? `<text
        x="${w / 2}"
        y="${position === "bottom" ? h - 20 : 120}"
        text-anchor="middle"
        font-family="'Noto Sans Thai', 'Loma', 'Garuda', 'Sarabun', sans-serif"
        font-size="${Math.floor(w * 0.035)}px"
        fill="#FFD700"
      >${escapeXml(price)} บาท</text>`
          : ""
      }
    </svg>`;

  return img
    .composite([{ input: Buffer.from(svgText), blend: "over" }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

// ----------------------------------------------------------------
// resizeForPlatform — resize ตาม platform
// ----------------------------------------------------------------
export async function resizeForPlatform(
  imageBuffer: Buffer,
  platform: "tiktok" | "instagram" | "youtube" | "facebook"
): Promise<Buffer> {
  const sizes = {
    tiktok: { width: 1080, height: 1920 },      // 9:16
    instagram: { width: 1080, height: 1080 },    // 1:1
    youtube: { width: 1280, height: 720 },       // 16:9
    facebook: { width: 1200, height: 630 },      // 1.91:1
  };

  const { width, height } = sizes[platform];

  return sharp(imageBuffer)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// ----------------------------------------------------------------
// processUploadedImage — full pipeline สำหรับรูปที่อัปโหลดมา
// ----------------------------------------------------------------
export async function processUploadedImage(
  imageBuffer: Buffer,
  options: {
    menuName: string;
    price?: string;
    removeBg?: boolean;
    addOverlay?: boolean;
  }
): Promise<Buffer> {
  let processed = imageBuffer;

  // 1. ลบ background (optional)
  if (options.removeBg) {
    try {
      processed = await removeBackground(processed);
    } catch (err) {
      console.warn("rembg failed, skipping:", err);
    }
  }

  // 2. ใส่ text overlay (optional)
  if (options.addOverlay) {
    processed = await addTextOverlay(processed, {
      menuName: options.menuName,
      price: options.price,
    });
  }

  // 3. Normalize เป็นแนวตั้ง 9:16 (1080x1920) + เพิ่มคุณภาพอาหาร
  // - Sharpen: ทำให้เนื้อสัตว์/ซอสชัดขึ้น
  // - Saturation +20%: สีอาหารสดใส น่ากินกว่า
  // - Contrast เล็กน้อย: ทำให้มิติ
  processed = await sharp(processed)
    .resize(1080, 1920, { fit: "cover", position: "centre" })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.5 })
    .modulate({ saturation: 1.2, brightness: 1.02 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  return processed;
}
