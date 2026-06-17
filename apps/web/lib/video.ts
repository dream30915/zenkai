/**
 * Video Generation — provider เดียวเป็นหลัก (MVP discipline)
 *
 * Primary : Phaya.io (Thai platform — FFmpeg image-to-video ถูกสุด, Sora 2 สำหรับ tier สูง)
 * Fallback: Creatomate (เฉพาะเมื่อตั้ง CREATOMATE_API_KEY ไว้)
 *
 * เปลี่ยนจากเดิม:
 * - ถอด Kling AI / Runway ออกจาก pipeline (โค้ดเดิมอยู่ใน git history)
 *   เหตุผล: integration sprawl — 4 provider ที่ยังไม่ validate สักตัว + ค่า API key ซ้ำซ้อน
 * - แก้ bug fallback: เดิมถ้า tier1 (Creatomate) fail จะ catch แล้วเรียก Creatomate ซ้ำอีกรอบ
 * - เปลี่ยน param `script` → `hookText` (รับข้อความ hook ที่ parse แล้ว ไม่ใช่ script ดิบ)
 */

import axios from "axios";
import { generateFoodVideoPhaya } from "./phaya";
import { generateLocalVideo } from "./localvideo";

export type VideoTier = "tier1" | "tier2" | "tier3";

export interface VideoResult {
  url: string;
  duration: number;
  tier: VideoTier;
  provider: "phaya" | "creatomate" | "local";
}

// ----------------------------------------------------------------
// generateVideo — entry point เดียว
// ----------------------------------------------------------------
export async function generateVideo(params: {
  imageUrl: string;
  menuName: string;
  menuNameEn?: string;
  price?: string;
  hookText?: string;
  tier: VideoTier;
}): Promise<VideoResult> {
  const { imageUrl, menuName, menuNameEn, price, hookText, tier } = params;

  const forceLocal = process.env.VIDEO_PROVIDER === "local";
  const hasPhaya = !forceLocal && !!process.env.PHAYA_API_KEY;
  const hasCreatomate = !forceLocal && !!process.env.CREATOMATE_API_KEY;
  const dur = tier === "tier1" ? 10 : 15;

  // 0) Local FFmpeg — primary เมื่อ VIDEO_PROVIDER=local (ฟรี เหมาะใช้ส่วนตัว)
  if (forceLocal) {
    const url = await generateLocalVideo({ imageUrl, durationSec: dur });
    return { url, duration: dur, tier, provider: "local" };
  }

  // 1) Phaya — primary
  if (hasPhaya) {
    try {
      const phayaTier = tier === "tier1" ? "fast" : tier === "tier2" ? "quality" : "premium";
      const url = await generateFoodVideoPhaya({ imageUrl, menuName, menuNameEn, tier: phayaTier });
      return { url, duration: dur, tier, provider: "phaya" };
    } catch (err) {
      console.error("[video] Phaya failed:", err);
      // ตกไปใช้ fallback ด้านล่าง (Creatomate ถ้ามี key, ไม่งั้น local ffmpeg)
    }
  }

  // 2) Creatomate — fallback (ถ้ามี key)
  if (hasCreatomate) {
    try {
      return await generateCreatomateVideo({ imageUrl, menuName, menuNameEn, price, hookText });
    } catch (err) {
      console.error("[video] Creatomate failed:", err);
    }
  }

  // 3) Local FFmpeg — fallback สุดท้าย (ฟรี ไม่ต้องมี provider/credit ใด ๆ)
  console.warn("[video] ใช้ local ffmpeg fallback (ไม่มี provider พร้อมใช้ / เครดิตหมด)");
  const url = await generateLocalVideo({ imageUrl, durationSec: dur });
  return { url, duration: dur, tier, provider: "local" };
}

// backward-compat alias (โค้ดเดิมบางจุดเรียก generateVideoAuto)
export const generateVideoAuto = generateVideo;

// ----------------------------------------------------------------
// Creatomate — template-based fallback
// ----------------------------------------------------------------
const CREATOMATE_API = "https://api.creatomate.com/v1";

export async function generateCreatomateVideo(params: {
  imageUrl: string;
  menuName: string;
  menuNameEn?: string;
  price?: string;
  hookText?: string;
  templateId?: string;
}): Promise<VideoResult> {
  const { imageUrl, menuName, menuNameEn, price, hookText } = params;

  const templateId = params.templateId || process.env.CREATOMATE_TEMPLATE_ID;

  const modifications: Record<string, string> = {
    "food-image": imageUrl,
    "menu-name-th": menuName,
    "menu-name-en": menuNameEn || "",
    "price-text": price ? `${price} บาท` : "",
    "caption-text": hookText || menuName,
  };

  const body = templateId
    ? { template_id: templateId, modifications }
    : {
        // Fallback: render แบบ simple ถ้าไม่มี template
        source: {
          output_format: "mp4",
          width: 1080,
          height: 1920,
          duration: 15,
          elements: [
            {
              type: "image",
              source: imageUrl,
              x: "50%",
              y: "50%",
              width: "100%",
              height: "100%",
              fit: "cover",
            },
            {
              type: "text",
              text: hookText || menuName,
              y: "75%",
              width: "90%",
              x: "50%",
              font_size: 64,
              font_weight: "700",
              color: "#FFFFFF",
              shadow_color: "rgba(0,0,0,0.8)",
              shadow_blur: 20,
            },
            {
              type: "text",
              text: price ? `฿${price}` : "",
              y: "85%",
              width: "90%",
              x: "50%",
              font_size: 48,
              color: "#FFD700",
            },
          ],
        },
      };

  const res = await axios.post(`${CREATOMATE_API}/renders`, body, {
    headers: {
      Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 60000,
  });

  const renders = Array.isArray(res.data) ? res.data : [res.data];
  const render = renders[0];

  const videoUrl = await pollCreatomate(render.id);

  return { url: videoUrl, duration: 15, tier: "tier1", provider: "creatomate" };
}

async function pollCreatomate(renderId: string, maxAttempts = 60): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await axios.get(`${CREATOMATE_API}/renders/${renderId}`, {
      headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` },
    });

    const { status, url } = res.data;
    if (status === "succeeded" && url) return url;
    if (status === "failed") throw new Error(`Creatomate render failed: ${res.data.error_message}`);
  }
  throw new Error("Creatomate: render timeout");
}
