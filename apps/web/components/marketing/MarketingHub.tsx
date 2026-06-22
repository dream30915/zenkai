"use client";

import { useState } from "react";
import {
  Megaphone, Sparkles, Send, Loader2, Clock, Copy, Check,
  Calendar, Wand2, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

// ── types (mirror lib/marketing.ts) ────────────────────
interface Piece {
  menu: string;
  channel: string;
  format: string;
  postTime: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
}
interface Plan {
  date: string;
  theme: string;
  summary: string;
  pieces: Piece[];
  generatedBy?: string;
  menuCount?: number;
}

const ALL_CHANNELS = ["TikTok", "Instagram", "Facebook", "LINE"];
const channelColor: Record<string, string> = {
  TikTok: "bg-white/10 text-white border-white/20",
  Instagram: "bg-beni-500/15 text-beni-300 border-beni-500/30",
  Facebook: "bg-[#229ED9]/15 text-[#7cc7ec] border-[#229ED9]/30",
  LINE: "bg-seiji-500/15 text-seiji-400 border-seiji-500/30",
};

export default function MarketingHub() {
  const [channels, setChannels] = useState<string[]>([...ALL_CHANNELS]);
  const [count, setCount] = useState(4);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendingAll, setSendingAll] = useState<"" | "sending" | "sent" | "err">("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [sentKey, setSentKey] = useState<string>("");

  const toggle = (c: string) =>
    setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const generate = async () => {
    setBusy(true); setErr(""); setPlan(null); setSendingAll("");
    try {
      const r = await fetch("/api/marketing/plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, channels }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "สร้างแผนไม่สำเร็จ");
      setPlan(await r.json());
    } catch (e) { setErr(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  };

  const sendAll = async () => {
    setSendingAll("sending");
    try {
      const r = await fetch("/api/marketing/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, channels }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.plan) setPlan(d.plan);
      setSendingAll(d.delivered ? "sent" : "err");
    } catch { setSendingAll("err"); }
  };

  const pieceText = (p: Piece) =>
    `${p.caption}\n\n${p.hashtags.join(" ")}${p.cta ? `\n\n${p.cta}` : ""}`;

  const copyPiece = async (p: Piece, key: string) => {
    try { await navigator.clipboard.writeText(pieceText(p)); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch {}
  };

  const sendPiece = async (p: Piece, key: string) => {
    setSentKey(key + ":sending");
    try {
      const r = await fetch("/api/telegram/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `📣 ${p.channel} · ${p.postTime} — ${p.menu}`, text: pieceText(p) }),
      });
      setSentKey(key + (r.ok ? ":sent" : ":err"));
    } catch { setSentKey(key + ":err"); }
  };
  const sState = (key: string) => (sentKey.startsWith(key + ":") ? sentKey.split(":")[1] : "");

  return (
    <div className="min-h-screen bg-sumi-950 px-5 py-6 md:px-10 md:py-8">
      <div className="pointer-events-none fixed right-0 top-0 h-96 w-96 rounded-full bg-beni-600/10 blur-[120px]" />

      {/* header */}
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-kin-400">
            <Megaphone className="h-4 w-4" /><span className="tracking-widest">ระบบการตลาดอัตโนมัติ</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-white md:text-3xl">โรงงานคอนเทนต์ AI</h1>
          <p className="text-sm text-sumi-400">ทีม AI วางแผนคอนเทนต์ทั้งวัน — แคปชั่น แฮชแท็ก เวลาโพสต์ พร้อมส่งอนุมัติเข้า Telegram</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-sumi-800/60 px-3 py-2 text-xs text-sumi-300">
          <Clock className="mr-1 inline h-3.5 w-3.5 text-seiji-400" /> รันอัตโนมัติทุกเช้า <b className="text-sumi-100">09:00</b> → Telegram
        </div>
      </div>

      {/* controls */}
      <div className="animate-fade-up mt-6 rounded-2xl border border-white/[0.07] bg-sumi-800/60 p-5" style={{ animationDelay: "60ms" }}>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="mb-1.5 text-xs font-medium text-sumi-300">ช่องทาง</div>
            <div className="flex flex-wrap gap-2">
              {ALL_CHANNELS.map((c) => (
                <button key={c} onClick={() => toggle(c)}
                  className={clsx("rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    channels.includes(c) ? channelColor[c] : "border-white/10 text-sumi-500 hover:text-sumi-300")}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium text-sumi-300">จำนวนชิ้น</div>
            <div className="flex items-center gap-1.5">
              {[3, 4, 5, 6].map((n) => (
                <button key={n} onClick={() => setCount(n)}
                  className={clsx("h-9 w-9 rounded-lg text-sm font-bold transition",
                    count === n ? "bg-beni-600 text-white" : "border border-white/10 text-sumi-300 hover:bg-white/5")}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-end gap-2">
            <button onClick={generate} disabled={busy || channels.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-beni-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-beni-500 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {plan ? "วางแผนใหม่" : "วางแผนวันนี้"}
            </button>
            <button onClick={sendAll} disabled={sendingAll === "sending"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#229ED9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d8bc0] disabled:opacity-50">
              {sendingAll === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sendingAll === "sent" ? "ส่งแล้ว ✓" : "วางแผน+ส่ง Telegram"}
            </button>
          </div>
        </div>
      </div>

      {err && <div className="mt-4 rounded-xl border border-beni-500/30 bg-beni-500/10 p-3 text-sm text-beni-300">⚠️ {err}</div>}

      {/* empty / loading */}
      {!plan && !busy && !err && (
        <div className="animate-fade-up mt-8 rounded-2xl border border-dashed border-white/10 bg-sumi-900/40 py-16 text-center" style={{ animationDelay: "120ms" }}>
          <Sparkles className="mx-auto h-8 w-8 text-kin-400" />
          <p className="mt-3 font-display text-lg font-bold text-white">ยังไม่มีแผนวันนี้</p>
          <p className="mt-1 text-sm text-sumi-400">กด “วางแผนวันนี้” ให้ทีม AI การตลาดสร้างคอนเทนต์จากเมนูจริงของร้าน</p>
        </div>
      )}
      {busy && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/5" />)}
        </div>
      )}

      {/* plan */}
      {plan && !busy && (
        <>
          <div className="animate-fade-up mt-6 rounded-2xl border border-kin-400/20 bg-gradient-to-br from-sumi-800/80 to-sumi-900/80 p-5" style={{ animationDelay: "60ms" }}>
            <div className="flex items-center gap-2 text-kin-300"><Calendar className="h-4 w-4" /><span className="text-xs tracking-widest">{plan.date}</span></div>
            <h2 className="mt-1 font-display text-xl font-extrabold text-white">🎯 {plan.theme}</h2>
            {plan.summary && <p className="mt-1 text-sm text-sumi-300">{plan.summary}</p>}
            <p className="mt-2 text-xs text-sumi-500">สร้างจากเมนูจริง {plan.menuCount ?? 0} รายการ · โมเดล {plan.generatedBy}</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {plan.pieces.map((p, i) => {
              const key = "p" + i;
              return (
                <div key={key} className="animate-fade-up flex flex-col rounded-2xl border border-white/[0.07] bg-sumi-800/60 p-4" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center gap-2">
                    <span className={clsx("rounded-full border px-2.5 py-1 text-[11px] font-semibold", channelColor[p.channel] || "border-white/10 text-sumi-300")}>{p.channel}</span>
                    <span className="rounded-full bg-sumi-700/50 px-2 py-1 text-[11px] text-sumi-300"><Clock className="mr-1 inline h-3 w-3" />{p.postTime}</span>
                    <span className="rounded-full bg-sumi-700/50 px-2 py-1 text-[11px] uppercase text-sumi-400">{p.format}</span>
                    <span className="ml-auto truncate text-xs font-medium text-kin-300">{p.menu}</span>
                  </div>
                  {p.hook && <p className="mt-3 text-sm font-semibold text-white">🪝 {p.hook}</p>}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-sumi-100">{p.caption}</p>
                  {p.hashtags.length > 0 && <p className="mt-2 text-xs text-seiji-400">{p.hashtags.join(" ")}</p>}
                  {p.cta && <p className="mt-1.5 text-xs text-sumi-400">👉 {p.cta}</p>}
                  <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                    <button onClick={() => copyPiece(p, key)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-sumi-200 transition hover:bg-white/5">
                      {copied === key ? <Check className="h-3.5 w-3.5 text-seiji-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === key ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                    <button onClick={() => sendPiece(p, key)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#229ED9]/90 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#229ED9]">
                      {sState(key) === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {sState(key) === "sent" ? "ส่งแล้ว ✓" : "ส่งเข้า Telegram"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
