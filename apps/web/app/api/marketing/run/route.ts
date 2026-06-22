/**
 * POST /api/marketing/run — autonomous run: generate the daily plan AND push it
 * to the owner's Telegram for one-tap approval/posting. Used by the dashboard
 * "ส่งแผนเข้า Telegram" button and by the daily cron (marketing-auto.sh).
 * Body (optional): { count?, channels?, date? }
 */
import { NextRequest, NextResponse } from "next/server";
import { buildDailyPlan, planToTelegram } from "@/lib/marketing";
import { sendTelegramAlert } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      count?: number;
      channels?: string[];
      date?: string;
    };
    const plan = await buildDailyPlan({
      count: body.count,
      channels: Array.isArray(body.channels) ? body.channels : undefined,
      date: body.date,
    });

    let delivered = false;
    try {
      await sendTelegramAlert(planToTelegram(plan), { parseMode: "HTML" });
      delivered = true;
    } catch {
      // ส่งไม่สำเร็จก็ยังคืนแผนให้ใช้ต่อได้
    }

    return NextResponse.json({ ok: true, delivered, plan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "marketing run error" },
      { status: 500 },
    );
  }
}
