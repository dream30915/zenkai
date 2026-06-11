/**
 * Image Processing Pipeline
 * 1. fal.ai (Flux Pro) — text-to-image / image enhancement
 * 2. rembg — background removal (self-hosted Docker)
 * 3. Sharp — resize, overlay text, format conversion
 */

import * as fal from "@fal-ai/client";
import axios from "axios";
import sharp from "sharp";

// ----------------------------------------------------------------
// Config
// ----------------------------------------------------------------
fal.config({ credentials: process.env.FAL_KEY });

const REMBG_URL = process.env.REMBG_URL || "http://localhost:7000";

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
// generateFoodImage — สร้างรูปอาหารด้วย fal.ai Flux Pro
// ----------------------------------------------------------------
export async function generateFoodImage(
  menuName: string,
  style: "photo" | "artistic" = "photo"
): Promise<GeneratedImage> {
  const prompt =
    style === "photo"
      ? `Professional food photography of ${menuName}, Japanese restaurant, top-down view, high quality, appetizing, natural lighting, on elegant plate`
      : `Artistic illustration of ${menuName}, Japanese food art style, vibrant colors, menu design`;

  const result = await fal.run("fal-ai/flux-pro", {
    input: {
      prompt,
      image_size: "landscape_4_3",
      num_images: 1,
      output_format: "jpeg",
      guidance_scale: 3.5,
      num_inference_steps: 28,
    },
  });

  const image = (result as any).images?.[0];
  if (!image) throw new Error("fal.ai: no image returned");

  return {
    url: image.url,
    width: image.width,
    height: image.height,
  };
}

// ----------------------------------------------------------------
// removeBackground — ลบพื้นหลังรูปด้วย rembg (self-hosted)
// ----------------------------------------------------------------
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: "image/jpeg" });
  formData.append("file", blob, "image.jpg");

  const res = await axios.post(`${REMBG_URL}/api/remove`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "arraybuffer",
    timeout: 30000,
  });

  return Buffer.from(res.data);
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
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.floor(w * 0.055)}px"
        font-weight="bold"
        fill="white"
      >${menuName}</text>
      ${
        price
          ? `<text
        x="${w / 2}"
        y="${position === "bottom" ? h - 20 : 120}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.floor(w * 0.035)}px"
        fill="#FFD700"
      >${price} บาท</text>`
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

  // 3. Normalize size
  processed = await sharp(processed)
    .resize(1080, 1080, { fit: "cover" })
    .jpeg({ quality: 88 })
    .toBuffer();

  return processed;
}
