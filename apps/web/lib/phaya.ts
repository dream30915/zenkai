/**
 * Phaya.io — Video Generation (All Tiers)
 * Tier 1: Seedance Pro  — 6 credits  (~24 บาท) — เหมือนถ่ายจริง
 * Tier 2: Veo 3.1 Fast  — 15 credits (~60 บาท) — Google AI
 * Tier 3: Veo 3.1 Quality — 50 credits (~200 บาท) — Premium สุด
 */

import axios from "axios";
import OpenAI from "openai";

const BASE = "https://api.phaya.io/api/v1";
const api = () => axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${process.env.PHAYA_API_KEY}`, "Content-Type": "application/json" },
  timeout: 120000,
});

// ─── Poll helper ────────────────────────────────────────────
async function poll(endpoint: string, jobId: string, max = 120, ms = 5000): Promise<string> {
  for (let i = 0; i < max; i++) {
    await new Promise(r => setTimeout(r, ms));
    const { data } = await api().get(`${endpoint}/${jobId}`);
    const s = data.status;
    if (s === "completed" || s === "success")
      return data.video_url || data.image_url || data.audio_url || "";
    if (s === "failed" || s === "error")
      throw new Error(`Phaya job failed: ${data.error || "unknown"}`);
  }
  throw new Error("Phaya job timed out");
}

// ─── GPT-4o: Cinematic food video prompt ─────────────────────
async function buildPrompt(menuName: string, menuNameEn?: string, description?: string): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const dish = menuNameEn || menuName;
    const { choices } = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 150, temperature: 0.7,
      messages: [{
        role: "system",
        content: "You are a luxury Japanese restaurant food video director. Write a 40-70 word cinematic video prompt for AI video generation. Describe motion (chopsticks lifting, steam rising, sauce dripping), camera move (slow push-in, macro), lighting (shallow DOF, warm bokeh, golden rim). English only. Output prompt only, no extra text.",
      }, {
        role: "user",
        content: `Dish: ${dish}${description ? `\nDetails: ${description}` : ""}`,
      }],
    });
    return choices[0].message.content?.trim() ||
      `${dish}, Japanese restaurant cinematic close-up, chopsticks lifting gently, steam rising, shallow depth of field, warm golden bokeh, slow push-in`;
  } catch {
    return `${menuName}${menuNameEn ? ` ${menuNameEn}` : ""}, Japanese restaurant, cinematic food photography, steam rising, appetizing close-up, shallow DOF, warm lighting`;
  }
}

// ─── Tier 1: Seedance Pro (6 credits / 8s) ──────────────────
async function seedancePro(imageUrl: string, prompt: string): Promise<string> {
  const { data } = await api().post("/seedance-video/create", {
    image_url: imageUrl, prompt, duration: "8",
  });
  return poll("/seedance-video/status", data.job_id, 80, 5000);
}

// ─── Tier 2: Veo 3.1 Fast (15 credits) ──────────────────────
async function veo31Fast(imageUrl: string, prompt: string): Promise<string> {
  const { data } = await api().post("/veo31-video/create", {
    image_url: imageUrl,
    prompt: prompt + ", 9:16 vertical",
  });
  return poll("/veo31-video/status", data.job_id, 100, 6000);
}

// ─── Tier 3: Veo 3.1 Quality (50 credits) ───────────────────
async function veo31Quality(imageUrl: string, prompt: string): Promise<string> {
  const { data } = await api().post("/veo31-video/create", {
    image_url: imageUrl,
    prompt: prompt + ", 9:16 vertical, ultra cinematic, Michelin star, award-winning food photography",
    quality: "quality",
  });
  return poll("/veo31-video/status", data.job_id, 120, 6000);
}

// ─── Image-to-Video FFmpeg (emergency fallback) ──────────────
async function ffmpegFallback(imageUrl: string): Promise<string> {
  const modes = ["center","pan_right","pan_up","top_left"] as const;
  const mode = modes[Math.floor(Date.now() / 10000) % modes.length];
  const { data } = await api().post("/image-to-video/create", {
    image_url: imageUrl, duration: 8, image_format: "jpeg",
    zoom: { mode, speed: 0.002, max_scale: 1.8, pan_speed: 1.0 },
  });
  return poll("/image-to-video/status", data.job_id, 40, 2000);
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────
export async function generateFoodVideoPhaya(params: {
  imageUrl: string;
  menuName: string;
  menuNameEn?: string;
  description?: string;
  category?: string;
  tier: "fast" | "quality" | "premium";
}): Promise<string> {
  const { imageUrl, menuName, menuNameEn, description, tier } = params;

  // GPT-4o สร้าง prompt ระดับมืออาชีพ
  const prompt = await buildPrompt(menuName, menuNameEn, description);
  console.log(`[phaya] tier=${tier} prompt="${prompt.substring(0, 80)}..."`);

  try {
    if (tier === "fast")    return await seedancePro(imageUrl, prompt);
    if (tier === "quality") return await veo31Fast(imageUrl, prompt);
    /* premium */           return await veo31Quality(imageUrl, prompt);
  } catch (err) {
    // Fallback: ถ้า Phaya credits หมดหรือ error ใช้ FFmpeg
    console.warn("[phaya] AI video failed, using FFmpeg fallback:", err instanceof Error ? err.message : err);
    return ffmpegFallback(imageUrl);
  }
}

// ─── TTS ─────────────────────────────────────────────────────
export async function phayaTTS(text: string): Promise<string> {
  const { data } = await api().post("/text-to-speech/generate", { prompt: text });
  return poll("/text-to-speech/status", data.job_id);
}

// ─── Merge Audio + Video ──────────────────────────────────────
export async function phayaMergeAudioVideo(p: { videoUrl: string; audioUrl: string }): Promise<string> {
  const { data } = await api().post("/media/merge-audio-video", { video_url: p.videoUrl, audio_url: p.audioUrl });
  return poll("/media/status", data.job_id);
}
