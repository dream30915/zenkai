/**
 * Text-to-Speech — ElevenLabs (Thai + English)
 */

import axios from "axios";

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

// ----------------------------------------------------------------
// generateVoiceover — แปลง script เป็นเสียงพากย์
// ----------------------------------------------------------------
export async function generateVoiceover(
  text: string,
  lang: "th" | "en" = "th"
): Promise<Buffer> {
  const voiceId =
    lang === "th"
      ? (process.env.ELEVENLABS_VOICE_ID_TH || "21m00Tcm4TlvDq8ikWAM")
      : "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)

  const res = await axios.post(
    `${ELEVENLABS_API}/text-to-speech/${voiceId}`,
    {
      text: text.substring(0, 500), // max 500 chars
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "arraybuffer",
      timeout: 30000,
    }
  );

  return Buffer.from(res.data);
}

// ----------------------------------------------------------------
// extractHook — ดึง HOOK จาก script ที่ AI เขียน
// ----------------------------------------------------------------
export function extractHookFromScript(script: string): string {
  const lines = script.split("\n");
  const hookIdx = lines.findIndex((l) => l.includes("HOOK"));
  if (hookIdx >= 0 && lines[hookIdx + 1]) {
    return lines[hookIdx + 1].replace(/^\[|\]$/g, "").trim();
  }
  // fallback: ใช้ 2 บรรทัดแรก
  return lines.slice(0, 2).join(" ").trim().substring(0, 150);
}

// ----------------------------------------------------------------
// generateVoiceoverPhaya — ใช้ phaya.io TTS ภาษาไทย
// ----------------------------------------------------------------
import { phayaTTS } from "@/lib/phaya";
import https from "https";

export async function generateVoiceoverPhaya(text: string): Promise<Buffer> {
  if (!process.env.PHAYA_API_KEY) {
    return generateVoiceover(text, "th");
  }
  try {
    const audioUrl = await phayaTTS({ text: text.substring(0, 500) });
    // Download audio to buffer
    return new Promise((resolve, reject) => {
      https.get(audioUrl, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      });
    });
  } catch {
    return generateVoiceover(text, "th");
  }
}
