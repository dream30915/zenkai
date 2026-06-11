/**
 * Phaya.io API Client
 * Thai AI Platform — Image-to-Video, Text-to-Image, TTS, Sora 2, Veo 3.1
 * https://phaya.io/docs
 */

import axios from "axios";

const BASE_URL = "https://api.phaya.io/api/v1";
const PHAYA_KEY = () => process.env.PHAYA_API_KEY!;

const api = () =>
  axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${PHAYA_KEY()}`,
      "Content-Type": "application/json",
    },
    timeout: 60000,
  });

// ----------------------------------------------------------------
// Poll helper
// ----------------------------------------------------------------
async function pollStatus(
  endpoint: string,
  jobId: string,
  maxAttempts = 120,
  intervalMs = 5000
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await api().get(`${endpoint}/${jobId}`);
    const { status, video_url, image_url, audio_url } = res.data;
    if (status === "completed") {
      return video_url || image_url || audio_url || "";
    }
    if (status === "failed") throw new Error(`Phaya job failed: ${jobId}`);
  }
  throw new Error("Phaya: polling timeout");
}

// ----------------------------------------------------------------
// IMAGE-TO-VIDEO (most popular — FFmpeg + AI) — 1 credit
// ----------------------------------------------------------------
export async function phayaImageToVideo(params: {
  imageUrl: string;
  duration?: number; // seconds 5–30
  fps?: number;
  motionEffect?: "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "ken_burns";
}): Promise<string> {
  const { imageUrl, duration = 10, fps = 30, motionEffect = "ken_burns" } = params;
  const res = await api().post("/image-to-video/create", {
    image_url: imageUrl,
    duration,
    fps,
    motion_effect: motionEffect,
  });
  return pollStatus("/image-to-video/status", res.data.job_id);
}

// ----------------------------------------------------------------
// SORA 2 VIDEO (image-to-video, AI quality) — 8 credits
// ----------------------------------------------------------------
export async function phayaSora2Video(params: {
  imageUrls: string[];
  prompt: string;
  aspectRatio?: "portrait" | "landscape" | "square";
  nFrames?: "10" | "15";
}): Promise<string> {
  const { imageUrls, prompt, aspectRatio = "portrait", nFrames = "10" } = params;
  const res = await api().post("/sora2-video/create", {
    image_urls: imageUrls,
    prompt,
    aspect_ratio: aspectRatio,
    n_frames: nFrames,
    remove_watermark: true,
  });
  return pollStatus("/sora2-video/status", res.data.job_id);
}

// ----------------------------------------------------------------
// TEXT-TO-IMAGE (food photo generation) — 1 credit
// ----------------------------------------------------------------
export async function phayaTextToImage(params: {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
}): Promise<string> {
  const { prompt, width = 1024, height = 1024 } = params;
  const res = await api().post("/text-to-image/create", {
    prompt,
    width,
    height,
  });
  return pollStatus("/text-to-image/status", res.data.job_id, 60, 3000);
}

// ----------------------------------------------------------------
// TEXT-TO-SPEECH Thai — replaces ElevenLabs — per-char pricing
// ----------------------------------------------------------------
export async function phayaTTS(params: {
  text: string;
  voice?: string; // Thai voice ID
  speed?: number;
}): Promise<string> {
  const { text, voice, speed = 1.0 } = params;
  const body: Record<string, unknown> = { text, speed };
  if (voice) body.voice_id = voice;

  const res = await api().post("/text-to-speech/create", body);
  return pollStatus("/text-to-speech/status", res.data.job_id, 30, 2000);
}

// ----------------------------------------------------------------
// SEEDANCE 2 FAST (quick video for daily posts) — budget option
// ----------------------------------------------------------------
export async function phayaSeedanceVideo(params: {
  imageUrl: string;
  prompt: string;
}): Promise<string> {
  const res = await api().post("/seedance2-fast/create", {
    image_url: params.imageUrl,
    prompt: params.prompt,
    aspect_ratio: "portrait",
  });
  return pollStatus("/seedance2-fast/status", res.data.job_id);
}

// ----------------------------------------------------------------
// generateFoodVideoPhaya — main entry point
// tier: "fast" | "quality" | "premium"
// ----------------------------------------------------------------
export async function generateFoodVideoPhaya(params: {
  imageUrl: string;
  menuName: string;
  menuNameEn?: string;
  tier: "fast" | "quality" | "premium";
}): Promise<string> {
  const { imageUrl, menuName, menuNameEn, tier } = params;

  const prompt = `Delicious ${menuName}${menuNameEn ? ` (${menuNameEn})` : ""}, Japanese restaurant food photography, steam rising, appetizing close-up, cinematic`;

  if (tier === "fast") {
    // Image-to-Video FFmpeg — cheapest, fastest
    return phayaImageToVideo({ imageUrl, duration: 10, motionEffect: "ken_burns" });
  }
  if (tier === "quality") {
    // Sora 2 — AI quality
    return phayaSora2Video({ imageUrls: [imageUrl], prompt, aspectRatio: "portrait" });
  }
  // premium — Sora 2 longer + high quality
  return phayaSora2Video({ imageUrls: [imageUrl], prompt, aspectRatio: "portrait", nFrames: "15" });
}
