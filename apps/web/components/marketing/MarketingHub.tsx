"use client";

import { useState } from "react";
import { CalendarDays, RefreshCw, Send, Sparkles, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";

interface ContentPlan {
  date: string;
  platform: "facebook" | "instagram" | "tiktok" | "line";
  menuName: string;
  caption: string;
  hashtags: string[];
  suggestedPostTime: string;
}

interface MarketingPlan {
  createdAt: string;
  plans: ContentPlan[];
}

const PLATFORM_STYLES: Record<string, string> = {
  facebook:  "text-blue-400 bg-blue-400/10 border-blue-400/30",
  instagram: "text-pink-400 bg-pink-400/10 border-pink-400/30",
  tiktok:    "text-white bg-sumi-700 border-sumi-500",
  line:      "text-seiji-400 bg-seiji-400/10 border-seiji-400/30",
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook:  "Facebook",
  instagram: "Instagram",
  tiktok:    "TikTok",
  line:      "LINE OA",
};

export default function MarketingHub() {
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishingIdx, setPublishingIdx] = useState<number | null>(null);
  const [published, setPublished] = useState<Set<number>>(new Set());

  async function generatePlan() {
    setLoading(true);
    setPlan(null);
    setPublished(new Set());
    try {
      const res = await fetch("/api/marketing/plan", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPlan(data);
      toast.success("สร้างแผนคอนเทนต์สำเร็จ");
    } catch (err: any) {
      toast.error("ไม่สามารถสร้างแผนได้: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function publishItem(idx: number, item: ContentPlan) {
    setPublishingIdx(idx);
    try {
      const res = await fetch("/api/marketing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      if (data.delivered === false) {
        toast.error("ยังไม่ได้ตั้งค่า MAKE_WEBHOOK_URL");
      } else {
        setPublished((prev) => new Set(prev).add(idx));
        toast.success(`ส่ง ${PLATFORM_LABELS[item.platform]} สำเร็จ`);
      }
    } catch (err: any) {
      toast.error("ส่งไม่สำเร็จ: " + err.message);
    } finally {
      setPublishingIdx(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-beni-400" />
            Marketing Hub
          </h1>
          <p className="text-sm text-sumi-400 mt-1">สร้างแผนคอนเทนต์ AI + ส่งโซเชียลผ่าน Make.com</p>
        </div>
        <button
          onClick={generatePlan}
          disabled={loading}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            loading
              ? "bg-sumi-700 text-sumi-400 cursor-not-allowed"
              : "bg-beni-600 hover:bg-beni-500 text-white"
          )}
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          {loading ? "กำลังสร้าง..." : "สร้างแผนวันนี้"}
        </button>
      </div>

      {/* Empty state */}
      {!plan && !loading && (
        <div className="bg-sumi-800 border border-sumi-700 rounded-xl p-10 text-center">
          <CalendarDays className="w-10 h-10 text-sumi-600 mx-auto mb-3" />
          <p className="text-sumi-400 text-sm">กดปุ่ม &ldquo;สร้างแผนวันนี้&rdquo; เพื่อให้ AI วางแผนคอนเทนต์ 4 ช่องทาง</p>
          <p className="text-sumi-600 text-xs mt-1">ใช้เมนูจริง 26 รายการ · ส่ง Telegram ให้อนุมัติก่อนโพสต์จริง</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-sumi-800 border border-sumi-700 rounded-xl p-10 text-center">
          <div className="w-8 h-8 border-2 border-beni-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sumi-300 text-sm">AI กำลังวางแผนคอนเทนต์...</p>
        </div>
      )}

      {/* Plan cards */}
      {plan && (
        <div className="space-y-4">
          <p className="text-xs text-sumi-500">
            สร้างเมื่อ {new Date(plan.createdAt).toLocaleString("th-TH")} · {plan.plans.length} ชิ้น
          </p>
          {plan.plans.map((item, idx) => {
            const isPub = published.has(idx);
            const isPublishing = publishingIdx === idx;
            return (
              <div
                key={idx}
                className={clsx(
                  "bg-sumi-800 border rounded-xl p-5 space-y-3 transition-all",
                  isPub ? "border-seiji-600/50 opacity-70" : "border-sumi-700"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={clsx(
                      "text-xs font-bold px-2.5 py-1 rounded-full border",
                      PLATFORM_STYLES[item.platform]
                    )}
                  >
                    {PLATFORM_LABELS[item.platform]}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-sumi-500">
                    <Clock className="w-3 h-3" />
                    {item.suggestedPostTime} · {item.menuName}
                  </div>
                </div>

                <p className="text-sm text-sumi-200 leading-relaxed">{item.caption}</p>

                <p className="text-xs text-sumi-500">{item.hashtags.join(" ")}</p>

                <div className="flex justify-end">
                  {isPub ? (
                    <span className="flex items-center gap-1.5 text-xs text-seiji-400">
                      <CheckCircle2 className="w-4 h-4" />
                      ส่งแล้ว
                    </span>
                  ) : (
                    <button
                      onClick={() => publishItem(idx, item)}
                      disabled={isPublishing}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        isPublishing
                          ? "bg-sumi-700 text-sumi-400"
                          : "bg-beni-600 hover:bg-beni-500 text-white"
                      )}
                    >
                      <Send className={clsx("w-3 h-3", isPublishing && "animate-pulse")} />
                      {isPublishing ? "กำลังส่ง..." : "ส่งโซเชียล"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Make.com notice */}
      <div className="bg-sumi-900 border border-sumi-800 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-kin-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-sumi-400">
          ปุ่ม &ldquo;ส่งโซเชียล&rdquo; ยิงไป Make.com webhook จากนั้น Make.com จัดการโพสต์จริงให้
          ถ้ายังไม่ตั้งค่า{" "}
          <code className="text-kin-300">MAKE_WEBHOOK_URL</code>{" "}
          จะแสดงข้อความแจ้งเตือนแต่ไม่ crash
        </p>
      </div>
    </div>
  );
}
