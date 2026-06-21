import { NextRequest, NextResponse } from "next/server";
import { generateDailyPlan, notifyPlanViaTelegram } from "@/lib/marketing";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = await generateDailyPlan(body.date);
    // Notify via Telegram (non-blocking — UI doesn't need to wait)
    notifyPlanViaTelegram(plan).catch((e) =>
      console.warn("[marketing/plan] telegram notify failed:", e.message)
    );
    return NextResponse.json(plan);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
