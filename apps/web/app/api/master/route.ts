/**
 * /api/master — สถานะรวมของ "แอป Zenkai (ร้านอาหาร)" เท่านั้น
 *
 * GET → systemd services ของแอป, เครดิต Phaya/OpenAI, คิววิดีโอ/โพสต์, คีย์ระบบ (present flag)
 *
 * ⚠️ เครื่อง affiliate / auto-income เป็น "คนละโปรเจกต์" — ไม่อยู่ในนี้โดยตั้งใจ
 *    (สคริปต์ /root/auto-income-*.sh, บอท/ช่องทาง affiliate แยกต่างหาก ไม่เกี่ยวกับร้าน)
 */
import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { runTool } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pexec = promisify(execFile);

// systemd services ของแอป Zenkai
const SERVICES = [
  { name: "zenkai-web.service",     label: "เว็บแอป" },
  { name: "zenkai-workers.service", label: "Worker (วิดีโอ/โพสต์)" },
];

// คีย์ระบบของแอป — โชว์สถานะอย่างเดียว (ค่าไม่ส่งกลับ, อ่านจาก env ของแอปเอง)
const WATCH_KEYS = ["OPENAI_API_KEY", "PHAYA_API_KEY", "TELEGRAM_BOT_TOKEN"];

async function serviceActive(name: string): Promise<boolean> {
  try {
    const { stdout } = await pexec("systemctl", ["is-active", name], { timeout: 4000 });
    return stdout.trim() === "active";
  } catch {
    return false;
  }
}

export async function GET() {
  const [svcStates, status] = await Promise.all([
    Promise.all(SERVICES.map(async (s) => ({ ...s, active: await serviceActive(s.name) }))),
    runTool("system_status", {}).then((r) => JSON.parse(r)).catch(() => ({})),
  ]);

  const keys = Object.fromEntries(WATCH_KEYS.map((k) => [k, { present: !!process.env[k] }]));

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      services: svcStates,
      keys,
      credit: {
        phaya_thb: typeof status?.phaya_credit_thb === "number" ? status.phaya_credit_thb : null,
        openai: !!process.env.OPENAI_API_KEY,
      },
      queue: {
        video: status?.queue_video || null,
        post: status?.queue_post || null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
