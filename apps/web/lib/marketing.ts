/**
 * lib/marketing.ts — Autonomous Marketing Engine.
 *
 * หัวใจของระบบการตลาดอัตโนมัติ: ดึงเมนูจริง → ให้ทีม AI การตลาดวางแผนคอนเทนต์
 * รายวัน (ธีม + ชิ้นงานหลายช่องทาง พร้อมแคปชั่น/แฮชแท็ก/เวลาโพสต์/CTA) →
 * คืนเป็นโครงสร้างที่หน้าเว็บ/บอท/ตัวตั้งเวลานำไปใช้ต่อได้ทันที.
 */
import { chat } from "@/lib/llm";
import { getAgent } from "@/lib/agents";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT } from "@/lib/restaurant";

export interface ContentPiece {
  menu: string;
  channel: string; // TikTok | Instagram | Facebook | LINE
  format: "video" | "image" | "carousel";
  postTime: string; // "HH:MM"
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
}

export interface MarketingPlan {
  date: string;
  theme: string;
  summary: string;
  pieces: ContentPiece[];
  generatedBy: string;
  menuCount: number;
}

interface MenuRow {
  name: string;
  price?: number;
  category?: string;
  description?: string;
}

async function fetchMenus(): Promise<MenuRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("menus")
      .select("name_th,price,category,description,is_available")
      .limit(50);
    return (data ?? [])
      .filter((m: Record<string, unknown>) => m.is_available !== false)
      .map((m: Record<string, unknown>) => ({
        name: String(m.name_th ?? ""),
        price: typeof m.price === "number" ? m.price : undefined,
        category: m.category ? String(m.category) : undefined,
        description: m.description ? String(m.description) : undefined,
      }))
      .filter((m) => m.name);
  } catch {
    return [];
  }
}

/** ดึง JSON ออกจากคำตอบ LLM อย่างทนทาน (เผื่อมี ```json fences หรือข้อความนำ). */
function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

const CHANNELS = new Set<string>(RESTAURANT.channels as readonly string[]);

