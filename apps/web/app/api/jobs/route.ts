import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const requestedOffset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20;
    const offset = Number.isFinite(requestedOffset)
      ? Math.max(requestedOffset, 0)
      : 0;

    const { data, error, count } = await supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ jobs: data, total: count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
