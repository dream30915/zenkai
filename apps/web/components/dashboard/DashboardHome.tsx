"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  Upload, BookOpen, Film, Coins, Sparkles, Send, ArrowRight,
  RefreshCw, Bot, CheckCircle2, Loader2, Clock, AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";

// ── types ──────────────────────────────────────────────
interface Status {
  phaya_credit_thb?: number | null;
  phaya_ready?: boolean;
  openai_ready?: boolean;
  queue_video?: { waiting?: number; active?: number; failed?: number };
  queue_post?: { waiting?: number; active?: number };
}
interface Job {
  id: string;
  menu_name?: string;
  status?: string;
  video_url?: string | null;
  created_at?: string;
}
interface Menu { id: string; name_th?: string; price?: number }

const fmtDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "full" });

function jobBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (["done", "completed", "posted"].includes(s)) return { cls: "bg-seiji-500/15 text-seiji-400 border-seiji-500/30", label: "เสร็จ", Icon: CheckCircle2 };
  if (["error", "failed"].includes(s)) return { cls: "bg-beni-500/15 text-beni-400 border-beni-500/30", label: "ผิดพลาด", Icon: AlertCircle };
  if (["processing", "active", "running"].includes(s)) return { cls: "bg-kin-400/15 text-kin-300 border-kin-400/30", label: "กำลังทำ", Icon: Loader2 };
  return { cls: "bg-sumi-600/30 text-sumi-300 border-sumi-600/40", label: status || "รอคิว", Icon: Clock };
}

// ── small ui ───────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, delay }: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: string; accent: string; delay: number;
}) {
  return (
    <div className="animate-fade-up rounded-2xl border border-white/[0.07] bg-sumi-800/60 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/15 hover:shadow-lg hover:shadow-black/30"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-sumi-300">{label}</span>
        <span className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", accent)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-sumi-400">{sub}</div>}
    </div>
  );
}

function ProBtn({ onClick, busy, children, variant = "primary", href }: {
  onClick?: () => void; busy?: boolean; children: React.ReactNode; variant?: "primary" | "telegram" | "ghost"; href?: string;
}) {
  const cls = clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60",
    variant === "primary" && "bg-beni-600 text-white hover:bg-beni-500 hover:shadow-lg hover:shadow-beni-900/40",
    variant === "telegram" && "bg-[#229ED9] text-white hover:bg-[#1d8bc0] hover:shadow-lg hover:shadow-[#229ED9]/30",
    variant === "ghost" && "border border-white/10 text-sumi-200 hover:bg-white/5",
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button onClick={onClick} disabled={busy} className={cls}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}</button>;
}

