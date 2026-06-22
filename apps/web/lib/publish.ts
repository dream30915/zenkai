/**
 * lib/publish.ts — ส่งคอนเทนต์ที่ "อนุมัติแล้ว" ไปยัง Make.com webhook ซึ่งทำหน้าที่
 * โพสต์ต่อเข้า Instagram / Facebook / TikTok ให้เรา (เราจึงไม่ต้องมี developer app
 * หรือ OAuth token ของแต่ละแพลตฟอร์มเอง — Make ถือ integration ไว้แล้ว).
 *
 * ตั้งค่า env (ดู ~/restaurant/MAKE-SETUP.md):
 *   MAKE_WEBHOOK_URL    = URL ของ Custom Webhook ใน Make scenario
 *   MAKE_WEBHOOK_SECRET = สตริงลับ (ใส่ filter ใน Make ให้ตรวจ field "secret" ก่อนโพสต์)
 *
 * ⚠️ media ต้องเป็น "URL สาธารณะ" (เราใช้ Cloudflare R2 public: pub-...r2.dev)
 *    เพราะ Make จะดึงไฟล์จาก URL นี้ไปอัปโหลดเข้าแพลตฟอร์ม. ไฟล์ที่อยู่หลัง auth
 *    หรือ localhost จะโพสต์ไม่ได้.
 */
import axios from "axios";

export interface PublishPost {
  platforms: string[]; // ["instagram","facebook","tiktok","line"]
  caption: string; // แคปชั่นล้วน (ยังไม่รวมแฮชแท็ก)
  hashtags?: string[];
  mediaUrl?: string; // public URL (R2) — IG/TikTok บังคับต้องมี media
  mediaType?: "video" | "image";
  menu?: string;
  format?: string;
  scheduledTime?: string; // "HH:MM" — ส่งให้ Make ใช้ตั้งเวลาได้ (option)
}

export interface PublishResult {
  ok: boolean;
  skipped?: boolean;
  dryRun?: boolean;
  status?: number;
  error?: string;
}

export interface PublishOptions {
  /** true (default) = ไม่ยิง Make จริง, แค่จำลอง. ต้องส่ง false ชัดเจนเพื่อยิงจริง. */
  dryRun?: boolean;
}

const PLATFORM_ALIASES: Record<string, string> = {
  ig: "instagram",
  instagram: "instagram",
  fb: "facebook",
  facebook: "facebook",
  tt: "tiktok",
  tiktok: "tiktok",
  line: "line",
};

function normPlatforms(input: string[]): string[] {
  const out = new Set<string>();
  for (const p of input || []) {
    const k = PLATFORM_ALIASES[String(p).trim().toLowerCase()];
    if (k) out.add(k);
  }
  return [...out];
}

function inferMediaType(url?: string): "video" | "image" {
  return url && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ? "video" : "image";
}

/** ปิดบัง webhook URL ก่อน log — เผยแค่ host หัวกับ token 4 ตัวท้าย เช่น https://hook.../abcd */
function maskUrl(u?: string): string {
  if (!u) return "(none)";
  try {
    const { protocol, hostname, pathname } = new URL(u);
    const head = hostname.split(".")[0] || "host";
    const tail = pathname.replace(/\/+$/, "").slice(-4) || "????";
    return `${protocol}//${head}.../${tail}`;
  } catch {
    return "***";
  }
}

/** การยิงจริงต้องเปิด env gate นี้ก่อน (default = ปิด) */
function publishEnabled(): boolean {
  return process.env.MARKETING_PUBLISH_ENABLED === "true";
}

/**
 * ส่งโพสต์เดียวไป Make. ปลอดภัยโดย default:
 *   - dryRun ไม่ใช่ false  → จำลองอย่างเดียว ไม่ยิงจริง
 *   - MARKETING_PUBLISH_ENABLED != "true" → ไม่ยิงจริง แม้ dryRun=false
 * ยิงจริงเฉพาะเมื่อ env gate เปิด และผู้เรียกส่ง dryRun:false ชัดเจน.
 */
export async function publishPost(
  post: PublishPost,
  opts: PublishOptions = {},
): Promise<PublishResult> {
  const dryRun = opts.dryRun !== false; // default = true (ปลอดภัยไว้ก่อน)
  const enabled = publishEnabled();

  if (dryRun || !enabled) {
    const reason = dryRun ? "dry_run" : "MARKETING_PUBLISH_ENABLED!=true";
    console.warn(`[publish] โหมดจำลอง — ไม่ยิงจริง (${reason})`);
    return { ok: false, skipped: true, dryRun: true, error: reason };
  }

  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) {
    console.warn("[publish] MAKE_WEBHOOK_URL ยังไม่ตั้งค่า — ข้ามการโพสต์จริง");
    return { ok: false, skipped: true, error: "MAKE_WEBHOOK_URL not set" };
  }

  const platforms = normPlatforms(post.platforms);
  if (platforms.length === 0) {
    return { ok: false, error: "no valid platforms" };
  }

  const tags = (post.hashtags || []).map((h) =>
    String(h).startsWith("#") ? String(h) : `#${h}`,
  );
  const fullCaption = tags.length
    ? `${post.caption}\n\n${tags.join(" ")}`
    : post.caption;

  const payload = {
    secret: process.env.MAKE_WEBHOOK_SECRET || "",
    source: "zenkai-marketing",
    platforms,
    caption: fullCaption,
    rawCaption: post.caption,
    hashtags: tags,
    mediaUrl: post.mediaUrl || "",
    mediaType: post.mediaType || inferMediaType(post.mediaUrl),
    menu: post.menu || "",
    format: post.format || "",
    scheduledTime: post.scheduledTime || "",
  };

  try {
    console.log(`[publish] ยิงจริง → Make ${maskUrl(url)} (${platforms.join(",")})`);
    const res = await axios.post(url, payload, {
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });
    const ok = res.status >= 200 && res.status < 300;
    console.log(`[publish] Make ${maskUrl(url)} ตอบ status=${res.status} ok=${ok}`);
    return { ok, status: res.status };
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined;
    const error = e instanceof Error ? e.message : "publish error";
    console.error(`[publish] Make ${maskUrl(url)} error: status=${status ?? "?"} ${error}`);
    return { ok: false, status, error };
  }
}

/** ส่งหลายโพสต์เรียงทีละชิ้น (กัน rate limit ฝั่ง Make/แพลตฟอร์ม) */
export async function publishMany(
  posts: PublishPost[],
  opts: PublishOptions = {},
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];
  for (const p of posts) {
    results.push(await publishPost(p, opts));
  }
  return results;
}
