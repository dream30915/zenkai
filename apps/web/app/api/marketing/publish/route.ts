/**
 * POST /api/marketing/publish — ส่งโพสต์ที่อนุมัติแล้วไป Make.com → IG/FB/TikTok.
 *
 * Body (โพสต์เดียว):
 *   { platforms: string[], caption: string, hashtags?: string[],
 *     mediaUrl?: string, mediaType?: "video"|"image",
 *     menu?: string, format?: string, scheduledTime?: string }
 * Body (หลายโพสต์):
 *   { posts: PublishPost[] }
 *
 * โหมดปลอดภัยเป็น default — ยิงจริงต้องครบ 3 เงื่อนไขพร้อมกัน:
 *   1) env  MARKETING_PUBLISH_ENABLED === "true"
 *   2) body dry_run === false
 *   3) body confirm_publish === true
 * ขาดข้อใดข้อหนึ่ง = โหมดจำลอง (mode:"dry_run", ไม่ยิง Make).
 *
 * ป้องกันด้วย middleware เดียวกับ /api/marketing/* (ต้องล็อกอิน).
 */
import { NextRequest, NextResponse } from "next/server";
import { publishMany, type PublishPost } from "@/lib/publish";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PublishBody {
  posts?: PublishPost[];
  /** ต้องส่ง false ชัดเจนจึงจะออกจากโหมดจำลอง (default = true) */
  dry_run?: boolean;
  /** ต้องเป็น true พร้อม dry_run:false จึงจะยิงจริง */
  confirm_publish?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PublishBody & PublishPost;

    const posts: PublishPost[] = Array.isArray(body.posts)
      ? body.posts
      : [body as PublishPost];

    if (!posts.length || !posts[0]?.caption) {
      return NextResponse.json({ error: "caption required" }, { status: 400 });
    }

    // ── Gate การยิงจริง: ต้องครบ 3 เงื่อนไขพร้อมกัน ──
    const envEnabled = process.env.MARKETING_PUBLISH_ENABLED === "true";
    const dryRunRequested = body.dry_run !== false; // ขาด/ไม่ใช่ false → จำลอง
    const confirmed = body.confirm_publish === true;
    const live = envEnabled && !dryRunRequested && confirmed;

    const results = await publishMany(posts, { dryRun: !live });
    const okCount = results.filter((r) => r.ok).length;
    const skipped = results.some((r) => r.skipped);

    return NextResponse.json({
      ok: okCount > 0,
      mode: live ? "live" : "dry_run",
      okCount,
      total: posts.length,
      skipped,
      gate: { envEnabled, dryRunRequested, confirmed },
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "publish error" },
      { status: 500 },
    );
  }
}
