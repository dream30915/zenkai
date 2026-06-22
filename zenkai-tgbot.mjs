#!/usr/bin/env node
/**
 * Zenkai Telegram Control Bot — สั่งงานร้านผ่าน Telegram (ปุ่มเมนูทุกฟีเจอร์)
 * zero-dependency (Node 18+ global fetch). long-polling getUpdates.
 * คุมแอป Zenkai ผ่าน API จริง (localhost:3000). เฉพาะเจ้าของเท่านั้น.
 */
import fs from "node:fs";

// ── config จาก .env.local ของแอป ───────────────────────────────
const ENV = Object.fromEntries(
  fs.readFileSync("/opt/zenkai/apps/web/.env.local", "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]; })
);
const TOKEN = ENV.TELEGRAM_BOT_TOKEN;
const OWNER = String(ENV.TELEGRAM_OWNER_CHAT_ID || "");
const PW = ENV.BASIC_AUTH_PASSWORD || "kaizen123";
const APP = "http://localhost:3000";
const API = `https://api.telegram.org/bot${TOKEN}`;

// ── app auth (login → cookie, reuse) ───────────────────────────
let cookie = "";
async function login() {
  const r = await fetch(`${APP}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PW }),
  });
  const sc = r.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  return r.ok;
}
async function app(path, opts = {}) {
  const headers = { ...(opts.headers || {}), Cookie: cookie };
  let r = await fetch(`${APP}${path}`, { ...opts, headers });
  if (r.status === 401 || r.status === 307) { await login(); r = await fetch(`${APP}${path}`, { ...opts, headers: { ...headers, Cookie: cookie } }); }
  return r;
}

// ── telegram helpers ───────────────────────────────────────────
function tg(method, body) {
  return fetch(`${API}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
}
const send = (chat, text, kb) => tg("sendMessage", { chat_id: chat, text, parse_mode: "Markdown", reply_markup: kb, disable_web_page_preview: true });
const edit = (chat, mid, text, kb) => tg("editMessageText", { chat_id: chat, message_id: mid, text, parse_mode: "Markdown", reply_markup: kb, disable_web_page_preview: true });

// ── main menu keyboard ─────────────────────────────────────────
const MAIN_KB = { inline_keyboard: [
  [{ text: "💬 คุยกับทีม AI", callback_data: "team" }, { text: "📋 ดูเมนู", callback_data: "menu" }],
  [{ text: "🖼️ สร้างรูป AI", callback_data: "image" }, { text: "🎥 ทำคลิป", callback_data: "clip" }],
  [{ text: "📊 สถานะระบบ", callback_data: "status" }, { text: "🎬 งานล่าสุด", callback_data: "jobs" }],
  [{ text: "✍️ แคปชั่นที่เซฟ", callback_data: "captions" }, { text: "📰 Daily Brief", callback_data: "brief" }],
] };
const CLIP_KB = { inline_keyboard: [
  [{ text: "📤 ส่งรูปจานจริง → ทำคลิป", callback_data: "clip_upload" }],
  [{ text: "🖼️ เจนรูป AI → ทำคลิป (อัตโนมัติ)", callback_data: "clip_gen" }],
  [{ text: "⬅️ กลับเมนู", callback_data: "home" }],
] };

// per-chat conversation mode
const mode = {}; // chat_id -> {kind, ...}
const lastImg = {}; // chat_id -> last generated image url

let AGENTS = [];
async function loadAgents() {
  try { const r = await app("/api/agent"); const j = await r.json(); AGENTS = j.agents || []; } catch { AGENTS = []; }
}
function agentKb() {
  const rows = [];
  for (let i = 0; i < AGENTS.length; i += 2) {
    rows.push(AGENTS.slice(i, i + 2).map((a) => ({ text: `${a.emoji || "🤖"} ${a.name}`, callback_data: `chat:${a.id}` })));
  }
  rows.push([{ text: "⬅️ กลับเมนู", callback_data: "home" }]);
  return { inline_keyboard: rows };
}
const backKb = { inline_keyboard: [[{ text: "⬅️ กลับเมนู", callback_data: "home" }]] };

// ── feature handlers ───────────────────────────────────────────
async function showMenu(chat) {
  const r = await app("/api/menus"); const j = await r.json();
  const ms = j.menus || [];
  const byCat = {};
  for (const m of ms) (byCat[m.category || "อื่นๆ"] ||= []).push(m);
  let txt = `📋 *เมนูร้าน Zenkai* (${ms.length} รายการ)\n`;
  for (const [c, arr] of Object.entries(byCat)) {
    txt += `\n*${c}*\n` + arr.map((m) => `• ${m.name_th} — ${m.price}฿`).join("\n") + "\n";
  }
  return send(chat, txt.slice(0, 4000), backKb);
}
async function showStatus(chat) {
  const r = await app("/api/status"); const j = await r.json().catch(() => ({}));
  const txt = "📊 *สถานะระบบ*\n```\n" + JSON.stringify(j, null, 2).slice(0, 3500) + "\n```";
  return send(chat, txt, backKb);
}
async function showJobs(chat) {
  const r = await app("/api/jobs"); const j = await r.json().catch(() => ({}));
  const jobs = (j.jobs || j || []).slice(0, 8);
  const txt = "🎬 *งานล่าสุด*\n" + (jobs.length ? jobs.map((x) => `• ${x.menu_name || x.id} — ${x.status}${x.video_url ? " ✅" : ""}`).join("\n") : "ยังไม่มีงาน");
  return send(chat, txt.slice(0, 4000), backKb);
}
async function showCaptions(chat) {
  const r = await app("/api/captions"); const j = await r.json().catch(() => ({}));
  const caps = (j.captions || j || []).slice(0, 6);
  const txt = "✍️ *แคปชั่นที่เซฟ*\n" + (caps.length ? caps.map((c, i) => `${i + 1}. ${typeof c === "string" ? c : JSON.stringify(c)}`).join("\n\n") : "ยังไม่มี");
  return send(chat, txt.slice(0, 4000), backKb);
}
async function doBrief(chat) {
  await send(chat, "📰 กำลังสร้าง Daily Brief... (อาจใช้เวลาสักครู่)");
  const r = await app("/api/brief", { method: "POST" });
  return send(chat, r.ok ? "✅ ส่ง Daily Brief แล้ว (ดูข้อความด้านบน)" : `❌ ผิดพลาด (HTTP ${r.status})`, backKb);
}
async function doChat(chat, agentId, text) {
  await tg("sendChatAction", { chat_id: chat, action: "typing" });
  const r = await app("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId, messages: [{ role: "user", content: text }] }) });
  const ans = await r.text();
  await send(chat, ans.slice(0, 4000) || "(ไม่มีคำตอบ)", { inline_keyboard: [[{ text: "💬 ถามต่อ", callback_data: `chat:${agentId}` }, { text: "⬅️ เมนู", callback_data: "home" }]] });
}

// สร้างรูป AI ผ่าน Phaya → คืน url (หรือ null)
async function genImage(chat, prompt) {
  const key = ENV.PHAYA_API_KEY;
  const c = await fetch("https://api.phaya.io/api/v1/text-to-image/generate", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.slice(0, 1000), aspect_ratio: "9:16" }) }).then((r) => r.json());
  const jid = c.job_id || c.id;
  if (!jid) { await send(chat, "❌ สร้างรูปไม่สำเร็จ: " + JSON.stringify(c).slice(0, 200), backKb); return null; }
  for (let i = 0; i < 45; i++) {
    await new Promise((s) => setTimeout(s, 4000));
    const st = await fetch(`https://api.phaya.io/api/v1/text-to-image/status/${jid}`, { headers: { Authorization: `Bearer ${key}` } }).then((r) => r.json());
    if (/COMPLETED|SUCCEEDED/i.test(st.status || "")) return st.image_url;
    if (/FAILED|ERROR/i.test(st.status || "")) { await send(chat, "❌ เจนรูปล้มเหลว", backKb); return null; }
  }
  await send(chat, "⏱️ รูปใช้เวลานานเกินไป ลองใหม่", backKb); return null;
}
async function doImage(chat, prompt) {
  await send(chat, "🖼️ กำลังสร้างรูป (Phaya ~1฿)...");
  const url = await genImage(chat, prompt);
  if (!url) return;
  lastImg[chat] = url;
  return tg("sendPhoto", { chat_id: chat, photo: url, caption: "✅ เสร็จแล้ว", reply_markup: { inline_keyboard: [[{ text: "🎥 ทำคลิปจากรูปนี้", callback_data: "clip_fromlast" }], [{ text: "⬅️ กลับเมนู", callback_data: "home" }]] } });
}

