import { NextRequest, NextResponse } from "next/server";
import { publishViaWebhook, type ContentPlan } from "@/lib/marketing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const plan: ContentPlan = await req.json();
    if (!plan.platform || !plan.caption) {
      return NextResponse.json({ error: "platform and caption required" }, { status: 400 });
    }
    const delivered = await publishViaWebhook(plan);
    return NextResponse.json({ delivered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
