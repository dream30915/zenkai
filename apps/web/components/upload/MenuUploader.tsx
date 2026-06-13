"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload, ImageIcon, Loader2, CheckCircle2,
  Sparkles, Film, Send, ChevronRight,
  X, Plus, Zap, Star, Crown, ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

interface MenuFormData {
  menuName: string;
  menuNameEn: string;
  price: string;
  description: string;
  videoTier: "tier1" | "tier2" | "tier3";
  postTo: string[];
  scheduleType: "now" | "schedule";
  scheduleAt?: string;
}

type JobStatus =
  | "idle" | "uploading" | "generating_script"
  | "generating_image" | "generating_video"
  | "queued" | "done" | "error";

const VIDEO_TIERS = [
  {
    value: "tier1", icon: Zap, label: "Seedance AI",
    desc: "เหมือนถ่ายจริง", credit: "6 เครดิต",
    color: "text-blue-400", border: "border-blue-500/50",
    bg: "bg-blue-500/10", activeBg: "bg-blue-500/20",
  },
  {
    value: "tier2", icon: Star, label: "Veo 3.1",
    desc: "Google AI คุณภาพสูง", credit: "15 เครดิต",
    color: "text-purple-400", border: "border-purple-500/50",
    bg: "bg-purple-500/10", activeBg: "bg-purple-500/20",
  },
  {
    value: "tier3", icon: Crown, label: "Veo Premium",
    desc: "ยาวสุด สวยสุด", credit: "15+ เครดิต",
    color: "text-kin-400", border: "border-kin-500/50",
    bg: "bg-kin-500/10", activeBg: "bg-kin-500/20",
  },
] as const;

const PLATFORMS = [
  { value: "tiktok",     label: "TikTok",     icon: "🎵" },
  { value: "instagram",  label: "Reels",       icon: "📸" },
  { value: "facebook",   label: "Facebook",    icon: "👥" },
  { value: "youtube",    label: "Shorts",      icon: "▶️" },
  { value: "line",       label: "LINE OA",     icon: "💬" },
];

const STEPS = [
  { id: 1, label: "รูปอาหาร", icon: ImageIcon },
  { id: 2, label: "รายละเอียด", icon: Sparkles },
  { id: 3, label: "คุณภาพ", icon: Film },
  { id: 4, label: "โพสต์", icon: Send },
];

