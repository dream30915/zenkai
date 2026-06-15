/**
 * GET /api/status — lightweight live system status for the dashboard widget:
 * Phaya credit (THB) + BullMQ queue depth. Reuses the system_status skill.
 */
import { NextResponse } from "next/server";
import { runTool } from "@/lib/tools";

export const runtime = "nodejs";

export async function GET() {
  try {
    const raw = await runTool("system_status", {});
    const data = JSON.parse(raw);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "status error" }, { status: 500 });
  }
}
