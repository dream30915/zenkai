/**
 * /api/captions — human-facing view of the caption library the AI team saves
 * via the save_caption tool (lib/tools.ts). Same Redis list key `zenkai:captions`.
 * Guarded by the session middleware like the rest of the dashboard API.
 *
 *   GET    → { count, captions: [{ menu_name, caption, platform, ts }] }
 *   DELETE → remove one entry by its exact `ts` (?ts=ISO) or clear all (?all=1)
 */
import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const CAPTIONS_KEY = "zenkai:captions";

let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis)
    _redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: 2 });
  return _redis;
}

interface Caption { menu_name: string; caption: string; platform: string | null; ts: string; }

export async function GET(req: NextRequest) {
  const menu = req.nextUrl.searchParams.get("menu_name");
  try {
    const rows = await redis().lrange(CAPTIONS_KEY, 0, 199);
    let items = rows
      .map((r) => { try { return JSON.parse(r) as Caption; } catch { return null; } })
      .filter((x): x is Caption => !!x);
    if (menu) items = items.filter((i) => i.menu_name === menu);
    return NextResponse.json({ count: items.length, captions: items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "read failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ts = req.nextUrl.searchParams.get("ts");
  const all = req.nextUrl.searchParams.get("all");
  try {
    if (all === "1") {
      await redis().del(CAPTIONS_KEY);
      return NextResponse.json({ ok: true, cleared: true });
    }
    if (!ts) return NextResponse.json({ error: "ts required" }, { status: 400 });
    // Find the exact stored string for this ts and LREM it.
    const rows = await redis().lrange(CAPTIONS_KEY, 0, 199);
    const target = rows.find((r) => {
      try { return (JSON.parse(r) as Caption).ts === ts; } catch { return false; }
    });
    if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
    const removed = await redis().lrem(CAPTIONS_KEY, 1, target);
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "delete failed" }, { status: 500 });
  }
}
