/**
 * POST /api/marketing/plan — generate today's marketing content plan.
 * Body (optional): { count?: number, channels?: string[], date?: string }
 * Returns the structured MarketingPlan. Does NOT send anything anywhere.
 */
import { NextRequest, NextResponse } from "next/server";
import { buildDailyPlan } from "@/lib/marketing";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "marketing plan error" },
      { status: 500 },
    );
  }
}
