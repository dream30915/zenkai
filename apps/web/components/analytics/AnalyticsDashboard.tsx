"use client";

import { useEffect, useState } from "react";
import { Film, CheckCircle2, Clock, AlertCircle, TrendingUp, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface Stats {
  total: number;
  done: number;
  pending: number;
  error: number;
  byTier: { tier1: number; tier2: number; tier3: number };
  byPlatform: Record<string, number>;
  recent: Array<{ menu_name: string; status: string; created_at: string }>;
}

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  youtube: "▶️",
  line: "💬",
};

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs?limit=100")
      .then((r) => r.json())
      .then((data) => {
        const jobs = data.jobs || [];
        const s: Stats = {
          total: jobs.length,
          done: jobs.filter((j: any) => j.status === "done" || j.status === "posted").length,
          pending: jobs.filter((j: any) => j.status === "pending" || j.status === "processing").length,
          error: jobs.filter((j: any) => j.status === "error").length,
          byTier: {
            tier1: jobs.filter((j: any) => j.video_tier === "tier1").length,
            tier2: jobs.filter((j: any) => j.video_tier === "tier2").length,
            tier3: jobs.filter((j: any) => j.video_tier === "tier3").length,
          },
          byPlatform: jobs.reduce((acc: Record<string, number>, j: any) => {
            (j.post_to || []).forEach((p: string) => { acc[p] = (acc[p] || 0) + 1; });
            return acc;
          }, {}),
          recent: jobs.slice(0, 5),
        };
        setStats(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-sakura-400 animate-spin" />
    </div>
  );

  if (!stats || stats.total === 0) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-400 text-sm">ยังไม่มีข้อมูล — เริ่มสร้างวิดีโอแรกก่อนเลย!</p>
    </div>
  );

  const successRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "วิดีโอทั้งหมด", value: stats.total, icon: Film, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "เสร็จแล้ว", value: stats.done, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "รอดำเนินการ", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "เกิดข้อผิดพลาด", value: stats.error, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
              <Icon className={clsx("w-5 h-5", color)} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success rate */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">อัตราสำเร็จ</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={successRate >= 80 ? "#22c55e" : successRate >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3"
                  strokeDasharray={`${successRate} ${100 - successRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">
                {successRate}%
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-full" />{stats.done} เสร็จ</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-400 rounded-full" />{stats.pending} รอ</div>
              {stats.error > 0 && <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-400 rounded-full" />{stats.error} error</div>}
            </div>
          </div>
        </div>

        {/* By platform */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">แพลตฟอร์มที่โพสต์</h3>
          {Object.keys(stats.byPlatform).length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.byPlatform)
                .sort(([, a], [, b]) => b - a)
                .map(([platform, count]) => (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-lg">{PLATFORM_EMOJI[platform] || "📌"}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-gray-700">{platform}</span>
                        <span className="text-gray-500 text-xs">{count} วิดีโอ</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-1.5 bg-sakura-400 rounded-full transition-all"
                          style={{ width: `${Math.round((count / stats.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent jobs */}
      {stats.recent.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">งานล่าสุด</h3>
          <div className="space-y-3">
            {stats.recent.map((job, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={clsx(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  job.status === "done" || job.status === "posted" ? "bg-green-500" :
                  job.status === "error" ? "bg-red-400" : "bg-amber-400"
                )} />
                <span className="flex-1 text-gray-800 truncate">{job.menu_name}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(job.created_at).toLocaleDateString("th-TH")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
