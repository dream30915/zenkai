/**
 * Marketing automation — daily AI content planning + Make.com webhook publishing
 *
 * Flow:
 *   generateDailyPlan() → ContentPlan[] (AI writes captions per platform)
 *   notifyPlanViaTelegram() → sends draft to owner for approval
 *   publishViaWebhook(plan) → fires Make.com webhook → Make posts to social
 */

import { createClient } from "@supabase/supabase-js";
import { chat } from "./llm";
import { sendTelegramAlert } from "./notify";

export interface ContentPlan {
  date: string;
  platform: "facebook" | "instagram" | "tiktok" | "line";
  menuName: string;
  caption: string;
  hashtags: string[];
  suggestedPostTime: string;
}

export interface MarketingPlan {
  createdAt: string;
  plans: ContentPlan[];
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── สร้างแผนคอนเทนต์รายวัน ─────────────────────────────────────
export async function generateDailyPlan(date?: string): Promise<MarketingPlan> {
  const targetDate = date || new Date().toISOString().split("T")[0];

  const { data: menus } = await db()
    .from("menus")
    .select("name, name_en, description, category, price")
    .limit(50);

  const sample = ((menus as any[]) || [])
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  const platforms: ContentPlan["platform"][] = ["facebook", "instagram", "tiktok", "line"];
  const plans: ContentPlan[] = [];

  for (let i = 0; i < Math.min(sample.length, platforms.length); i++) {
    const menu = sample[i];
    const platform = platforms[i];

    try {
      const { text } = await chat({
        system: "คุณเป็นผู้เชี่ยวชาญการตลาดร้านอาหารญี่ปุ่น ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น",
        messages: [
          {
            role: "user",
            content: `สร้างแคปชั่น ${platform} สำหรับ "${menu.name}" (${menu.name_en || ""}) ราคา ${menu.price}฿\nวันที่: ${targetDate}\nตอบ JSON: { "caption": "...", "hashtags": ["...", "..."], "suggestedPostTime": "HH:MM" }`,
          },
        ],
        tier: "bulk",
      });

      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
      plans.push({
        date: targetDate,
        platform,
        menuName: menu.name,
        caption: json.caption || `${menu.name} ราคา ${menu.price}฿`,
        hashtags: json.hashtags || ["#ร้านอาหารญี่ปุ่น"],
        suggestedPostTime: json.suggestedPostTime || "11:00",
      });
    } catch {
      plans.push({
        date: targetDate,
        platform,
        menuName: menu.name,
        caption: `${menu.name} ราคา ${menu.price}฿ อร่อยมาก!`,
        hashtags: ["#ร้านอาหารญี่ปุ่น", "#อาหารญี่ปุ่น"],
        suggestedPostTime: "11:00",
      });
    }
  }

  return { createdAt: new Date().toISOString(), plans };
}

// ─── ส่งแผนไป Telegram เพื่ออนุมัติ ─────────────────────────────
export async function notifyPlanViaTelegram(plan: MarketingPlan): Promise<void> {
  const lines = plan.plans.map(
    (p, i) =>
      `${i + 1}. [${p.platform.toUpperCase()}] ${p.menuName}\n📝 ${p.caption}\n🏷️ ${p.hashtags.join(" ")}\n⏰ ${p.suggestedPostTime}`
  );
  await sendTelegramAlert(
    `📢 แผนคอนเทนต์ประจำวัน ${plan.plans[0]?.date || ""}\n\n${lines.join("\n\n")}`
  );
}

// ─── ยิง Make.com webhook (โพสต์โซเชียลจริง) ────────────────────
export async function publishViaWebhook(plan: ContentPlan): Promise<boolean> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[marketing] MAKE_WEBHOOK_URL not set — skipping publish");
    return false;
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      platform: plan.platform,
      menuName: plan.menuName,
      caption: plan.caption,
      hashtags: plan.hashtags,
      date: plan.date,
      postTime: plan.suggestedPostTime,
    }),
  });
  return res.ok;
}
