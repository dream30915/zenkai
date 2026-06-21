import { NextResponse } from "next/server";
import { generateDailyPlan, notifyPlanViaTelegram } from "@/lib/marketing";

export const runtime = "nodejs";
export const maxDuration = 60;

// Used by marketing-auto.sh cron script (server-side trigger)
export async function POST() {
  try {
    const plan = await generateDailyPlan();
    await notifyPlanViaTelegram(plan);
    return NextResponse.json({
      ok: true,
      count: plan.plans.length,
      createdAt: plan.createdAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
