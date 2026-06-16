"use client";

/**
 * /control — ศูนย์คุมรวม (Master Control)
 * รวมสถานะทั้งระบบ + สั่งเครื่องหาเงิน + จัดการ key หาเงิน ไว้หน้าเดียว
 */
import { useEffect, useState, useCallback } from "react";
import {
  Activity, RefreshCw, Rocket, FlaskConical, Server, Coins,
  Link2, KeyRound, CheckCircle2, XCircle, Loader2, Save,
} from "lucide-react";
import { clsx } from "clsx";

interface MasterData {
  ok: boolean;
  ts: string;
  services: { name: string; label: string; active: boolean }[];
  income: { at: string | null; excerpt: string | null };
  affiliate: { invol: boolean; shopee: boolean; lazada: boolean; fb: boolean; earning: boolean };
  keys: Record<string, { present: boolean; editable: boolean }>;
  credit: { phaya_thb: number | null; openai: boolean };
  queue: { video: Record<string, number> | null; post: Record<string, number> | null };
}

const KEY_LABELS: Record<string, string> = {
  AFFILIATE_LINK_TEMPLATE: "ลิงก์ Affiliate (invol/Involve)",
  SHOPEE_AFFILIATE_ID: "Shopee Affiliate ID",
  LAZADA_AFFILIATE_ID: "Lazada Affiliate ID",
  FB_PAGE_ACCESS_TOKEN: "Facebook Page Token",
  TELEGRAM_BOT_TOKEN: "Telegram Bot Token",
  OPENAI_API_KEY: "OpenAI Key",
  PHAYA_API_KEY: "Phaya Key",
  XAI_API_KEY: "xAI / Grok Key",
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
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});

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

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 4000); };

  async function action(act: string, key?: string, value?: string) {
    setBusy(act + (key || ""));
    try {
      const r = await fetch("/api/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act, key, value }),
      });
      const j = await r.json();
      flash(j.ok ? (j.msg || "สำเร็จ") : `ผิดพลาด: ${j.error}`);
      setTimeout(load, 1500);
    } catch {
      flash("เชื่อมต่อไม่ได้");
    } finally {
      setBusy(null);
    }
  }

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

      {toast && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-sumi-900 text-white text-sm">{toast}</div>
      )}

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

        {/* MONEY MACHINE */}
        <section className="bg-white rounded-xl border border-sumi-200 p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-4 h-4 text-beni-500" />
            <h2 className="font-semibold text-sumi-900 text-sm">เครื่องหาเงิน (Auto-Income)</h2>
            <span className="ml-auto text-xs text-sumi-400">โพสต์ล่าสุด {timeAgo(data?.income.at || null)}</span>
          </div>

          {data?.income.excerpt && (
            <pre className="text-xs text-sumi-600 bg-washi-50 border border-sumi-100 rounded-lg p-3 mb-3 whitespace-pre-wrap font-sans max-h-32 overflow-auto">
              {data.income.excerpt}
            </pre>
          )}

          {/* readiness badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              ["invol/Involve", data?.affiliate.invol],
              ["Shopee", data?.affiliate.shopee],
              ["Lazada", data?.affiliate.lazada],
              ["FB Page", data?.affiliate.fb],
            ] as [string, boolean | undefined][]).map(([label, ok]) => (
              <span key={label} className={clsx(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border",
                ok ? "bg-seiji-50 border-seiji-200 text-seiji-700" : "bg-sumi-50 border-sumi-200 text-sumi-400"
              )}>
                {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {label}
              </span>
            ))}
          </div>

          {!data?.affiliate.earning && (
            <p className="text-xs text-kin-700 bg-kin-50 border border-kin-200 rounded-lg px-3 py-2 mb-3">
              ⚠️ ยังไม่มีลิงก์ affiliate จริง — โพสต์ตอนนี้เป็นลิงก์ค้นหา (ยังไม่ได้ค่าคอม). ใส่ลิงก์ invol ด้านล่างเมื่อได้มา (รอ ~48 ชม.)
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => action("post")}
              disabled={busy === "post"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-beni-600 text-white text-sm font-medium hover:bg-beni-500 disabled:opacity-50"
            >
              {busy === "post" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              โพสต์เดี๋ยวนี้
            </button>
            <button
              onClick={() => action("post_dry")}
              disabled={busy === "post_dry"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-sumi-300 text-sm font-medium text-sumi-700 hover:bg-sumi-50 disabled:opacity-50"
            >
              {busy === "post_dry" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              ทดลอง (ไม่โพสต์จริง)
            </button>
          </div>
          <p className="text-xs text-sumi-400 mt-2">ผลลัพธ์แสดงใน Telegram + รีเฟรชสถานะอัตโนมัติ</p>
        </section>

        {/* KEYS */}
        <section className="bg-white rounded-xl border border-sumi-200 p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-sumi-500" />
            <h2 className="font-semibold text-sumi-900 text-sm">จัดการคีย์หาเงิน</h2>
          </div>
          <div className="space-y-3">
            {data && Object.entries(data.keys).map(([k, v]) => (
              <div key={k} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 sm:w-64 flex-shrink-0">
                  <Dot ok={v.present} />
                  <span className="text-sm text-sumi-700">{KEY_LABELS[k] || k}</span>
                </div>
                {v.editable ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      placeholder={v.present ? "•••• (มีค่าแล้ว — พิมพ์ทับเพื่อเปลี่ยน)" : "ยังว่าง — วางค่าที่นี่"}
                      value={edit[k] ?? ""}
                      onChange={(e) => setEdit((s) => ({ ...s, [k]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-sumi-200 text-sm focus:outline-none focus:border-beni-400"
                    />
                    <button
                      onClick={() => action("set_env", k, edit[k] ?? "")}
                      disabled={busy === "set_env" + k || (edit[k] ?? "") === ""}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sumi-900 text-white text-xs hover:bg-sumi-800 disabled:opacity-40"
                    >
                      {busy === "set_env" + k ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} บันทึก
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-sumi-400 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> {v.present ? "ตั้งค่าแล้ว (แก้ผ่านระบบ)" : "ยังไม่ตั้งค่า"}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-sumi-400 mt-3">
            แก้ได้เฉพาะคีย์หาเงิน (affiliate/FB). คีย์ระบบหลักล็อกไว้กันพลาด — บอกผมถ้าต้องเปลี่ยน
          </p>
        </section>
      </div>
    </div>
  );
}
