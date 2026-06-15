"use client";

import { useEffect, useState, useCallback } from "react";
import { Bookmark, Copy, Check, Trash2, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

interface Caption { menu_name: string; caption: string; platform: string | null; ts: string; }

export default function CaptionsPage() {
  const [items, setItems] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/captions")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.captions) ? d.captions : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = async (c: Caption) => {
    try {
      await navigator.clipboard.writeText(c.caption);
      setCopied(c.ts);
      setTimeout(() => setCopied((p) => (p === c.ts ? null : p)), 1500);
    } catch { /* clipboard blocked */ }
  };

  const remove = async (c: Caption) => {
    if (!confirm("ลบแคปชั่นนี้?")) return;
    setItems((prev) => prev.filter((x) => x.ts !== c.ts)); // optimistic
    await fetch(`/api/captions?ts=${encodeURIComponent(c.ts)}`, { method: "DELETE" }).catch(() => {});
  };

  const menus = Array.from(new Set(items.map((i) => i.menu_name))).sort();
  const shown = filter ? items.filter((i) => i.menu_name === filter) : items;

  const fmt = (ts: string) => {
    try { return new Date(ts).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return ts; }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-beni-600" /> คลังแคปชั่น
          </h1>
          <p className="text-gray-500 mt-1">
            แคปชั่นที่ทีม AI บันทึกไว้ (ผ่านคำสั่ง “เก็บอันนี้”) — ก๊อปไปใช้ซ้ำได้เลย
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} /> รีเฟรช
        </button>
      </div>

      {/* Menu filter chips */}
      {menus.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter("")}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              !filter ? "bg-sumi-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            ทั้งหมด ({items.length})
          </button>
          {menus.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === m ? "bg-sumi-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {loading && items.length === 0 ? (
        <p className="text-gray-400 text-sm py-12 text-center">กำลังโหลด…</p>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <Bookmark className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">ยังไม่มีแคปชั่นที่บันทึกไว้</p>
          <p className="text-gray-400 text-sm mt-1">
            ไปที่ <span className="text-beni-600 font-medium">AI Agent</span> แล้วบอกก๊อปปี้ไรเตอร์ว่า “เก็บอันนี้ไว้”
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((c) => (
            <div
              key={c.ts}
              className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:border-beni-300 hover:shadow-sm transition-all flex flex-col"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-sumi-900 bg-kin-100 px-2 py-0.5 rounded-md">
                  {c.menu_name}
                </span>
                {c.platform && (
                  <span className="text-[10px] uppercase tracking-wide text-seiji-600 bg-seiji-50 px-1.5 py-0.5 rounded">
                    {c.platform}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed flex-1">{c.caption}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-[11px] text-gray-400">{fmt(c.ts)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copy(c)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-beni-600 px-2 py-1 rounded-md hover:bg-beni-50 transition-colors"
                  >
                    {copied === c.ts ? <><Check className="w-3.5 h-3.5" /> คัดลอกแล้ว</> : <><Copy className="w-3.5 h-3.5" /> คัดลอก</>}
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="text-gray-400 hover:text-beni-600 p-1 rounded-md hover:bg-beni-50 transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
