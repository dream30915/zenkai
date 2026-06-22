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
 * ป้องกันด้วย middleware เดียวกับ /api/marketing/* (ต้องล็อกอิน).
 */
import { NextRequest, NextResponse } from "next/server";
import { publishMany, type PublishPost } from "@/lib/publish";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as
      | PublishPost
      | { posts: PublishPost[] };

    const posts: PublishPost[] = Array.isArray((body as { posts?: PublishPost[] }).posts)
      ? (body as { posts: PublishPost[] }).posts
      : [body as PublishPost];

    if (!posts.length || !posts[0]?.caption) {
      return NextResponse.json({ error: "caption required" }, { status: 400 });
    }

    const results = await publishMany(posts);
    const okCount = results.filter((r) => r.ok).length;
    const skipped = results.some((r) => r.skipped);

    return NextResponse.json({
      ok: okCount > 0,
      okCount,
      total: posts.length,
      skipped,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "publish error" },
      { status: 500 },
    );
  }
}
