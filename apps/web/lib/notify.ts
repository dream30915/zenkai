/**
 * Notification System
 * Telegram (owner alerts) + LINE OA (customer broadcast)
 */

import axios from "axios";

// ----------------------------------------------------------------
// Telegram — แจ้งเจ้าของร้านผ่าน Bot
// ----------------------------------------------------------------
export async function sendTelegramAlert(
  message: string,
  options?: {
    imageUrl?: string;
    parseMode?: "HTML" | "Markdown";
    keyboard?: { text: string; url?: string }[][];
  }
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[notify] Telegram not configured");
    return;
  }

  const base = `https://api.telegram.org/bot${token}`;
  const { imageUrl, parseMode = "HTML", keyboard } = options || {};

  const replyMarkup = keyboard
    ? {
        inline_keyboard: keyboard.map((row) =>
          row.map((btn) => ({
            text: btn.text,
            ...(btn.url ? { url: btn.url } : {}),
          }))
        ),
      }
    : undefined;

  try {
    if (imageUrl) {
      await axios.post(`${base}/sendPhoto`, {
        chat_id: chatId,
        photo: imageUrl,
        caption: message,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      });
    } else {
      await axios.post(`${base}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      });
    }
  } catch (err) {
    console.error("[notify] Telegram error:", err);
  }
}

// ----------------------------------------------------------------
// notifyJobDone — แจ้งเมื่อวิดีโอพร้อม
// ----------------------------------------------------------------
export async function notifyJobDone(params: {
  jobId: string;
  menuName: string;
  videoUrl: string;
  thumbnailUrl?: string;
  postedTo: string[];
}): Promise<void> {
  const { jobId, menuName, videoUrl, thumbnailUrl, postedTo } = params;

  const platforms = postedTo.join(", ");
  const message = `
✅ <b>วิดีโอพร้อมแล้ว!</b>

🍱 เมนู: <b>${menuName}</b>
🎬 <a href="${videoUrl}">ดาวน์โหลดวิดีโอ</a>
📱 โพสต์ไปยัง: ${platforms}
🆔 Job: <code>${jobId}</code>
  `.trim();

  await sendTelegramAlert(message, {
    imageUrl: thumbnailUrl,
    keyboard: [[{ text: "▶️ ดูวิดีโอ", url: videoUrl }]],
  });
}

// ----------------------------------------------------------------
// notifyJobError — แจ้งเมื่อเกิด error
// ----------------------------------------------------------------
export async function notifyJobError(params: {
  jobId: string;
  menuName: string;
  error: string;
}): Promise<void> {
  const { jobId, menuName, error } = params;

  await sendTelegramAlert(`
❌ <b>เกิดข้อผิดพลาด</b>

🍱 เมนู: <b>${menuName}</b>
🆔 Job: <code>${jobId}</code>
⚠️ Error: <code>${error.substring(0, 200)}</code>

กรุณาตรวจสอบใน Dashboard
  `.trim());
}

// ----------------------------------------------------------------
// notifyNewJob — แจ้งเมื่อมีงานใหม่เข้า queue
// ----------------------------------------------------------------
export async function notifyNewJob(params: {
  jobId: string;
  menuName: string;
  tier: string;
  postTo: string[];
}): Promise<void> {
  const { jobId, menuName, tier, postTo } = params;
  const tierLabel = { tier1: "⚡ Template", tier2: "✨ AI Video", tier3: "🎬 Cinematic" }[tier] || tier;

  await sendTelegramAlert(`
📥 <b>งานใหม่เข้า Queue</b>

🍱 เมนู: <b>${menuName}</b>
🎬 คุณภาพ: ${tierLabel}
📱 Platform: ${postTo.join(", ")}
🆔 Job: <code>${jobId}</code>
  `.trim());
}
