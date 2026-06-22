import { NextRequest, NextResponse } from "next/server";
import { sendTelegramAlert } from "@/lib/notify";

export const runtime = "nodejs";

/**
 * POST /api/telegram/send — ส่งข้อความ/รูป เข้า Telegram เจ้าของร้าน
 * Body: { text: string, imageUrl?: string, label?: string }
 * ใช้กับปุ่ม "ส่งเข้า Telegram" ทั่วทั้งเว็บ (เว็บ → บอท)
 */
export async function POST(req: NextRequest) {
  try {
    const { text, imageUrl, label } = (await req.json()) as {
      text?: string;
      imageUrl?: string;
      label?: string;
    };
    if (!text || !text.trim()) {
      return NextResponse.json({ message: "ต้องมีข้อความ" }, { status: 400 });
    }
    const header = label ? `<b>${label}</b>\n\n` : "";
    await sendTelegramAlert(header + text.slice(0, 3500), {
      parseMode: "HTML",
      imageUrl: imageUrl || undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
