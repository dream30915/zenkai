import Link from "next/link";
import { Upload, BookOpen, Briefcase, BarChart2, ArrowRight } from "lucide-react";

export const metadata = { title: "全開 Zenkai — AI Content Studio" };

const ACTIONS = [
  {
    href: "/upload",
    icon: Upload,
    label: "สร้างวิดีโอ",
    sub: "อัพรูป → ได้คลิปใน 10 วิ",
    accent: "border-beni-500",
    iconBg: "bg-beni-50 text-beni-600",
    badge: "หลัก",
    badgeColor: "bg-beni-500 text-white",
  },
  {
    href: "/menus",
    icon: BookOpen,
    label: "คลังเมนู",
    sub: "จัดการเมนูประจำร้าน",
    accent: "border-kin-400",
    iconBg: "bg-kin-50 text-kin-600",
    badge: null,
    badgeColor: "",
  },
  {
    href: "/jobs",
    icon: Briefcase,
    label: "งานทั้งหมด",
    sub: "ดูคลิปที่สร้างแล้ว",
    accent: "border-sumi-400",
    iconBg: "bg-sumi-100 text-sumi-600",
    badge: null,
    badgeColor: "",
  },
  {
    href: "/analytics",
    icon: BarChart2,
    label: "Analytics",
    sub: "สถิติการใช้งาน",
    accent: "border-seiji-500",
    iconBg: "bg-seiji-100 text-seiji-600",
    badge: null,
    badgeColor: "",
  },
];

const PIPELINE = [
  { icon: "📸", label: "ถ่ายรูป" },
  { icon: "🤖", label: "AI Script" },
  { icon: "🎬", label: "สร้างคลิป" },
  { icon: "🔊", label: "เสียงพากย์" },
  { icon: "📲", label: "โพสต์" },
];

export default function DashboardHome() {
  return (
    <div className="min-h-screen bg-washi-50">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-sumi-900 px-6 pt-10 pb-12 md:px-12 md:pt-14 md:pb-16">
        {/* dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle, #C9A84C 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }} />
        {/* vermilion glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-beni-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-beni-600/20 border border-beni-500/30 rounded-full text-xs font-medium text-beni-300 mb-5 tracking-wide">
            <span className="w-1.5 h-1.5 bg-beni-400 rounded-full animate-pulse" />
            AI สร้างคอนเทนต์ร้านอาหารญี่ปุ่น
          </div>

          <div className="flex items-start gap-4 mb-3">
            <div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
                全開
              </h1>
              <div className="w-12 h-0.5 bg-beni-500 mt-2 mb-1" />
              <p className="text-kin-400 font-semibold text-xl tracking-widest uppercase">Zenkai</p>
            </div>
          </div>

          <p className="text-sumi-300 text-base md:text-lg mt-4 mb-7 max-w-md leading-relaxed">
            ถ่ายรูปอาหาร → AI เขียนสคริปต์ → ได้คลิปพร้อมโพสต์<br />
            <span className="text-sumi-400 text-sm">TikTok · Reels · Facebook · YouTube Shorts</span>
          </p>

          <Link
            href="/upload"
            className="inline-flex items-center gap-2.5 bg-beni-600 hover:bg-beni-500 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-beni-900/40 active:scale-[0.98]"
          >
            <Upload className="w-4 h-4" />
            สร้างวิดีโอเลย
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="px-6 md:px-12 -mt-4 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ACTIONS.map(({ href, icon: Icon, label, sub, accent, iconBg, badge, badgeColor }) => (
            <Link
              key={href}
              href={href}
              className={`group relative bg-white rounded-2xl p-4 border-t-2 ${accent} shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}
            >
              {badge && (
                <span className={`absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                  {badge}
                </span>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <p className="font-semibold text-sumi-900 text-sm">{label}</p>
              <p className="text-sumi-400 text-xs mt-0.5 leading-relaxed">{sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Pipeline ── */}
      <div className="px-6 md:px-12 mt-8">
        <div className="bg-white rounded-2xl border border-washi-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-sumi-500 uppercase tracking-widest mb-4">Pipeline อัตโนมัติ</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {PIPELINE.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-sumi-900 flex items-center justify-center text-lg shadow-sm">
                    {s.icon}
                  </div>
                  <span className="text-[11px] text-sumi-500 whitespace-nowrap font-medium">{s.label}</span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className="flex items-center mb-4 mx-0.5">
                    <div className="w-3 h-px bg-sumi-200" />
                    <div className="w-1 h-1 rounded-full bg-beni-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tip banner ── */}
      <div className="px-6 md:px-12 mt-4 mb-8">
        <div className="bg-kin-50 border border-kin-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">💡</span>
          <div>
            <p className="text-sm font-semibold text-kin-700">เคล็ดลับ</p>
            <p className="text-xs text-kin-600 mt-0.5 leading-relaxed">
              ถ่ายรูปอาหารในแสงดี 3-5 รูป แล้วกด <strong>สร้างวิดีโอ</strong> ได้คลิปพร้อมโพสต์ใน 10 วินาที
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
