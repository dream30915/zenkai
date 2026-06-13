"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Sparkles,
  Film,
  Megaphone,
} from "lucide-react";
import { clsx } from "clsx";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
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
  | "idle"
  | "uploading"
  | "generating_script"
  | "generating_image"
  | "generating_video"
  | "queued"
  | "done"
  | "error";

const VIDEO_TIERS = [
  {
    value: "tier1",
    label: "Template (เร็ว)",
    desc: "Seedance AI — เหมือนถ่ายจริง (~6 เครดิต)",
    badge: "⚡ Fast",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    value: "tier2",
    label: "AI Video",
    desc: "Veo 3.1 — Google AI คุณภาพสูง (15 เครดิต)",
    badge: "✨ Quality",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  {
    value: "tier3",
    label: "Cinematic",
    desc: "Veo 3.1 Premium — ยาวสุด สวยสุด (15+ เครดิต)",
    badge: "🎬 Premium",
    badgeColor: "bg-amber-100 text-amber-700",
  },
] as const;

const PLATFORMS = [
  { value: "tiktok", label: "TikTok", emoji: "🎵" },
  { value: "instagram", label: "Instagram Reels", emoji: "📸" },
  { value: "facebook", label: "Facebook", emoji: "👥" },
  { value: "youtube", label: "YouTube Shorts", emoji: "▶️" },
  { value: "line", label: "LINE OA", emoji: "💬" },
];

const STATUS_STEPS: { key: JobStatus; label: string }[] = [
  { key: "uploading", label: "กำลังอัปโหลดรูป..." },
  { key: "generating_script", label: "AI กำลังเขียน script..." },
  { key: "generating_image", label: "กำลังปรับแต่งรูป..." },
  { key: "generating_video", label: "กำลังสร้างวิดีโอ..." },
  { key: "queued", label: "อยู่ในคิวโพสต์..." },
  { key: "done", label: "เสร็จเรียบร้อย! 🎉" },
];

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------
export default function MenuUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>("");

  const [form, setForm] = useState<MenuFormData>({
    menuName: "",
    menuNameEn: "",
    price: "",
    description: "",
    videoTier: "tier1",
    postTo: ["tiktok", "instagram"],
    scheduleType: "now",
  });

  // Drop zone
  const onDrop = useCallback((accepted: File[]) => {
    setFiles(accepted);
    const urls = accepted.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 5,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  // Form helpers
  const togglePlatform = (val: string) => {
    setForm((f) => ({
      ...f,
      postTo: f.postTo.includes(val)
        ? f.postTo.filter((p) => p !== val)
        : [...f.postTo, val],
    }));
  };

  // Submit
  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("กรุณาอัปโหลดรูปอาหารก่อน");
      return;
    }
    if (!form.menuName.trim()) {
      toast.error("กรุณาใส่ชื่อเมนู");
      return;
    }
    if (form.postTo.length === 0) {
      toast.error("กรุณาเลือกแพลตฟอร์มอย่างน้อย 1 อัน");
      return;
    }

    try {
      setStatus("uploading");

      // Step 1: Upload images
      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      Object.entries(form).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          formData.append(k, JSON.stringify(v));
        } else {
          formData.append(k, String(v));
        }
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }

      const data = await res.json();
      setJobId(data.jobId);
      setGeneratedScript(data.script || "");
      setStatus("queued");

      toast.success("ส่งงานเรียบร้อย! กำลังประมวลผล...", {
        description: `Job ID: ${data.jobId}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setStatus("error");
      toast.error(message);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setPreviews([]);
    setStatus("idle");
    setJobId(null);
    setGeneratedScript("");
    setForm({
      menuName: "",
      menuNameEn: "",
      price: "",
      description: "",
      videoTier: "tier1",
      postTo: ["tiktok", "instagram"],
      scheduleType: "now",
    });
  };

  // ----------------------------------------------------------------
  // Render: Done state
  // ----------------------------------------------------------------
  if (status === "done" || status === "queued") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {status === "done" ? "เสร็จเรียบร้อย! 🎉" : "อยู่ในคิวแล้ว ✅"}
        </h2>
        {jobId && (
          <p className="text-sm text-gray-500">Job ID: {jobId}</p>
        )}
        {generatedScript && (
          <div className="text-left bg-gray-50 rounded-xl p-4 mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Script ที่ AI สร้าง:
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {generatedScript}
            </p>
          </div>
        )}
        <p className="text-sm text-gray-500">
          คุณจะได้รับการแจ้งเตือนผ่าน Telegram เมื่อวิดีโอพร้อม
        </p>
        <button
          onClick={resetForm}
          className="mt-2 px-6 py-2.5 bg-sakura-500 text-white rounded-xl text-sm font-medium hover:bg-sakura-600 transition-colors"
        >
          อัปโหลดเมนูถัดไป
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Render: Processing state
  // ----------------------------------------------------------------
  if (
    status === "uploading" ||
    status === "generating_script" ||
    status === "generating_image" ||
    status === "generating_video"
  ) {
    const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-6">
        <Loader2 className="w-10 h-10 text-sakura-500 animate-spin mx-auto" />
        <div className="space-y-3">
          {STATUS_STEPS.slice(0, 4).map((step, idx) => (
            <div
              key={step.key}
              className={clsx(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm",
                idx < currentIdx && "text-green-600",
                idx === currentIdx && "text-sakura-600 font-medium bg-sakura-50",
                idx > currentIdx && "text-gray-400"
              )}
            >
              {idx < currentIdx ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : idx === currentIdx ? (
                <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              ) : (
                <span className="w-4 h-4 flex-shrink-0 rounded-full border-2 border-current" />
              )}
              {step.label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Render: Main form
  // ----------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-sakura-500" />
          รูปอาหาร
        </h2>
        <div
          {...getRootProps()}
          className={clsx(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragActive
              ? "border-sakura-400 bg-sakura-50"
              : "border-gray-200 hover:border-sakura-300 hover:bg-gray-50"
          )}
        >
          <input {...getInputProps()} />
          {previews.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-lg overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`preview-${i}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-medium text-gray-600">
                ลากรูปมาวาง หรือคลิกเพื่อเลือก
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, WEBP — สูงสุด 5 รูป, 20MB ต่อรูป
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Menu Details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sakura-500" />
          รายละเอียดเมนู
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ชื่อเมนู (ภาษาไทย) *
            </label>
            <input
              type="text"
              value={form.menuName}
              onChange={(e) => setForm((f) => ({ ...f, menuName: e.target.value }))}
              placeholder="เช่น ราเมนซุปมิโซะ"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ชื่อเมนู (English)
            </label>
            <input
              type="text"
              value={form.menuNameEn}
              onChange={(e) => setForm((f) => ({ ...f, menuNameEn: e.target.value }))}
              placeholder="e.g. Miso Ramen"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ราคา (บาท)
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="เช่น 280"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300 focus:border-transparent"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              คำอธิบายเพิ่มเติม (ให้ AI ใช้เขียน script)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="เช่น ซุปมิโซะรสชาติเข้มข้น โทปปิ้งชาชูนุ่ม ไข่ออนเซ็น ใส่เส้นหนา..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300 focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Video Tier */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-sakura-500" />
          คุณภาพวิดีโอ
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {VIDEO_TIERS.map((tier) => (
            <button
              key={tier.value}
              onClick={() => setForm((f) => ({ ...f, videoTier: tier.value as MenuFormData["videoTier"] }))}
              className={clsx(
                "p-4 rounded-xl border-2 text-left transition-all",
                form.videoTier === tier.value
                  ? "border-sakura-400 bg-sakura-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <span
                className={clsx(
                  "inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2",
                  tier.badgeColor
                )}
              >
                {tier.badge}
              </span>
              <p className="font-medium text-sm text-gray-900">{tier.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{tier.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Platforms */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-sakura-500" />
          โพสต์ไปยัง
        </h2>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => togglePlatform(p.value)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                form.postTo.includes(p.value)
                  ? "border-sakura-400 bg-sakura-50 text-sakura-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <span>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Schedule */}
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="schedule"
              value="now"
              checked={form.scheduleType === "now"}
              onChange={() => setForm((f) => ({ ...f, scheduleType: "now" }))}
              className="accent-sakura-500"
            />
            <span className="text-sm text-gray-700">โพสต์ทันที</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="schedule"
              value="schedule"
              checked={form.scheduleType === "schedule"}
              onChange={() =>
                setForm((f) => ({ ...f, scheduleType: "schedule" }))
              }
              className="accent-sakura-500"
            />
            <span className="text-sm text-gray-700">ตั้งเวลา</span>
          </label>
          {form.scheduleType === "schedule" && (
            <input
              type="datetime-local"
              value={form.scheduleAt || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, scheduleAt: e.target.value }))
              }
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300"
            />
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={status !== "idle"}
        className="w-full py-4 bg-sakura-500 hover:bg-sakura-600 disabled:bg-gray-300 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
      >
        <Sparkles className="w-5 h-5" />
        สร้างวิดีโออัตโนมัติ
      </button>
    </div>
  );
}
