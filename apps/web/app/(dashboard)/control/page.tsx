"use client";

/**
 * /control — ศูนย์คุมรวมของ "แอป Zenkai (ร้านอาหาร)"
 * บริการระบบ + เครดิต/สมอง AI + คิวงาน + คีย์ระบบ (อ่านอย่างเดียว)
 *
 * ⚠️ เครื่อง affiliate / auto-income แยกออกไปแล้ว — คนละโปรเจกต์ ไม่เกี่ยวกับร้าน
 */
import { useEffect, useState, useCallback } from "react";
import { Activity, RefreshCw, Server, Coins, KeyRound } from "lucide-react";
import { clsx } from "clsx";

interface MasterData {
  ok: boolean;
  ts: string;
  services: { name: string; label: string; active: boolean }[];
  keys: Record<string, { present: boolean }>;
  credit: { phaya_thb: number | null; openai: boolean };
  queue: { video: Record<string, number> | null; post: Record<string, number> | null };
}

const KEY_LABELS: Record<string, string> = {
  OPENAI_API_KEY: "OpenAI Key",
  PHAYA_API_KEY: "Phaya Key",
  TELEGRAM_BOT_TOKEN: "Telegram Bot Token",
};

function Dot({ ok }: { ok: boolean }) {
  return (
    <span className={clsx("inline-block w-2.5 h-2.5 rounded-full", ok ? "bg-seiji-500" : "bg-beni-500")} />
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อกี้";
  if (m < 60) return `${m} นาทีก่อน`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ก่อน`;
  return `${Math.floor(h / 24)} วันก่อน`;
}

export default function ControlPage() {
  const [data, setData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/master")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const credit = data?.credit.phaya_thb;
  const lowCredit = typeof credit === "number" && credit < 3;

  return (
    <div className="min-h-screen bg-washi-50 p-5 md:p-8 max-w-5xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sumi-900 flex items-center justify-center">
            <Activity className="w-5 h-5 text-beni-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sumi-900">ศูนย์คุมรวม</h1>
            <p className="text-xs text-sumi-500">Master Control · อัปเดต {data ? timeAgo(data.ts) : "…"}</p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-sumi-200 text-sm text-sumi-700 hover:bg-sumi-50"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} /> รีเฟรช
        </button>
      </div>

      {/* grid */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* SERVICES */}
        <section className="bg-white rounded-xl border border-sumi-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-sumi-500" />
            <h2 className="font-semibold text-sumi-900 text-sm">บริการระบบ</h2>
          </div>
          <div className="space-y-2">
            {data?.services.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="text-sumi-700">{s.label}</span>
                <span className="flex items-center gap-2">
                  <Dot ok={s.active} />
                  <span className={clsx("text-xs", s.active ? "text-seiji-600" : "text-beni-600")}>
                    {s.active ? "ทำงาน" : "หยุด"}
                  </span>
                </span>
              </div>
            )) || <p className="text-sm text-sumi-400">กำลังโหลด…</p>}
          </div>
        </section>

        {/* CREDIT */}
        <section className="bg-white rounded-xl border border-sumi-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-sumi-500" />
            <h2 className="font-semibold text-sumi-900 text-sm">เครดิต & สมอง AI</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-sumi-700">เครดิต Phaya</span>
              <span className={clsx("font-semibold", lowCredit ? "text-beni-600" : "text-seiji-600")}>
                {typeof credit === "number" ? `${credit.toFixed(2)} ฿` : "—"}{lowCredit ? " ⚠️" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sumi-700">OpenAI (สมองสำรอง)</span>
              <span className="flex items-center gap-2">
                <Dot ok={!!data?.credit.openai} />
                <span className="text-xs text-sumi-500">{data?.credit.openai ? "พร้อม" : "ไม่มีคีย์"}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sumi-700">คิววิดีโอ</span>
              <span className="text-xs text-sumi-500">
                รอ {data?.queue.video?.waiting ?? "—"} · ทำ {data?.queue.video?.active ?? 0}
              </span>
            </div>
          </div>
        </section>

        {/* SYSTEM KEYS (read-only) */}
        <section className="bg-white rounded-xl border border-sumi-200 p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-sumi-500" />
            <h2 className="font-semibold text-sumi-900 text-sm">คีย์ระบบ</h2>
          </div>
          <div className="space-y-2">
            {data && Object.entries(data.keys).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-sumi-700">{KEY_LABELS[k] || k}</span>
                <span className="flex items-center gap-2">
                  <Dot ok={v.present} />
                  <span className="text-xs text-sumi-500">{v.present ? "ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-sumi-400 mt-3">
            แอปนี้สำหรับร้าน Zenkai เท่านั้น · เครื่อง affiliate/auto-income เป็นคนละระบบ แยกออกไปแล้ว
          </p>
        </section>
      </div>
    </div>
  );
}