// ทำคลิปจาก buffer รูป → /api/upload (postTo=[] กันโพสต์จริง)
async function makeClip(chat, buf, menuName) {
  await send(chat, `🎥 กำลังทำคลิป "${menuName}"... (เรนเดอร์ ~10-30 วิ)`);
  const fd = new FormData();
  fd.append("menuName", menuName); fd.append("videoTier", "tier1"); fd.append("postTo", "[]"); fd.append("scheduleType", "now");
  fd.append("images", new Blob([buf], { type: "image/jpeg" }), "dish.jpg");
  const r = await app("/api/upload", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return send(chat, `❌ ผิดพลาด: ${j.message || r.status}`, backKb);
  const c = j.content || {};
  return send(chat, `✅ เข้าคิวทำคลิปแล้ว!\n\n*${menuName}*\n${c.caption || ""}\n\n${c.hashtags || ""}\n\nคลิปกำลังเรนเดอร์ — กด "🎬 งานล่าสุด" อีกสักครู่จะเห็น ✅ พร้อมลิงก์`, backKb);
}
async function clipFromUrl(chat, url, name) {
  const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  return makeClip(chat, buf, name);
}
async function clipFromTgPhoto(chat, fileId, name) {
  const f = await tg("getFile", { file_id: fileId });
  const url = `https://api.telegram.org/file/bot${TOKEN}/${f.result.file_path}`;
  const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  return makeClip(chat, buf, name);
}

// ── update router ──────────────────────────────────────────────
async function onMessage(m) {
  const chat = String(m.chat.id);
  if (chat !== OWNER) return send(chat, "⛔ บอทนี้สำหรับเจ้าของร้านเท่านั้น");
  // photo (upload→clip flow)
  if (m.photo && mode[chat]?.kind === "upload") {
    const fileId = m.photo[m.photo.length - 1].file_id;
    const name = m.caption?.trim() || "เมนูร้าน Zenkai";
    mode[chat] = null;
    return clipFromTgPhoto(chat, fileId, name);
  }
  const text = (m.text || "").trim();
  if (text === "/start" || text === "/menu" || text === "เมนู") {
    mode[chat] = null;
    return send(chat, "🍣 *Zenkai Control* — เลือกเมนูด้านล่าง", MAIN_KB);
  }
  const md = mode[chat];
  if (md?.kind === "chat") return doChat(chat, md.agentId, text);
  if (md?.kind === "image") { mode[chat] = null; return doImage(chat, text); }
  if (md?.kind === "clipgen") {
    if (md.step === "name") { mode[chat] = { kind: "clipgen", step: "prompt", name: text }; return send(chat, "🖼️ พิมพ์คำอธิบายรูป (อังกฤษได้ผลดีกว่า)\nเช่น `salmon sashimi, fresh, dark moody background, top view`", backKb); }
    if (md.step === "prompt") { const name = md.name; mode[chat] = null; await send(chat, "🖼️ กำลังเจนรูป → แล้วทำคลิปต่อ..."); const url = await genImage(chat, text); if (url) { lastImg[chat] = url; await tg("sendPhoto", { chat_id: chat, photo: url, caption: "รูปที่เจนได้" }); return clipFromUrl(chat, url, name); } return; }
  }
  if (md?.kind === "clipname") { const url = md.url; mode[chat] = null; return clipFromUrl(chat, url, text); }
  if (md?.kind === "upload") return send(chat, "📷 กรุณา *ส่งรูป* (แนบรูปจาน) พร้อมพิมพ์ชื่อเมนูเป็นแคปชั่นของรูป", backKb);
  return send(chat, "พิมพ์ /menu เพื่อเปิดเมนูคำสั่ง", MAIN_KB);
}
async function onCallback(cb) {
  const chat = String(cb.message.chat.id);
  const mid = cb.message.message_id;
  const data = cb.data;
  if (chat !== OWNER) return tg("answerCallbackQuery", { callback_query_id: cb.id, text: "⛔ เฉพาะเจ้าของ" });
  await tg("answerCallbackQuery", { callback_query_id: cb.id });
  if (data === "home") { mode[chat] = null; return edit(chat, mid, "🍣 *Zenkai Control* — เลือกเมนู", MAIN_KB); }
  if (data === "team") return edit(chat, mid, "💬 เลือกทีมที่จะคุยด้วย:", agentKb());
  if (data.startsWith("chat:")) { const id = data.slice(5); mode[chat] = { kind: "chat", agentId: id }; const a = AGENTS.find((x) => x.id === id); return send(chat, `${a?.emoji || "🤖"} *${a?.name || id}* พร้อมแล้ว — พิมพ์คำถามได้เลย`, backKb); }
  if (data === "menu") return showMenu(chat);
  if (data === "status") return showStatus(chat);
  if (data === "jobs") return showJobs(chat);
  if (data === "captions") return showCaptions(chat);
  if (data === "brief") return doBrief(chat);
  if (data === "image") { mode[chat] = { kind: "image" }; return send(chat, "🖼️ พิมพ์คำอธิบายรูปที่อยากได้ (อังกฤษได้ผลดีกว่า) — เช่น `professional photo of salmon sashimi, dark background`", backKb); }
  if (data === "clip") return edit(chat, mid, "🎥 *ทำคลิป* — เลือกแบบ:", CLIP_KB);
  if (data === "clip_upload") { mode[chat] = { kind: "upload" }; return send(chat, "📤 ส่ง *รูปจานอาหารจริง* มาได้เลย แล้วพิมพ์ *ชื่อเมนู* เป็นแคปชั่นของรูป → AI เขียนแคปชั่น + ทำคลิปให้", backKb); }
  if (data === "clip_gen") { mode[chat] = { kind: "clipgen", step: "name" }; return send(chat, "🎥 *เจนรูป AI → ทำคลิป*\nพิมพ์ *ชื่อเมนู* ก่อน (เช่น แซลมอน ซาชิมิ)", backKb); }
  if (data === "clip_fromlast") {
    if (!lastImg[chat]) return send(chat, "ยังไม่มีรูปที่เจนไว้ กด 🖼️ สร้างรูป AI ก่อน", backKb);
    mode[chat] = { kind: "clipname", url: lastImg[chat] };
    return send(chat, "🎥 พิมพ์ *ชื่อเมนู* สำหรับคลิปนี้", backKb);
  }
}

// ── long-poll loop ─────────────────────────────────────────────
async function main() {
  await login();
  await loadAgents();
  await tg("deleteWebhook", { drop_pending_updates: false });
  await tg("setMyCommands", { commands: [{ command: "menu", description: "เปิดเมนูคำสั่งร้าน" }, { command: "start", description: "เริ่มใช้งาน" }] });
  await send(OWNER, "🟢 *Zenkai Control Bot อัปเดตแล้ว*\nเพิ่มปุ่ม 🎥 *ทำคลิป* (ส่งรูป หรือ เจนรูป AI แล้วทำคลิปอัตโนมัติ)\nพิมพ์ /menu เพื่อเริ่ม", MAIN_KB);
  let offset = 0;
  console.log("bot started, owner=", OWNER, "agents=", AGENTS.length);
  for (;;) {
    try {
      const u = await fetch(`${API}/getUpdates?timeout=30&offset=${offset}`).then((r) => r.json());
      for (const up of u.result || []) {
        offset = up.update_id + 1;
        if (up.message) await onMessage(up.message).catch((e) => console.error("msg err", e.message));
        else if (up.callback_query) await onCallback(up.callback_query).catch((e) => console.error("cb err", e.message));
      }
    } catch (e) { console.error("poll err", e.message); await new Promise((s) => setTimeout(s, 3000)); }
  }
}
main();