// ── main ───────────────────────────────────────────────
export default function DashboardHome() {
  const [status, setStatus] = useState<Status | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [menus, setMenus] = useState<Menu[] | null>(null);
  const [insight, setInsight] = useState<string>("");
  const [insightBusy, setInsightBusy] = useState(false);
  const [sentId, setSentId] = useState<string>("");

  const load = useCallback(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
    fetch("/api/jobs").then((r) => r.json()).then((d) => setJobs(d.jobs || d || [])).catch(() => setJobs([]));
    fetch("/api/menus").then((r) => r.json()).then((d) => setMenus(d.menus || [])).catch(() => setMenus([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const clipsDone = (jobs || []).filter((j) => j.video_url).length;
  const inQueue = (status?.queue_video?.waiting || 0) + (status?.queue_video?.active || 0);
  const credit = status?.phaya_credit_thb;

  const askInsight = async () => {
    setInsightBusy(true); setInsight(""); setSentId("");
    try {
      const r = await fetch("/api/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "manager", messages: [{ role: "user", content: "วันนี้ร้านควรโฟกัสทำคอนเทนต์/เมนูอะไร สรุปสั้นกระชับ 2-3 บรรทัด อิงข้อมูลจริงในระบบ" }] }),
      });
      setInsight((await r.text()).slice(0, 1500));
    } catch { setInsight("ขออภัย ดึงคำแนะนำไม่สำเร็จ ลองใหม่อีกครั้ง"); }
    finally { setInsightBusy(false); }
  };

  const sendToTelegram = async (text: string, label: string, key: string, imageUrl?: string) => {
    setSentId(key + ":sending");
    try {
      const r = await fetch("/api/telegram/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, label, imageUrl }),
      });
      setSentId(r.ok ? key + ":sent" : key + ":err");
    } catch { setSentId(key + ":err"); }
  };
  const tgState = (key: string) => sentId.startsWith(key + ":") ? sentId.split(":")[1] : "";

  return (
    <div className="min-h-screen bg-sumi-950 px-5 py-6 md:px-10 md:py-8">
      {/* glow */}
      <div className="pointer-events-none fixed right-0 top-0 h-96 w-96 rounded-full bg-beni-600/10 blur-[120px]" />

      {/* header */}
      <div className="animate-fade-up flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-kin-400">
          <span className="font-display text-lg font-black text-white">全開</span>
          <span className="tracking-widest">ZENKAI · อิซากะยะ บางแสน</span>
        </div>
        <h1 className="font-display text-2xl font-extrabold text-white md:text-3xl">สวัสดี, ร้าน Zenkai 👋</h1>
        <p className="text-sm text-sumi-400">{fmtDate.format(new Date())}</p>
      </div>

      {/* KPI cards — ข้อมูลจริงเท่านั้น */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="เมนูในระบบ" value={menus ? menus.length : "—"} sub="เมนูจริงของร้าน" accent="bg-kin-400/15 text-kin-300" delay={0} />
        <StatCard icon={Film} label="คลิปที่ทำแล้ว" value={jobs ? clipsDone : "—"} sub="วิดีโอพร้อมใช้" accent="bg-seiji-500/15 text-seiji-400" delay={60} />
        <StatCard icon={Clock} label="งานในคิว" value={jobs ? inQueue : "—"} sub="กำลังเรนเดอร์/รอ" accent="bg-beni-500/15 text-beni-400" delay={120} />
        <StatCard icon={Coins} label="เครดิต Phaya" value={credit != null ? `฿${Number(credit).toFixed(0)}` : "—"} sub={status?.phaya_ready ? "พร้อมใช้งาน" : "กำลังเช็ก"} accent="bg-kin-400/15 text-kin-300" delay={180} />
      </div>

      {/* main grid */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* AI insight */}
        <div className="animate-fade-up rounded-2xl border border-white/[0.07] bg-gradient-to-br from-sumi-800/80 to-sumi-900/80 p-5 lg:col-span-2" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-beni-600/20 text-beni-300"><Sparkles className="h-4 w-4" /></span>
              <h2 className="font-display font-bold text-white">ทีม AI แนะนำวันนี้</h2>
            </div>
            <button onClick={askInsight} disabled={insightBusy} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-sumi-200 transition hover:bg-white/5 disabled:opacity-60">
              {insightBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {insight ? "ขอใหม่" : "ขอคำแนะนำ"}
            </button>
          </div>
          <div className="mt-4 min-h-[88px] rounded-xl bg-black/20 p-4 text-sm leading-relaxed text-sumi-100">
            {insightBusy ? (
              <div className="space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-full animate-pulse rounded bg-white/10" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
              </div>
            ) : insight ? (
              <p className="whitespace-pre-wrap">{insight}</p>
            ) : (
              <p className="text-sumi-400">กด “ขอคำแนะนำ” ให้ผู้จัดการ AI วิเคราะห์ข้อมูลจริงแล้วเสนอว่าวันนี้ควรทำอะไร</p>
            )}
          </div>
          {insight && !insightBusy && (
            <div className="mt-3 flex items-center gap-2">
              <ProBtn variant="telegram" busy={tgState("insight") === "sending"} onClick={() => sendToTelegram(insight, "🤖 ทีม AI แนะนำวันนี้", "insight")}>
                <Send className="h-4 w-4" /> {tgState("insight") === "sent" ? "ส่งแล้ว ✓" : "ส่งเข้า Telegram"}
              </ProBtn>
              <ProBtn variant="ghost" href="/agent"><Bot className="h-4 w-4" /> คุยกับทีม AI</ProBtn>
            </div>
          )}
        </div>

        {/* quick actions */}
        <div className="animate-fade-up flex flex-col gap-3" style={{ animationDelay: "180ms" }}>
          <Link href="/upload" className="group flex items-center gap-3 rounded-2xl border border-beni-500/30 bg-beni-600/10 p-4 transition hover:bg-beni-600/20">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-beni-600 text-white"><Upload className="h-5 w-5" /></span>
            <div className="flex-1"><div className="font-semibold text-white">สร้างวิดีโอ</div><div className="text-xs text-sumi-400">อัปรูป → คลิปพร้อมโพสต์</div></div>
            <ArrowRight className="h-4 w-4 text-sumi-400 transition group-hover:translate-x-0.5 group-hover:text-white" />
          </Link>
          <Link href="/menus" className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-sumi-800/60 p-4 transition hover:border-white/15">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-kin-400/15 text-kin-300"><BookOpen className="h-5 w-5" /></span>
            <div className="flex-1"><div className="font-semibold text-white">คลังเมนู</div><div className="text-xs text-sumi-400">{menus ? `${menus.length} เมนู` : "จัดการเมนู"}</div></div>
            <ArrowRight className="h-4 w-4 text-sumi-400 transition group-hover:translate-x-0.5 group-hover:text-white" />
          </Link>
          <Link href="/agent" className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-sumi-800/60 p-4 transition hover:border-white/15">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-seiji-500/15 text-seiji-400"><Sparkles className="h-5 w-5" /></span>
            <div className="flex-1"><div className="font-semibold text-white">ทีม AI 11 คน</div><div className="text-xs text-sumi-400">ปรึกษา/วางแผน</div></div>
            <ArrowRight className="h-4 w-4 text-sumi-400 transition group-hover:translate-x-0.5 group-hover:text-white" />
          </Link>
        </div>
      </div>

      {/* recent jobs */}
      <div className="animate-fade-up mt-5 rounded-2xl border border-white/[0.07] bg-sumi-800/60 p-5" style={{ animationDelay: "240ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-white">งานล่าสุด</h2>
          <Link href="/jobs" className="text-xs text-kin-400 hover:text-kin-300">ดูทั้งหมด →</Link>
        </div>
        {!jobs ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : jobs.length === 0 ? (
          <p className="py-8 text-center text-sm text-sumi-400">ยังไม่มีงาน — เริ่มที่ “สร้างวิดีโอ”</p>
        ) : (
          <div className="divide-y divide-white/5">
            {jobs.slice(0, 6).map((j) => {
              const b = jobBadge(j.status);
              return (
                <div key={j.id} className="flex items-center gap-3 py-3">
                  <span className={clsx("flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium", b.cls)}>
                    <b.Icon className={clsx("h-3 w-3", b.label === "กำลังทำ" && "animate-spin")} /> {b.label}
                  </span>
                  <span className="flex-1 truncate text-sm text-sumi-100">{j.menu_name || j.id}</span>
                  {j.video_url && (
                    <>
                      <a href={j.video_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-sumi-200 transition hover:bg-white/5">▶ ดู</a>
                      <button onClick={() => sendToTelegram(`🎬 คลิปเมนู: ${j.menu_name || j.id}\n${j.video_url}`, "🎬 คลิปจากร้าน", "job-" + j.id)}
                        className="rounded-lg bg-[#229ED9]/90 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#229ED9]">
                        {tgState("job-" + j.id) === "sent" ? "✓" : <Send className="inline h-3 w-3" />}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
