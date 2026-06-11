"use client";

import { useState } from "react";
import { Eye, EyeOff, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";

interface Section {
  title: string;
  description: string;
  link?: string;
  fields: Field[];
}

interface Field {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  required?: boolean;
  hint?: string;
}

const SECTIONS: Section[] = [
  {
    title: "Phaya.io (AI Video · TTS · Image)",
    description: "Thai AI Platform — ใช้แทน Kling + ElevenLabs + fal.ai ได้ในที่เดียว",
    link: "https://phaya.io/dashboard",
    fields: [
      { key: "PHAYA_API_KEY", label: "API Key", placeholder: "pk_...", secret: true, required: true,
        hint: "ดูได้ที่ phaya.io/dashboard → API Keys" },
    ],
  },
  {
    title: "Supabase",
    description: "ฐานข้อมูลและ Auth",
    link: "https://supabase.com/dashboard",
    fields: [
      { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Project URL", placeholder: "https://xxxx.supabase.co", required: true },
      { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Anon Key", placeholder: "eyJ...", secret: true, required: true },
      { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service Role Key", placeholder: "eyJ...", secret: true, required: true },
    ],
  },
  {
    title: "OpenAI",
    description: "สร้าง script และ caption",
    link: "https://platform.openai.com/api-keys",
    fields: [
      { key: "OPENAI_API_KEY", label: "API Key", placeholder: "sk-proj-...", secret: true, required: true },
    ],
  },
  {
    title: "fal.ai",
    description: "สร้างและปรับแต่งรูปอาหาร (Flux Pro)",
    link: "https://fal.ai/dashboard/keys",
    fields: [
      { key: "FAL_KEY", label: "API Key", placeholder: "...", secret: true },
    ],
  },
  {
    title: "Creatomate (Tier 1 — Template Video)",
    description: "วิดีโอแบบเร็ว ~10 วิ ราคาถูก",
    link: "https://creatomate.com/settings/api",
    fields: [
      { key: "CREATOMATE_API_KEY", label: "API Key", placeholder: "...", secret: true },
    ],
  },
  {
    title: "Kling AI (Tier 2 — AI Video)",
    description: "วิดีโอ AI จากรูปอาหาร",
    link: "https://klingai.com",
    fields: [
      { key: "KLING_API_KEY", label: "API Key", placeholder: "..." , secret: true },
      { key: "KLING_API_SECRET", label: "API Secret", placeholder: "...", secret: true },
    ],
  },
  {
    title: "ElevenLabs (TTS ภาษาไทย)",
    description: "เสียงพากย์ AI ภาษาไทย",
    link: "https://elevenlabs.io/app/settings/api-keys",
    fields: [
      { key: "ELEVENLABS_API_KEY", label: "API Key", placeholder: "...", secret: true },
      { key: "ELEVENLABS_VOICE_ID_TH", label: "Voice ID (Thai)", placeholder: "..." },
    ],
  },
  {
    title: "Cloudflare R2 (File Storage)",
    description: "เก็บรูปและวิดีโอ",
    link: "https://dash.cloudflare.com",
    fields: [
      { key: "R2_ACCOUNT_ID", label: "Account ID", placeholder: "..." },
      { key: "R2_ACCESS_KEY_ID", label: "Access Key ID", placeholder: "..." },
      { key: "R2_SECRET_ACCESS_KEY", label: "Secret Access Key", placeholder: "...", secret: true },
      { key: "R2_BUCKET_NAME", label: "Bucket Name", placeholder: "kaizen-media" },
      { key: "R2_PUBLIC_URL", label: "Public URL", placeholder: "https://pub-xxx.r2.dev" },
    ],
  },
  {
    title: "Telegram Bot",
    description: "แจ้งเตือนเจ้าของร้านเมื่อวิดีโอพร้อม",
    link: "https://t.me/BotFather",
    fields: [
      { key: "TELEGRAM_BOT_TOKEN", label: "Bot Token", placeholder: "...", secret: true },
      { key: "TELEGRAM_OWNER_CHAT_ID", label: "Owner Chat ID", placeholder: "123456789" },
    ],
  },
  {
    title: "LINE OA",
    description: "โพสต์ไปยัง LINE Official Account",
    link: "https://developers.line.biz",
    fields: [
      { key: "LINE_CHANNEL_ACCESS_TOKEN", label: "Channel Access Token", placeholder: "...", secret: true },
      { key: "LINE_CHANNEL_SECRET", label: "Channel Secret", placeholder: "...", secret: true },
    ],
  },
];

function FieldInput({ field, value, onChange }: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={field.secret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sakura-300 pr-10"
        />
        {field.secret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
    </div>
  );
}

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const setValue = (key: string, val: string) => setValues((v) => ({ ...v, [key]: val }));

  const handleSave = () => {
    const envLines = Object.entries(values)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const blob = new Blob([envLines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env.local";
    a.click();
    URL.revokeObjectURL(url);

    setSaved(true);
    toast.success("ดาวน์โหลด .env.local แล้ว — วางไว้ที่ apps/web/.env.local");
    setTimeout(() => setSaved(false), 3000);
  };

  const filledCount = SECTIONS.flatMap((s) => s.fields).filter((f) => values[f.key]?.trim()).length;
  const requiredFields = SECTIONS.flatMap((s) => s.fields).filter((f) => f.required);
  const missingRequired = requiredFields.filter((f) => !values[f.key]?.trim());

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className={clsx(
        "p-4 rounded-2xl border flex items-start gap-3",
        missingRequired.length === 0
          ? "bg-green-50 border-green-200"
          : "bg-amber-50 border-amber-200"
      )}>
        {missingRequired.length === 0
          ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          : <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        }
        <div>
          <p className="text-sm font-medium text-gray-800">
            กรอกแล้ว {filledCount} / {SECTIONS.flatMap((s) => s.fields).length} ช่อง
          </p>
          {missingRequired.length > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">
              ยังขาด: {missingRequired.map((f) => f.label).join(", ")}
            </p>
          )}
        </div>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">{section.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
            </div>
            {section.link && (
              <a
                href={section.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-sakura-600 hover:underline"
              >
                ไปที่เว็บ <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="space-y-3">
            {section.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key] || ""}
                onChange={(v) => setValue(field.key, v)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-4">
        <button
          onClick={handleSave}
          className={clsx(
            "w-full py-4 rounded-2xl font-semibold text-white text-base transition-all shadow-lg",
            saved
              ? "bg-green-500"
              : "bg-sakura-500 hover:bg-sakura-600"
          )}
        >
          {saved ? "✓ ดาวน์โหลดแล้ว!" : "⬇ ดาวน์โหลด .env.local"}
        </button>
        <p className="text-xs text-center text-gray-400 mt-2">
          บันทึกไฟล์ไว้ที่ <code>apps/web/.env.local</code> แล้วรัน <code>npm run dev</code> ใหม่
        </p>
      </div>
    </div>
  );
}
