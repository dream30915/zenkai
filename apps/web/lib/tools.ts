/**
 * lib/tools.ts — real "skills" the Zenkai AI team can call (function-calling).
 *
 * Each tool exposes an OpenAI-style JSON-schema spec plus a run() that returns
 * a compact, LLM-readable string. Tools read LIVE data (Redis queue, Supabase,
 * Phaya credit) so agents answer from reality, not guesses.
 *
 * Add a skill = append one Tool object + grant it to agents in lib/agents.ts.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getVideoQueue, getPostQueue } from "@/lib/queue";
import Redis from "ioredis";

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON schema
  run: (args: Record<string, unknown>) => Promise<string>;
}

const ok = (o: unknown) => JSON.stringify(o);

const CAPTIONS_KEY = "zenkai:captions";
let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) _redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: 2 });
  return _redis;
}

// ── system_status — live queue depth + Phaya credit ───────────────────
const systemStatus: Tool = {
  name: "system_status",
  description:
    "ดูสถานะระบบหลังบ้านสด: จำนวนงานในคิววิดีโอ/โพสต์ (รอ/กำลังทำ/เสร็จ/ล้มเหลว) และเครดิต Phaya คงเหลือ",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  run: async () => {
    const out: Record<string, unknown> = {};
    try {
      const [vc, pc] = await Promise.all([
        getVideoQueue().getJobCounts("waiting", "active", "completed", "failed", "delayed"),
        getPostQueue().getJobCounts("waiting", "active", "completed", "failed", "delayed"),
      ]);
      out.queue_video = vc;
      out.queue_post = pc;
    } catch (e) {
      out.queue_error = e instanceof Error ? e.message : "queue unavailable";
    }
    try {
      const key = process.env.PHAYA_API_KEY;
      if (key) {
        const r = await fetch("https://api.phaya.io/api/v1/user/credits", {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(8000),
        });
        const j = await r.json();
        out.phaya_credit_thb = j?.credits_balance ?? null;
      }
    } catch (e) {
      out.phaya_error = e instanceof Error ? e.message : "credit check failed";
    }
    return ok(out);
  },
};

// ── get_recent_jobs — latest video jobs from DB ───────────────────────
const getRecentJobs: Tool = {
  name: "get_recent_jobs",
  description: "ดึงรายการงานสร้างวิดีโอล่าสุดจากฐานข้อมูล (สถานะ เมนู tier เวลา และ error ถ้ามี)",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "integer", description: "จำนวนงาน (ค่าเริ่มต้น 10, สูงสุด 30)" },
      status: { type: "string", description: "กรองสถานะ เช่น pending/processing/completed/failed (ไม่ใส่ = ทั้งหมด)" },
    },
    additionalProperties: false,
  },
  run: async (args) => {
    const limit = Math.min(Number(args.limit) || 10, 30);
    let q = supabaseAdmin
      .from("jobs")
      .select("id, menu_name, status, video_tier, video_url, error_message, created_at, posted_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (typeof args.status === "string" && args.status) q = q.eq("status", args.status);
    const { data, error } = await q;
    if (error) return ok({ error: error.message });
    return ok({ count: data?.length ?? 0, jobs: data ?? [] });
  },
};

// ── get_menus — the menu catalog (context for copy/prompts) ────────────
const getMenus: Tool = {
  name: "get_menus",
  description: "ดึงคลังเมนูอาหารของร้าน (ชื่อไทย/อังกฤษ หมวด ราคา คำอธิบาย) ไว้ใช้เขียนแคปชั่น/พรอมป์",
  parameters: {
    type: "object",
    properties: { limit: { type: "integer", description: "จำนวนเมนู (ค่าเริ่มต้น 20)" } },
    additionalProperties: false,
  },
  run: async (args) => {
    const limit = Math.min(Number(args.limit) || 20, 50);
    const { data, error } = await supabaseAdmin
      .from("menus")
      .select("name_th, name_en, category, price, description, is_available")
      .order("sort_order", { ascending: true })
      .limit(limit);
    if (error) return ok({ error: error.message });
    return ok({ count: data?.length ?? 0, menus: data ?? [] });
  },
};

// ── get_analytics — performance numbers per job/platform ──────────────
const getAnalytics: Tool = {
  name: "get_analytics",
  description: "ดึงตัวเลขผลงานคอนเทนต์ (วิว ไลก์ คอมเมนต์ แชร์) ต่อแพลตฟอร์ม สำหรับวิเคราะห์",
  parameters: {
    type: "object",
    properties: { limit: { type: "integer", description: "จำนวนแถวล่าสุด (ค่าเริ่มต้น 30)" } },
    additionalProperties: false,
  },
  run: async (args) => {
    const limit = Math.min(Number(args.limit) || 30, 100);
    const { data, error } = await supabaseAdmin
      .from("analytics")
      .select("job_id, platform, views, likes, comments, shares, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(limit);
    if (error) return ok({ error: error.message });
    return ok({ count: data?.length ?? 0, analytics: data ?? [] });
  },
};

// ── web_search — live web (Tavily/Serper). Graceful if no key. ─────────
const webSearch: Tool = {
  name: "web_search",
  description:
    "ค้นข้อมูลสดจากอินเทอร์เน็ต (เทรนด์ คู่แข่ง ข่าว) — ใช้เมื่อต้องการข้อมูลปัจจุบันที่เกินความรู้ในตัว",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "คำค้น (ภาษาไทยหรืออังกฤษ)" },
      max_results: { type: "integer", description: "จำนวนผลลัพธ์ (ค่าเริ่มต้น 5)" },
    },
    required: ["query"],
    additionalProperties: false,
  },
  run: async (args) => {
    const query = String(args.query || "").trim();
    const max = Math.min(Number(args.max_results) || 5, 10);
    if (!query) return ok({ error: "query required" });

    const tavily = process.env.TAVILY_API_KEY;
    const serper = process.env.SERPER_API_KEY;
    try {
      if (tavily) {
        const r = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ api_key: tavily, query, max_results: max, search_depth: "basic" }),
          signal: AbortSignal.timeout(12000),
        });
        const j = await r.json();
        const results = (j.results || []).map((x: { title: string; url: string; content: string }) => ({
          title: x.title, url: x.url, snippet: (x.content || "").slice(0, 300),
        }));
        return ok({ source: "tavily", answer: j.answer ?? null, results });
      }
      if (serper) {
        const r = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serper, "content-type": "application/json" },
          body: JSON.stringify({ q: query, num: max }),
          signal: AbortSignal.timeout(12000),
        });
        const j = await r.json();
        const results = (j.organic || []).slice(0, max).map((x: { title: string; link: string; snippet: string }) => ({
          title: x.title, url: x.link, snippet: x.snippet,
        }));
        return ok({ source: "serper", results });
      }
    } catch (e) {
      return ok({ error: e instanceof Error ? e.message : "search failed" });
    }
    // No provider configured — be honest so the agent doesn't hallucinate.
    return ok({
      unavailable: true,
      note: "ยังไม่ได้ตั้งค่าค้นเว็บสด (ต้องใส่ TAVILY_API_KEY หรือ SERPER_API_KEY ใน .env.local). " +
        "ให้ตอบจากหลักการ/ความรู้ที่มี และบอกผู้ใช้ว่าข้อมูลอาจไม่อัปเดตล่าสุด อย่ากุข้อมูลสด.",
    });
  },
};

// ── ask_teammate — delegate to another agent (orchestration) ──────────
// Dynamic imports avoid a static cycle with lib/llm (which imports this file).
const askTeammate: Tool = {
  name: "ask_teammate",
  description:
    "มอบหมายงานให้เพื่อนร่วมทีม AI คนอื่นทำ แล้วรับคำตอบกลับมา ใช้เมื่อต้องการความเชี่ยวชาญเฉพาะทาง " +
    "(เช่น ให้ก๊อปปี้ไรเตอร์เขียนแคปชั่น, ให้ผู้กำกับเขียนพรอมป์คลิป, ให้นักวิเคราะห์ดูตัวเลข)",
  parameters: {
    type: "object",
    properties: {
      agent_id: {
        type: "string",
        enum: ["marketing", "copywriter", "director", "analyst", "ops", "competitor", "trend", "consumer"],
        description: "id ของเพื่อนร่วมทีมที่จะมอบงาน",
      },
      task: { type: "string", description: "คำสั่ง/โจทย์ที่ชัดเจนสำหรับเพื่อนร่วมทีม (ภาษาไทย)" },
    },
    required: ["agent_id", "task"],
    additionalProperties: false,
  },
  run: async (args) => {
    const agentId = String(args.agent_id || "");
    const task = String(args.task || "").trim();
    if (!task) return ok({ error: "task required" });
    const { getAgent } = await import("@/lib/agents");
    const { chat, chatWithTools } = await import("@/lib/llm");
    const a = getAgent(agentId);
    if (!a || a.id === "manager") return ok({ error: `unknown teammate ${agentId}` });
    try {
      // Run the teammate WITH its own skills (e.g. trend can web_search).
      // No recursion risk: only the manager owns ask_teammate, teammates don't.
      const teammateTools = (a.tools ?? []).filter((t) => t !== "ask_teammate");
      let text: string;
      if (teammateTools.length) {
        ({ text } = await chatWithTools({
          messages: [{ role: "user", content: task }],
          system: a.systemPrompt,
          tier: a.tier,
          toolNames: teammateTools,
          temperature: a.temperature ?? 0.7,
          maxTokens: 1100,
        }));
      } else {
        ({ text } = await chat({
          messages: [{ role: "user", content: task }],
          system: a.systemPrompt,
          tier: a.tier,
          temperature: a.temperature ?? 0.7,
          maxTokens: 1100,
        }));
      }
      return ok({ teammate: a.name, role: a.role, answer: text });
    } catch (e) {
      return ok({ error: e instanceof Error ? e.message : "delegation failed" });
    }
  },
};

// ── save_caption / get_saved_captions — keep good copy for reuse ──────
const saveCaption: Tool = {
  name: "save_caption",
  description: "บันทึกแคปชั่นที่ดีไว้ใช้ต่อ (เก็บคู่กับชื่อเมนูและแพลตฟอร์ม) เรียกเมื่อผู้ใช้บอกว่า 'เก็บ/เซฟอันนี้'",
  parameters: {
    type: "object",
    properties: {
      menu_name: { type: "string", description: "ชื่อเมนูที่แคปชั่นนี้ใช้กับ" },
      caption: { type: "string", description: "ข้อความแคปชั่นที่จะบันทึก (รวม hashtag/CTA ได้)" },
      platform: { type: "string", description: "แพลตฟอร์ม เช่น tiktok/instagram/facebook (ไม่บังคับ)" },
    },
    required: ["menu_name", "caption"],
    additionalProperties: false,
  },
  run: async (args) => {
    const menu_name = String(args.menu_name || "").trim();
    const caption = String(args.caption || "").trim();
    if (!menu_name || !caption) return ok({ error: "menu_name and caption required" });
    const entry = { menu_name, caption, platform: String(args.platform || "") || null, ts: new Date().toISOString() };
    try {
      await redis().lpush(CAPTIONS_KEY, JSON.stringify(entry));
      await redis().ltrim(CAPTIONS_KEY, 0, 199); // keep last 200
      return ok({ saved: true, entry });
    } catch (e) {
      return ok({ error: e instanceof Error ? e.message : "save failed" });
    }
  },
};

const getSavedCaptions: Tool = {
  name: "get_saved_captions",
  description: "ดึงแคปชั่นที่เคยบันทึกไว้ (ล่าสุดก่อน) ไว้ดู/นำกลับมาใช้",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "integer", description: "จำนวน (ค่าเริ่มต้น 15)" },
      menu_name: { type: "string", description: "กรองเฉพาะเมนูนี้ (ไม่บังคับ)" },
    },
    additionalProperties: false,
  },
  run: async (args) => {
    const limit = Math.min(Number(args.limit) || 15, 50);
    try {
      const rows = await redis().lrange(CAPTIONS_KEY, 0, 199);
      let items = rows.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
      if (typeof args.menu_name === "string" && args.menu_name)
        items = items.filter((i: { menu_name?: string }) => i.menu_name === args.menu_name);
      return ok({ count: Math.min(items.length, limit), captions: items.slice(0, limit) });
    } catch (e) {
      return ok({ error: e instanceof Error ? e.message : "read failed" });
    }
  },
};

export const TOOLS: Record<string, Tool> = {
  system_status: systemStatus,
  get_recent_jobs: getRecentJobs,
  get_menus: getMenus,
  save_caption: saveCaption,
  get_saved_captions: getSavedCaptions,
  get_analytics: getAnalytics,
  web_search: webSearch,
  ask_teammate: askTeammate,
};

/** OpenAI tools[] spec for a list of tool names. */
export function toolSpecs(names: string[]) {
  return names
    .filter((n) => TOOLS[n])
    .map((n) => ({
      type: "function" as const,
      function: { name: n, description: TOOLS[n].description, parameters: TOOLS[n].parameters },
    }));
}

export async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  const t = TOOLS[name];
  if (!t) return ok({ error: `unknown tool ${name}` });
  try {
    return await t.run(args);
  } catch (e) {
    return ok({ error: e instanceof Error ? e.message : "tool error" });
  }
}
