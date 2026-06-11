import Link from "next/link";
import { Upload, BookOpen, Briefcase, BarChart2, Sparkles, Zap, Globe } from "lucide-react";

export const metadata = { title: "改善 Kaizen — Menu-to-Video Platform" };

const QUICK_ACTIONS = [
  {
    href: "/upload",
    icon: Upload,
    title: "สร้างวิดีโอใหม่",
    desc: "อัปโหลดรูปอาหาร → AI สร้างวิดีโอ",
    color: "from-sakura-500 to-sakura-600",
    textColor: "text-white",
  },
  {
    href: "/menus",
    icon: BookOpen,
    title: "คลังเมนู",
    desc: "จัดการเมนูและสร้างวิดีโอซ้ำ",
    color: "from-purple-500 to-purple-600",
    textColor: "text-white",
  },
  {
    href: "/jobs",
    icon: Briefcase,
    title: "งานทั้งหมด",
    desc: "ดูสถานะและประวัติการสร้างวิดีโอ",
    color: "from-blue-500 to-blue-600",
    textColor: "text-white",
  },
  {
    href: "/analytics",
    icon: BarChart2,
    title: "Analytics",
    desc: "ดูสถิติและประสิทธิภาพระบบ",
    color: "from-green-500 to-green-600",
    textColor: "text-white",
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI เขียน Script",
    desc: "GPT-4o เขียน TikTok/Reels script ภาษาไทยให้อัตโนมัติ",
  },
  {
    icon: Zap,
    title: "Video AI 3 ระดับ",
    desc: "เลือกได้ตั้งแต่ fast template → Sora 2 AI → cinematic premium",
  },
  {
    icon: Globe,
    title: "โพสต์ 5 แพลตฟอร์ม",
    desc: "TikTok, Instagram Reels, Facebook, YouTube Shorts, LINE OA",
  },
];

export default function DashboardHome() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sakura-50 border border-sakura-200 rounded-full text-xs font-medium text-sakura-600 mb-4">
          <span className="w-1.5 h-1.5 bg-sakura-500 rounded-full animate-pulse" />
          Powered by phaya.io · Sora 2 · GPT-4o
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          改善 Kaizen
        </h1>
        <p className="text-gray-500 text-lg">
          ถ่ายรูปอาหาร → AI สร้างวิดีโอ → โพสต์ทุกแพลตฟอร์มอัตโนมัติ
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {QUICK_ACTIONS.map(({ href, icon: Icon, title, desc, color }) => (
          <Link
            key={href}
            href={href}
            className={`bg-gradient-to-br ${color} rounded-2xl p-5 hover:scale-[1.02] transition-all shadow-sm`}
          >
            <Icon className="w-6 h-6 text-white mb-3 opacity-90" />
            <p className="font-semibold text-white text-sm">{title}</p>
            <p className="text-white/70 text-xs mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Features */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-5">ระบบทำงานอะไรบ้าง</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-9 h-9 bg-sakura-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-sakura-500" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline visual */}
      <div className="bg-gradient-to-r from-gray-50 to-sakura-50 border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Pipeline อัตโนมัติ</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { step: "1", label: "📸 ถ่ายรูปอาหาร" },
            { step: "→", label: "" },
            { step: "2", label: "🤖 AI เขียน Script" },
            { step: "→", label: "" },
            { step: "3", label: "🎬 Sora 2 สร้างวิดีโอ" },
            { step: "→", label: "" },
            { step: "4", label: "🔊 TTS เสียงพากย์ไทย" },
            { step: "→", label: "" },
            { step: "5", label: "📲 โพสต์ 5 แพลตฟอร์ม" },
          ].map(({ step, label }, i) =>
            label ? (
              <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2">
                <span className="w-5 h-5 bg-sakura-500 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {step}
                </span>
                <span className="text-sm text-gray-700 whitespace-nowrap">{label}</span>
              </div>
            ) : (
              <span key={i} className="text-gray-400 text-lg">→</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
