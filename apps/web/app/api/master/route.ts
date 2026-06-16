/**
 * /api/master — ศูนย์คุมรวม (Master Control)
 *
 * GET  → สถานะสดทั้งระบบ: systemd services, เครื่องหาเงิน (โพสต์ล่าสุด),
 *        เครดิต Phaya, ความพร้อม affiliate/keys
 * POST → สั่งงาน: { action: "post" | "post_dry" | "set_env", key?, value? }
 *
 * Service รันเป็น root (User=root ใน zenkai-web.service) จึง exec /root/*.sh +
 * อ่าน/เขียน /root/.env ได้โดยตรง — แอปนี้ใช้ส่วนตัว อยู่หลัง login.
 */
import { NextRequest, NextResponse } from "next/server";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import { runTool } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pexec = promisify(execFile);
const ENV_PATH = "/root/.env";
const INCOME_LOG = "/root/auto-income.log";
const INCOME_SCRIPT = "/root/auto-income-post.sh";

// systemd services ที่เราดูแล
const SERVICES = [
  { name: "zenkai-web.service",     label: "เว็บแอป" },
  { name: "zenkai-workers.service", label: "Worker (วิดีโอ/โพสต์)" },
  { name: "hermes-gateway.service", label: "Telegram (Hermes)" },
];

// key ที่ master สนใจ (โชว์/แก้ได้) — ค่าไม่ส่งกลับ มีแต่ flag present
const WATCH_KEYS = [
  "AFFILIATE_LINK_TEMPLATE",
  "SHOPEE_AFFILIATE_ID",
  "LAZADA_AFFILIATE_ID",
  "FB_PAGE_ACCESS_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "OPENAI_API_KEY",
  "PHAYA_API_KEY",
  "XAI_API_KEY",
];
// key ที่อนุญาตให้แก้จากเว็บ (กันแก้คีย์ระบบสำคัญพลาด)
const EDITABLE_KEYS = new Set([
  "AFFILIATE_LINK_TEMPLATE",
  "SHOPEE_AFFILIATE_ID",
  "LAZADA_AFFILIATE_ID",
  "FB_PAGE_ACCESS_TOKEN",
]);

async function serviceActive(name: string): Promise<boolean> {
  try {
    const { stdout } = await pexec("systemctl", ["is-active", name], { timeout: 4000 });
    return stdout.trim() === "active";
  } catch {
    return false;
  }
}

async function readEnv(): Promise<Record<string, string>> {
  try {
    const txt = await fs.readFile(ENV_PATH, "utf8");
    const out: Record<string, string> = {};
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

// อ่านโพสต์ล่าสุดจาก log (คั่นด้วยเส้น ──────)
async function lastIncomePost(): Promise<{ at: string | null; excerpt: string | null }> {
  try {
    const st = await fs.stat(INCOME_LOG);
    const txt = await fs.readFile(INCOME_LOG, "utf8");
    const tail = txt.slice(-4000).trim();
    // เอาบล็อกสุดท้าย (หลังเส้นคั่นอันท้ายสุด)
    const parts = tail.split(/─{5,}/);
    const last = parts[parts.length - 1] || tail;
    const excerpt = last.trim().split("\n").slice(0, 6).join("\n").slice(0, 400);
    return { at: st.mtime.toISOString(), excerpt: excerpt || null };
  } catch {
    return { at: null, excerpt: null };
  }
}

export async function GET() {
  const [svcStates, env, income, status] = await Promise.all([
    Promise.all(SERVICES.map(async (s) => ({ ...s, active: await serviceActive(s.name) }))),
    readEnv(),
    lastIncomePost(),
    runTool("system_status", {}).then((r) => JSON.parse(r)).catch(() => ({})),
  ]);

  const keys = Object.fromEntries(
    WATCH_KEYS.map((k) => [k, { present: !!env[k], editable: EDITABLE_KEYS.has(k) }])
  );

  // ความพร้อมหาเงิน
  const affiliate = {
    invol: !!env.AFFILIATE_LINK_TEMPLATE,         // invol/Involve template
    shopee: !!env.SHOPEE_AFFILIATE_ID,
    lazada: !!env.LAZADA_AFFILIATE_ID,
    fb: !!env.FB_PAGE_ACCESS_TOKEN,
    earning: !!(env.AFFILIATE_LINK_TEMPLATE || env.SHOPEE_AFFILIATE_ID || env.LAZADA_AFFILIATE_ID),
  };

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      services: svcStates,
      income,
      affiliate,
      keys,
      credit: {
        phaya_thb: typeof status?.phaya_credit_thb === "number" ? status.phaya_credit_thb : null,
        openai: !!env.OPENAI_API_KEY,
      },
      queue: {
        video: status?.queue_video || null,
        post: status?.queue_post || null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let body: { action?: string; key?: string; value?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const action = body.action;

  if (action === "post" || action === "post_dry") {
    try {
      const env = { ...process.env, NOIMG: "1", ...(action === "post_dry" ? { DRY: "1" } : {}) };
      // fire-and-forget — โพสต์ใช้เวลา; ผลขึ้นใน Telegram + รีเฟรชสถานะ
      const child = spawn("bash", [INCOME_SCRIPT], {
        env,
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return NextResponse.json({
        ok: true,
        started: true,
        mode: action === "post_dry" ? "dry" : "live",
        msg: action === "post_dry" ? "เริ่มทดลองโพสต์ (DRY) — ดูผลใน Telegram" : "เริ่มโพสต์จริง — ดูผลใน Telegram",
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "spawn error" }, { status: 500 });
    }
  }

  if (action === "set_env") {
    const key = (body.key || "").trim();
    const value = body.value ?? "";
    if (!EDITABLE_KEYS.has(key)) {
      return NextResponse.json({ ok: false, error: `key '${key}' แก้ไม่ได้จากเว็บ` }, { status: 400 });
    }
    try {
      let txt = "";
      try { txt = await fs.readFile(ENV_PATH, "utf8"); } catch { txt = ""; }
      const line = `${key}=${value}`;
      const re = new RegExp(`^${key}=.*$`, "m");
      txt = re.test(txt) ? txt.replace(re, line) : (txt.replace(/\n*$/, "") + "\n" + line + "\n");
      await fs.writeFile(ENV_PATH, txt, "utf8");
      return NextResponse.json({ ok: true, key, set: value.length > 0, msg: `บันทึก ${key} แล้ว` });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "write error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