export default function MenuUploader() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState("");

  const [form, setForm] = useState<MenuFormData>({
    menuName: "", menuNameEn: "", price: "", description: "",
    videoTier: "tier1", postTo: ["tiktok", "instagram"],
    scheduleType: "now",
  });

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(accepted);
    setPreviews(accepted.map(f => URL.createObjectURL(f)));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 5, maxSize: 20 * 1024 * 1024,
  });

  const removeImage = (i: number) => {
    setFiles(f => f.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const togglePlatform = (val: string) =>
    setForm(f => ({
      ...f,
      postTo: f.postTo.includes(val)
        ? f.postTo.filter(p => p !== val)
        : [...f.postTo, val],
    }));

  const handleSubmit = async () => {
    if (files.length === 0) { toast.error("กรุณาอัปโหลดรูปอาหาร"); return; }
    if (!form.menuName.trim()) { toast.error("กรุณาใส่ชื่อเมนู"); return; }
    if (form.postTo.length === 0) { toast.error("กรุณาเลือกแพลตฟอร์ม"); return; }

    try {
      setStatus("uploading");
      const formData = new FormData();
      files.forEach(f => formData.append("images", f));
      Object.entries(form).forEach(([k, v]) =>
        formData.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v))
      );
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Upload failed"); }
      const data = await res.json();
      setJobId(data.jobId);
      setGeneratedScript(data.script || "");
      setStatus("queued");
      toast.success("ส่งงานเรียบร้อย! กำลังประมวลผล...");
    } catch (err: unknown) {
      setStatus("error");
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const resetForm = () => {
    setFiles([]); setPreviews([]); setStatus("idle");
    setJobId(null); setGeneratedScript(""); setStep(1);
    setForm({ menuName: "", menuNameEn: "", price: "", description: "",
      videoTier: "tier1", postTo: ["tiktok", "instagram"], scheduleType: "now" });
  };

  // ── Done state ──────────────────────────────────────────────
  if (status === "done" || status === "queued") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 pb-24 md:pb-0">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-2xl bg-seiji-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-seiji-600" />
          </div>
          <h2 className="text-2xl font-black text-sumi-900 mb-2">อยู่ในคิวแล้ว ✅</h2>
          <p className="text-sumi-500 text-sm mb-2">
            AI กำลังสร้างวิดีโอให้ — จะแจ้งเตือนผ่าน Telegram เมื่อเสร็จ
          </p>
          {jobId && <p className="text-xs text-sumi-400 font-mono mb-6">#{jobId.slice(0,8)}</p>}
          {generatedScript && (
            <div className="text-left bg-washi-100 border border-washi-200 rounded-2xl p-4 mb-5">
              <p className="text-xs font-semibold text-sumi-500 uppercase tracking-widest mb-2">Caption ที่ AI สร้าง</p>
              <p className="text-sm text-sumi-700 whitespace-pre-wrap leading-relaxed">{generatedScript}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={resetForm}
              className="flex-1 py-3.5 bg-beni-600 hover:bg-beni-500 text-white font-bold rounded-xl transition-all">
              สร้างคลิปถัดไป
            </button>
            <Link href="/jobs"
              className="flex-1 py-3.5 bg-sumi-100 hover:bg-sumi-200 text-sumi-700 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5">
              ดูคิว <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Processing state ────────────────────────────────────────
  if (["uploading","generating_script","generating_image","generating_video"].includes(status)) {
    const steps = ["กำลังอัปโหลดรูป...","AI กำลังเขียน script...","ปรับแต่งรูปสำหรับ AI...","กำลังสร้างวิดีโอ..."];
    const idx = ["uploading","generating_script","generating_image","generating_video"].indexOf(status);
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-sumi-900 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-beni-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-sumi-900 mb-6">กำลังสร้างวิดีโอ...</h2>
          <div className="space-y-2 text-left">
            {steps.map((s, i) => (
              <div key={i} className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                i < idx && "text-seiji-600 bg-seiji-50",
                i === idx && "text-beni-600 bg-beni-50 font-semibold",
                i > idx && "text-sumi-400 bg-washi-100",
              )}>
                {i < idx ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  : i === idx ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                  : <span className="w-4 h-4 flex-shrink-0 rounded-full border-2 border-current" />}
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step indicator ──────────────────────────────────────────
  const canNext =
    (step === 1 && files.length > 0) ||
    (step === 2 && form.menuName.trim() !== "") ||
    (step === 3) || (step === 4);

  return (
    <div className="max-w-lg mx-auto pb-32 md:pb-8">

      {/* Steps */}
      <div className="flex items-center mb-6 px-1">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => done && setStep(s.id)}
                className={clsx(
                  "flex items-center gap-1.5 text-xs font-semibold transition-all",
                  active ? "text-beni-600" : done ? "text-seiji-600 cursor-pointer" : "text-sumi-300"
                )}>
                <div className={clsx(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  active ? "bg-beni-600 text-white" : done ? "bg-seiji-500 text-white" : "bg-washi-200 text-sumi-400"
                )}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={clsx("flex-1 h-px mx-2 transition-all", step > s.id ? "bg-seiji-400" : "bg-washi-200")} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: รูปอาหาร ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-sumi-900">อัพโหลดรูปอาหาร</h2>
            <p className="text-sm text-sumi-400 mt-1">แนะนำ 3-5 รูป หลายมุม เพื่อคลิปที่ดีที่สุด</p>
          </div>

          {/* Dropzone */}
          <div {...getRootProps()} className={clsx(
            "border-2 border-dashed rounded-2xl cursor-pointer transition-all",
            isDragActive ? "border-beni-400 bg-beni-50" : "border-washi-300 hover:border-beni-300 hover:bg-washi-100",
            files.length > 0 ? "p-4" : "p-10 text-center"
          )}>
            <input {...getInputProps()} />
            {previews.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={e => { e.stopPropagation(); removeImage(i); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-sumi-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    ><X className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
                {previews.length < 5 && (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-washi-300 flex items-center justify-center hover:border-beni-400 transition-colors">
                    <Plus className="w-6 h-6 text-sumi-400" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-sumi-900 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7 text-beni-400" />
                </div>
                <p className="font-semibold text-sumi-700 mb-1">ลากรูปมาวาง หรือแตะเพื่อเลือก</p>
                <p className="text-xs text-sumi-400">JPG, PNG, WEBP · สูงสุด 5 รูป · 20MB/รูป</p>
              </>
            )}
          </div>

          {/* Tips */}
          <div className="bg-kin-50 border border-kin-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-kin-700 mb-2">💡 เคล็ดลับได้คลิปสวย</p>
            <ul className="text-xs text-kin-600 space-y-1">
              <li>• แสงดี — ธรรมชาติหรือไฟขาวสะอาด</li>
              <li>• ถ่ายหลายมุม: บน 45° · ข้าง · ใกล้</li>
              <li>• จัดจานให้เรียบร้อยก่อนถ่ายทุกครั้ง</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Step 2: รายละเอียด ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-sumi-900">รายละเอียดเมนู</h2>
            <p className="text-sm text-sumi-400 mt-1">AI จะใช้ข้อมูลนี้เขียน caption และ hashtag ให้</p>
          </div>

          {[
            { label: "ชื่อเมนู (ไทย) *", key: "menuName", ph: "เช่น ซูชิแซลมอนพิเศษ", required: true },
            { label: "ชื่อเมนู (English)", key: "menuNameEn", ph: "Salmon Sushi", required: false },
          ].map(({ label, key, ph }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-sumi-600 mb-2 uppercase tracking-widest">{label}</label>
              <input
                type="text"
                value={form[key as keyof MenuFormData] as string}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full px-4 py-3.5 bg-white border border-washi-200 rounded-xl text-sm text-sumi-800 placeholder-sumi-300 focus:outline-none focus:border-beni-400 focus:ring-2 focus:ring-beni-100 transition-all"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold text-sumi-600 mb-2 uppercase tracking-widest">ราคา (บาท)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sumi-400 text-sm font-medium">฿</span>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="199"
                className="w-full pl-8 pr-4 py-3.5 bg-white border border-washi-200 rounded-xl text-sm text-sumi-800 placeholder-sumi-300 focus:outline-none focus:border-beni-400 focus:ring-2 focus:ring-beni-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-sumi-600 mb-2 uppercase tracking-widest">จุดเด่น (ไม่บังคับ)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="เช่น ปลาแซลมอนนำเข้าจากนอร์เวย์ สดใหม่ทุกวัน เนื้อนุ่ม ไขมันสูง..."
              rows={3}
              className="w-full px-4 py-3 bg-white border border-washi-200 rounded-xl text-sm text-sumi-800 placeholder-sumi-300 focus:outline-none focus:border-beni-400 focus:ring-2 focus:ring-beni-100 transition-all resize-none"
            />
          </div>
        </div>
      )}

      {/* ── Step 3: คุณภาพวิดีโอ ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-sumi-900">เลือกคุณภาพวิดีโอ</h2>
            <p className="text-sm text-sumi-400 mt-1">คุณภาพสูงขึ้น = ใช้เครดิตมากขึ้น</p>
          </div>

          <div className="space-y-3">
            {VIDEO_TIERS.map(t => {
              const active = form.videoTier === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, videoTier: t.value as MenuFormData["videoTier"] }))}
                  className={clsx(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                    active ? `${t.activeBg} ${t.border}` : "bg-white border-washi-200 hover:border-washi-300"
                  )}>
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", t.bg)}>
                    <t.icon className={clsx("w-5 h-5", t.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-sumi-900">{t.label}</p>
                      {t.value === "tier1" && <span className="text-[10px] bg-seiji-100 text-seiji-700 px-2 py-0.5 rounded-full font-bold">แนะนำ</span>}
                    </div>
                    <p className="text-xs text-sumi-400 mt-0.5">{t.desc}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={clsx("text-sm font-black", t.color)}>{t.credit}</p>
                    {active && <div className="w-5 h-5 rounded-full bg-beni-600 flex items-center justify-center ml-auto mt-1">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Credit info */}
          <div className="bg-sumi-900 rounded-2xl px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-sumi-400">เครดิตที่ใช้</p>
              <p className="text-white font-bold text-sm">
                {form.videoTier === "tier1" ? "~6" : form.videoTier === "tier2" ? "~15" : "15+"} เครดิต
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-sumi-400">ราคาต่อคลิป</p>
              <p className="text-kin-400 font-bold text-sm">
                {form.videoTier === "tier1" ? "~24" : form.videoTier === "tier2" ? "~60" : "60+"} บาท
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: แพลตฟอร์ม ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-sumi-900">โพสต์ไปยัง</h2>
            <p className="text-sm text-sumi-400 mt-1">เลือกแพลตฟอร์มที่ต้องการโพสต์คลิปนี้</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map(p => {
              const on = form.postTo.includes(p.value);
              return (
                <button
                  key={p.value}
                  onClick={() => togglePlatform(p.value)}
                  className={clsx(
                    "flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left",
                    on ? "border-beni-400 bg-beni-50" : "border-washi-200 bg-white hover:border-washi-300"
                  )}>
                  <span className="text-xl">{p.icon}</span>
                  <div className="flex-1">
                    <p className={clsx("text-sm font-bold", on ? "text-beni-700" : "text-sumi-700")}>{p.label}</p>
                  </div>
                  {on && <div className="w-5 h-5 rounded-full bg-beni-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>}
                </button>
              );
            })}
          </div>

          {/* Schedule */}
          <div className="bg-white border border-washi-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-sumi-600 uppercase tracking-widest mb-3">เวลาโพสต์</p>
            <div className="flex gap-3">
              {[{ v: "now", l: "โพสต์ทันที" }, { v: "schedule", l: "ตั้งเวลา" }].map(({ v, l }) => (
                <label key={v} className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-semibold",
                  form.scheduleType === v ? "border-beni-400 bg-beni-50 text-beni-700" : "border-washi-200 text-sumi-600"
                )}>
                  <input type="radio" name="schedule" value={v} checked={form.scheduleType === v}
                    onChange={() => setForm(f => ({ ...f, scheduleType: v as "now" | "schedule" }))}
                    className="hidden" />
                  {l}
                </label>
              ))}
            </div>
            {form.scheduleType === "schedule" && (
              <input type="datetime-local" value={form.scheduleAt || ""}
                onChange={e => setForm(f => ({ ...f, scheduleAt: e.target.value }))}
                className="w-full mt-3 px-4 py-3 border border-washi-200 rounded-xl text-sm focus:outline-none focus:border-beni-400 focus:ring-2 focus:ring-beni-100 transition-all" />
            )}
          </div>

          {/* Summary */}
          <div className="bg-sumi-900 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-sumi-400 uppercase tracking-widest mb-3">สรุปก่อนสร้าง</p>
            {[
              ["เมนู", form.menuName || "-"],
              ["ราคา", form.price ? `฿${form.price}` : "-"],
              ["คุณภาพ", VIDEO_TIERS.find(t => t.value === form.videoTier)?.label || "-"],
              ["แพลตฟอร์ม", form.postTo.length > 0 ? `${form.postTo.length} แพลตฟอร์ม` : "ยังไม่เลือก"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-sumi-400">{k}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 max-w-lg mx-auto">
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-none px-5 py-4 bg-white border border-washi-200 text-sumi-700 font-bold rounded-2xl hover:bg-washi-100 transition-all shadow-sm">
              ←
            </button>
          )}
          <button
            onClick={() => step < 4 ? setStep(s => s + 1) : handleSubmit()}
            disabled={!canNext || (step === 4 && form.postTo.length === 0)}
            className={clsx(
              "flex-1 py-4 font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg",
              canNext && !(step === 4 && form.postTo.length === 0)
                ? "bg-beni-600 hover:bg-beni-500 text-white shadow-beni-200"
                : "bg-sumi-200 text-sumi-400 cursor-not-allowed"
            )}>
            {step < 4 ? (
              <><span>ถัดไป</span><ChevronRight className="w-4 h-4" /></>
            ) : (
              <><Sparkles className="w-4 h-4" /><span>สร้างวิดีโอเลย</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
