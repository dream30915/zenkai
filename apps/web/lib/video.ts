/**
 * Video Generation Pipeline — 3 Tiers
 * Tier 1: Creatomate (template-based, fast, cheap)
 * Tier 2: Kling AI (AI video from image, best for food)
 * Tier 3: Runway ML Gen-3 (cinematic premium)
 */

import axios from "axios";

export type VideoTier = "tier1" | "tier2" | "tier3";

export interface VideoResult {
  url: string;
  duration: number;
  tier: VideoTier;
}

// ----------------------------------------------------------------
// TIER 1: Creatomate — Template-based video (~10 sec render)
// ----------------------------------------------------------------
const CREATOMATE_API = "https://api.creatomate.com/v1";

export async function generateCreatomateVideo(params: {
  imageUrl: string;
  menuName: string;
  menuNameEn?: string;
  price?: string;
  script: string;
  templateId?: string;
}): Promise<VideoResult> {
  const { imageUrl, menuName, menuNameEn, price, script } = params;

  // Template ID — ควรสร้าง template บน Creatomate ก่อน
  // ใช้ default food template ถ้าไม่มี
  const templateId = params.templateId || process.env.CREATOMATE_TEMPLATE_ID;

  const modifications: Record<string, string> = {
    "food-image": imageUrl,
    "menu-name-th": menuName,
    "menu-name-en": menuNameEn || "",
    "price-text": price ? `${price} บาท` : "",
    "caption-text": script.split("\n")[0] || menuName, // ใช้ HOOK จาก script
  };

  const body = templateId
    ? { template_id: templateId, modifications }
    : {
        // Fallback: สร้าง render แบบ simple ถ้าไม่มี template
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
              text: menuName,
              y: "80%",
              width: "90%",
              x: "50%",
              font_size: 72,
              font_weight: "700",
              color: "#FFFFFF",
              shadow_color: "rgba(0,0,0,0.8)",
              shadow_blur: 20,
            },
            {
              type: "text",
              text: price ? `฿${price}` : "",
              y: "88%",
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

  // Creatomate renders asynchronously — poll until done
  const videoUrl = await pollCreatomate(render.id);

  return { url: videoUrl, duration: 15, tier: "tier1" };
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

// ----------------------------------------------------------------
// TIER 2: Kling AI — AI Video from Image
// ----------------------------------------------------------------
export async function generateKlingVideo(params: {
  imageUrl: string;
  prompt: string;
  duration?: 5 | 10;
}): Promise<VideoResult> {
  const { imageUrl, prompt, duration = 5 } = params;

  // Kling AI API (image-to-video)
  const res = await axios.post(
    "https://api.klingai.com/v1/videos/image2video",
    {
      model_name: "kling-v1",
      image: imageUrl,
      prompt: `${prompt}, food video, appetizing, high quality, cinematic`,
      negative_prompt: "blur, low quality, distorted",
      cfg_scale: 0.5,
      mode: "std",
      duration: duration.toString(),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.KLING_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const taskId = res.data?.data?.task_id;
  if (!taskId) throw new Error("Kling AI: no task_id returned");

  const videoUrl = await pollKling(taskId);
  return { url: videoUrl, duration, tier: "tier2" };
}

async function pollKling(taskId: string, maxAttempts = 120): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const res = await axios.get(
      `https://api.klingai.com/v1/videos/image2video/${taskId}`,
      { headers: { Authorization: `Bearer ${process.env.KLING_API_KEY}` } }
    );

    const { task_status, task_result } = res.data?.data || {};
    if (task_status === "succeed") {
      const url = task_result?.videos?.[0]?.url;
      if (!url) throw new Error("Kling AI: no video URL in result");
      return url;
    }
    if (task_status === "failed") throw new Error(`Kling AI task failed`);
  }
  throw new Error("Kling AI: polling timeout");
}

// ----------------------------------------------------------------
// TIER 3: Runway ML Gen-3 — Cinematic Premium
// ----------------------------------------------------------------
export async function generateRunwayVideo(params: {
  imageUrl: string;
  prompt: string;
}): Promise<VideoResult> {
  const { imageUrl, prompt } = params;

  const res = await axios.post(
    "https://api.dev.runwayml.com/v1/image_to_video",
    {
      model: "gen3a_turbo",
      promptImage: imageUrl,
      promptText: `${prompt}, cinematic food video, professional photography, slow motion`,
      duration: 5,
      ratio: "768:1344", // 9:16 vertical
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        "X-Runway-Version": "2024-11-06",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const taskId = res.data?.id;
  if (!taskId) throw new Error("Runway: no task ID");

  const videoUrl = await pollRunway(taskId);
  return { url: videoUrl, duration: 5, tier: "tier3" };
}

async function pollRunway(taskId: string, maxAttempts = 120): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const res = await axios.get(
      `https://api.dev.runwayml.com/v1/tasks/${taskId}`,
      { headers: { Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`, "X-Runway-Version": "2024-11-06" } }
    );

    const { status, output, failure } = res.data;
    if (status === "SUCCEEDED") return output?.[0];
    if (status === "FAILED") throw new Error(`Runway failed: ${failure}`);
  }
  throw new Error("Runway: polling timeout");
}

// ----------------------------------------------------------------
// generateVideo — entry point พร้อม fallback
// Tier 1 → ถ้า fail → tier 1 ใหม่ (ไม่ fallback ขึ้น tier สูงกว่า)
// ----------------------------------------------------------------
export async function generateVideo(params: {
  imageUrl: string;
  menuName: string;
  menuNameEn?: string;
  price?: string;
  script: string;
  tier: VideoTier;
}): Promise<VideoResult> {
  const { imageUrl, menuName, menuNameEn, price, script, tier } = params;

  try {
    if (tier === "tier1") {
      return await generateCreatomateVideo({ imageUrl, menuName, menuNameEn, price, script });
    }
    if (tier === "tier2") {
      return await generateKlingVideo({
        imageUrl,
        prompt: `${menuName} ${menuNameEn || ""}, delicious Japanese food, steam rising`,
      });
    }
    if (tier === "tier3") {
      return await generateRunwayVideo({
        imageUrl,
        prompt: `${menuName}, premium Japanese cuisine, cinematic`,
      });
    }
    throw new Error(`Unknown video tier: ${tier}`);
  } catch (err) {
    console.error(`[video] Tier ${tier} failed, falling back to tier1:`, err);
    // Fallback to tier1 if higher tier fails
    return await generateCreatomateVideo({ imageUrl, menuName, menuNameEn, price, script });
  }
}
