/**
 * POST /api/brief — generate the daily Zenkai brief and push it to Telegram.
 * The 🧭 manager checks live system status, pulls today's food trends (by
 * delegating to the trend agent), and proposes one content idea + a sample
 * caption. Authenticated like any dashboard route (cron logs in first).
 * Returns { ok, text } and also sends the brief via Telegram.
 */
import { NextResponse } from "next/server";
import { chatWithTools } from "@/lib/llm";
import { getAgent } from "@/lib/agents";
import { sendTelegramAlert } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PROMPT = `สร้าง "บรีฟประจำวัน" สั้นกระชับสำหรับเจ้าของร้าน อ่านง่ายบนมือถือ:
1) เช็คสถานะระบบสด (เครดิต Phaya เหลือเท่าไหร่, มีงานในคิว/งาน fail ไหม) แล้วสรุป 1-2 บรรทัด
2) มอบงานให้ "นักวิเคราะห์เทรนด์" (ask_teammate → trend) ดึงเทรนด์คอนเทนต์อาหารวันนี้ 1-2 ข้อ
3) เสนอไอเดียคอนเทนต์วันนี้ 1 อย่าง + แคปชั่นตัวอย่างสั้นๆ 1 แบบ
ตอบเป็นหัวข้อสั้นๆ ใส่ emoji พอดี ไม่ต้องยาว.`;

export async function POST() {
  try {
    const manager = getAgent("manager");
    if (!manager) return NextResponse.json({ error: "manager not found" }, { status: 500 });

    const { text, model } = await chatWithTools({
      messages: [{ role: "user", content: PROMPT }],
      system: manager.systemPrompt,
      tier: manager.tier,
      toolNames: manager.tools ?? [],
      temperature: 0.5,
      maxTokens: 1300,
    });

    const body = `🌅 <b>Zenkai — บรีฟประจำวัน</b>\n\n${esc(text || "(ไม่มีเนื้อหา)")}`;
    await sendTelegramAlert(body, { parseMode: "HTML" });

    return NextResponse.json({ ok: true, model, text });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "brief error" }, { status: 500 });
  }
}
