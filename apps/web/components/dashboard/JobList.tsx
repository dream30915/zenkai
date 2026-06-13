"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2, Clock, Loader2, AlertCircle,
  RefreshCw, Download, Copy, Play, ChevronDown,
  ChevronUp, Sparkles, CreditCard, X,
} from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface Job {
  id: string;
  menu_name: string;
  menu_name_en?: string;
  price?: number;
  video_tier: "tier1" | "tier2" | "tier3";
  post_to: string[];
  status: "pending" | "processing" | "done" | "error" | "posted";
  video_url?: string;
  script?: string;
  error_message?: string;
  created_at: string;
}

interface ParsedScript {
  hook?: string;
  caption?: string;
  hashtags?: string;
  cta?: string;
}

function parseScript(script?: string): ParsedScript {
  if (!script) return {};
  try { return JSON.parse(script); } catch { return { caption: script.substring(0, 500) }; }
}

const TIER_LABEL: Record<string, string> = {
  tier1: "⚡ Seedance AI", tier2: "✨ Veo 3.1", tier3: "🎬 Veo Premium",
};

const STATUS = {
  pending:    { icon: Clock,        label: "รอคิว",         color: "text-sumi-500", bg: "bg-sumi-100" },
  processing: { icon: Loader2,      label: "กำลังสร้าง",    color: "text-blue-600", bg: "bg-blue-50", spin: true },
  done:       { icon: CheckCircle2, label: "เสร็จแล้ว",     color: "text-seiji-600", bg: "bg-seiji-100" },
  error:      { icon: AlertCircle,  label: "ผิดพลาด",       color: "text-beni-600",  bg: "bg-beni-50" },
  posted:     { icon: CheckCircle2, label: "โพสต์แล้ว",     color: "text-kin-600",   bg: "bg-kin-50" },
} as const;

// ─── Video Modal ──────────────────────────────────────────────
function VideoModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="relative w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <video src={url} controls autoPlay playsInline
          className="w-full rounded-2xl shadow-2xl aspect-[9/16] bg-black" />
        <a href={url} download={`${name}.mp4`}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-beni-600 hover:bg-beni-500 text-white text-sm font-bold py-3.5 rounded-xl transition-all">
          <Download className="w-4 h-4" /> ดาวน์โหลดวิดีโอ
        </a>
      </div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────