function normalizePiece(p: Record<string, unknown>): ContentPiece {
  const channel = String(p.channel ?? "TikTok");
  const fmt = String(p.format ?? "video").toLowerCase();
  const tags = Array.isArray(p.hashtags)
    ? p.hashtags.map((t) => String(t).replace(/^#?/, "#")).slice(0, 12)
    : [];
  return {
    menu: String(p.menu ?? "").trim() || "เมนูแนะนำ",
    channel: CHANNELS.has(channel) ? channel : "TikTok",
    format: fmt === "image" || fmt === "carousel" ? (fmt as "image" | "carousel") : "video",
    postTime: String(p.postTime ?? "12:00").slice(0, 5),
    hook: String(p.hook ?? "").trim(),
    caption: String(p.caption ?? "").trim(),
    hashtags: tags,
    cta: String(p.cta ?? "").trim(),
  };
}

export async function buildDailyPlan(opts?: {
  count?: number;
  channels?: string[];
  date?: string;
}): Promise<MarketingPlan> {
  const count = Math.min(Math.max(opts?.count ?? 4, 1), 8);
  const channels = opts?.channels?.length ? opts.channels : [...RESTAURANT.channels];
  const date = opts?.date ?? new Date().toISOString().slice(0, 10);

  const menus = await fetchMenus();
  const menuList = menus.length
    ? menus
        .map(
          (m) =>
            `- ${m.name}${m.price ? ` (${m.price}฿)` : ""}${m.category ? ` [${m.category}]` : ""}`,
        )
        .join("\n")
    : "(ยังไม่มีเมนูในระบบ — เสนอไอเดียจากอาหารญี่ปุ่น/อิซากะยะทั่วไป)";

  const marketing = getAgent("marketing");
  const system =
    (marketing?.systemPrompt ?? "คุณคือนักการตลาดร้านอาหารญี่ปุ่นมือโปร") +
    `\n\nสำคัญ: ตอบกลับเป็น JSON ที่ valid เท่านั้น ห้ามมีข้อความอื่นนอกบล็อก JSON.`;

  const user = `ร้าน: ${RESTAURANT.nameTh} (${RESTAURANT.nameJa}) — ${RESTAURANT.tagline}
เปิด${RESTAURANT.hours.days} ${RESTAURANT.hours.open}-${RESTAURANT.hours.close} น. · โทร ${RESTAURANT.phone} · ราคา ${RESTAURANT.priceMin}-${RESTAURANT.priceMax}฿
ช่องทางที่ต้องวางแผนให้: ${channels.join(", ")}

เมนูจริงในระบบ:
${menuList}

ภารกิจ: วางแผนคอนเทนต์การตลาดของวันที่ ${date} จำนวน ${count} ชิ้น
- เลือกเมนูจากรายการจริงด้านบนเป็นหลัก (ถ้ามี)
- กระจายช่องทางและ "เวลาโพสต์" ให้ตรงพฤติกรรมคนไทย: ก่อนมื้อเที่ยง (10:30-11:30), ก่อนมื้อเย็น (16:30-18:00), สายดึกสายกินดื่ม (20:00-22:00)
- แคปชั่นต้องพร้อมโพสต์จริง ภาษาไทย เสียงแบรนด์อิซากะยะ อบอุ่นชวนหิว ใส่ emoji พอดี
- CTA ผูกกับร้านจริง เช่น โทรจอง ${RESTAURANT.phone} / เปิด${RESTAURANT.hours.open}-${RESTAURANT.hours.close}

ตอบเป็น JSON ตามสคีมานี้เป๊ะ:
{
  "theme": "ธีม/แคมเปญรวมของวันนี้ สั้นๆ",
  "summary": "สรุปกลยุทธ์วันนี้ 1-2 ประโยค",
  "pieces": [
    {
      "menu": "ชื่อเมนูจากรายการจริง",
      "channel": "TikTok|Instagram|Facebook|LINE",
      "format": "video|image|carousel",
      "postTime": "HH:MM",
      "hook": "ฮุกเปิด 1 ประโยคให้คนหยุดดู",
      "caption": "แคปชั่นพร้อมโพสต์",
      "hashtags": ["#แท็ก1", "#แท็ก2"],
      "cta": "call to action สั้นๆ"
    }
  ]
}`;

  const { text, model } = await chat({
    messages: [{ role: "user", content: user }],
    system,
    tier: "smart",
    temperature: 0.7,
    maxTokens: 2400,
  });

  const parsed = extractJson(text);
  const rawPieces = Array.isArray(parsed?.pieces) ? (parsed!.pieces as Record<string, unknown>[]) : [];
  const pieces = rawPieces.slice(0, count).map(normalizePiece);

  return {
    date,
    theme: String(parsed?.theme ?? "คอนเทนต์ประจำวัน"),
    summary: String(parsed?.summary ?? ""),
    pieces,
    generatedBy: model,
    menuCount: menus.length,
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** แปลงแผนเป็นข้อความ HTML สำหรับส่งเข้า Telegram (อนุมัติ/โพสต์ด้วยมือ). */
export function planToTelegram(plan: MarketingPlan): string {
  const head = `📣 <b>แผนการตลาด ${esc(plan.date)}</b>\n🎯 ${esc(plan.theme)}\n${plan.summary ? esc(plan.summary) + "\n" : ""}`;
  const body = plan.pieces
    .map((p, i) => {
      const tags = p.hashtags.join(" ");
      return (
        `\n<b>${i + 1}) ${esc(p.channel)} · ${esc(p.postTime)} น.</b> — ${esc(p.menu)}\n` +
        `🪝 ${esc(p.hook)}\n` +
        `${esc(p.caption)}\n` +
        (tags ? `${esc(tags)}\n` : "") +
        (p.cta ? `👉 ${esc(p.cta)}` : "")
      );
    })
    .join("\n");
  return head + body;
}