function JobCard({ job }: { job: Job }) {
  const cfg = STATUS[job.status] ?? STATUS.pending;
  const Icon = cfg.icon;
  const [showVideo, setShowVideo] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const parsed = parseScript(job.script);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const fullCaption = [parsed.hook, parsed.caption, parsed.hashtags, parsed.cta]
    .filter(Boolean).join("\n\n");

  return (
    <>
      {showVideo && job.video_url && (
        <VideoModal url={job.video_url} name={job.menu_name} onClose={() => setShowVideo(false)} />
      )}

      <div className="bg-white rounded-2xl border border-washi-200 shadow-sm overflow-hidden">

        {/* ── Header row ── */}
        <div className="flex gap-0">
          {/* Thumbnail */}
          <div
            className={clsx(
              "w-24 flex-shrink-0 relative overflow-hidden",
              job.video_url ? "cursor-pointer" : "bg-washi-100",
            )}
            style={{ minHeight: 96 }}
            onClick={() => job.video_url && setShowVideo(true)}>
            {job.video_url ? (
              <>
                <video src={job.video_url} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 bg-sumi-900/40 flex items-center justify-center hover:bg-sumi-900/20 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon className={clsx("w-6 h-6", cfg.color, "spin" in cfg && cfg.spin && "animate-spin")} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <h3 className="font-bold text-sumi-900 text-sm truncate">{job.menu_name}</h3>
                {job.menu_name_en && (
                  <p className="text-sumi-400 text-xs">{job.menu_name_en}</p>
                )}
              </div>
              <span className={clsx(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0",
                cfg.bg, cfg.color,
              )}>
                <Icon className={clsx("w-3 h-3", "spin" in cfg && cfg.spin && "animate-spin")} />
                {cfg.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sumi-400">
              <span>{TIER_LABEL[job.video_tier] || job.video_tier}</span>
              {job.price && <><span>·</span><span className="font-medium">฿{job.price.toLocaleString()}</span></>}
              <span>·</span>
              <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: th })}</span>
            </div>

            {/* Error msg */}
            {job.status === "error" && (
              <div className="mt-2 px-3 py-2 bg-beni-50 border border-beni-100 rounded-xl">
                <p className="text-xs text-beni-600 font-medium">
                  {job.error_message?.includes("402")
                    ? "⚠️ เครดิต Phaya ไม่พอ — เติมเครดิตที่ phaya.io"
                    : job.error_message || "เกิดข้อผิดพลาด"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Caption preview ── */}
        {parsed.caption && (
          <div className="border-t border-washi-100">
            <button
              onClick={() => setShowCaption(s => !s)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-washi-50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-beni-400 flex-shrink-0" />
                <p className="text-xs text-sumi-500 font-medium truncate">
                  {parsed.caption.substring(0, 60)}...
                </p>
              </div>
              {showCaption
                ? <ChevronUp className="w-3.5 h-3.5 text-sumi-400 flex-shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-sumi-400 flex-shrink-0" />}
            </button>

            {showCaption && (
              <div className="px-4 pb-4 space-y-3">
                {parsed.hook && (
                  <div className="bg-beni-50 border border-beni-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-beni-400 uppercase tracking-widest mb-1">Hook (3 วิแรก)</p>
                    <p className="text-sm text-sumi-800 leading-relaxed">{parsed.hook}</p>
                  </div>
                )}
                {parsed.caption && (
                  <div className="bg-washi-50 border border-washi-200 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-sumi-400 uppercase tracking-widest mb-1">Caption</p>
                    <p className="text-sm text-sumi-800 leading-relaxed whitespace-pre-wrap">{parsed.caption}</p>
                  </div>
                )}
                {parsed.hashtags && (
                  <div className="bg-kin-50 border border-kin-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-kin-500 uppercase tracking-widest mb-1">Hashtags</p>
                    <p className="text-xs text-kin-700 leading-relaxed">{parsed.hashtags}</p>
                  </div>
                )}
                {parsed.cta && (
                  <div className="bg-seiji-50 border border-seiji-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-seiji-500 uppercase tracking-widest mb-1">Call to Action</p>
                    <p className="text-sm text-sumi-800">{parsed.cta}</p>
                  </div>
                )}
                <button
                  onClick={() => copy(fullCaption, "all")}
                  className={clsx(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all",
                    copied === "all"
                      ? "bg-seiji-100 text-seiji-700"
                      : "bg-sumi-900 text-white hover:bg-sumi-800"
                  )}>
                  <Copy className="w-3.5 h-3.5" />
                  {copied === "all" ? "คัดลอกแล้ว ✓" : "คัดลอกทั้งหมด"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Action buttons ── */}
        {job.status === "done" && job.video_url && (
          <div className="border-t border-washi-100 flex">
            <button
              onClick={() => setShowVideo(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-sumi-700 hover:bg-washi-50 transition-colors border-r border-washi-100">
              <Play className="w-3.5 h-3.5 fill-sumi-700" /> ดูวิดีโอ
            </button>
            <a href={job.video_url} download={`${job.menu_name}.mp4`}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-sumi-700 hover:bg-washi-50 transition-colors border-r border-washi-100">
              <Download className="w-3.5 h-3.5" /> บันทึก
            </a>
            {fullCaption && (
              <button
                onClick={() => copy(fullCaption, "btn")}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors",
                  copied === "btn" ? "text-seiji-600 bg-seiji-50" : "text-sumi-700 hover:bg-washi-50"
                )}>
                <Copy className="w-3.5 h-3.5" />
                {copied === "btn" ? "แล้ว ✓" : "Caption"}
              </button>
            )}
          </div>
        )}

        {/* Credit top-up hint */}
        {job.status === "error" && job.error_message?.includes("402") && (
          <div className="border-t border-washi-100 px-4 py-3">
            <a href="https://phaya.io" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-kin-600 hover:bg-kin-500 text-white text-xs font-bold rounded-xl transition-all">
              <CreditCard className="w-3.5 h-3.5" /> เติมเครดิต Phaya.io
            </a>
          </div>
        )}
      </div>
    </>
  );
}

export default function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs?limit=20&offset=0");
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchJobs();
    const t = setInterval(fetchJobs, 8000);
    return () => clearInterval(t);
  }, [fetchJobs]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-6 h-6 text-beni-400 animate-spin" />
    </div>
  );

  if (jobs.length === 0) return (
    <div className="bg-white rounded-2xl border border-washi-200 p-12 text-center">
      <p className="text-4xl mb-3">🍣</p>
      <p className="text-sumi-700 font-semibold text-sm">ยังไม่มีงาน</p>
      <p className="text-sumi-400 text-xs mt-1">กดสร้างวิดีโอแรกได้เลย</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-sumi-500">ทั้งหมด {total} งาน</p>
        <button onClick={fetchJobs}
          className="flex items-center gap-1.5 text-xs text-sumi-400 hover:text-sumi-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช
        </button>
      </div>
      <div className="space-y-3">
        {jobs.map(job => <JobCard key={job.id} job={job} />)}
      </div>
    </div>
  );
}
