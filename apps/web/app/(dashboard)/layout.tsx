"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, Upload, BookOpen, Briefcase, BarChart2, Settings, HelpCircle, Sparkles, CalendarDays, CreditCard } from "lucide-react";
import { clsx } from "clsx";

interface LiveStatus {
  phaya_credit_thb?: number | null;
  queue_video?: { waiting?: number; active?: number; failed?: number };
  queue_post?: { waiting?: number; active?: number };
}

const navItems = [
  { href: "/",          icon: Home,        label: "หน้าหลัก",    exact: true },
  { href: "/upload",    icon: Upload,      label: "สร้างวิดีโอ" },
  { href: "/menus",     icon: BookOpen,    label: "คลังเมนู"   },
  { href: "/jobs",      icon: Briefcase,   label: "งานทั้งหมด" },
  { href: "/analytics", icon: BarChart2,   label: "Analytics"  },
  { href: "/settings",  icon: Settings,    label: "ตั้งค่า"     },
  { href: "/billing",   icon: CreditCard,  label: "แพ็กเกจ"    },
  { href: "/planner",   icon: CalendarDays, label: "แผนคอนเทนต์" },
  { href: "/agent",     icon: Sparkles,    label: "AI Agent"    },
  { href: "/guide",     icon: HelpCircle,  label: "วิธีใช้งาน" },
];

const apiStatus = [
  { label: "Phaya.io", env: "PHAYA_API_KEY" },
  { label: "Supabase", env: "NEXT_PUBLIC_SUPABASE_URL" },
  { label: "OpenAI",   env: "OPENAI_API_KEY" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  // Live system status (Phaya credit + queue), refreshed every 60s.
  const [status, setStatus] = useState<LiveStatus | null>(null);
  useEffect(() => {
    let on = true;
    const load = () =>
      fetch("/api/status")
        .then((r) => r.json())
        .then((d) => { if (on) setStatus(d); })
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { on = false; clearInterval(t); };
  }, []);
  const credit = status?.phaya_credit_thb;
  const vq = status?.queue_video || {};
  const lowCredit = typeof credit === "number" && credit < 3;

  return (
    <div className="min-h-screen flex bg-washi-50">

      {/* ─── Sidebar ─── */}
      <aside className="hidden md:flex w-60 flex-col bg-sumi-900 border-r border-sumi-800 flex-shrink-0 relative">
        {/* Noren accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-beni-500" />

        {/* Logo */}
        <div className="px-5 py-6 border-b border-sumi-800">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-beni-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:bg-beni-500 transition-colors">
              <span className="text-white font-bold text-base leading-none">全</span>
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight tracking-wide">Zenkai</p>
              <p className="text-sumi-400 text-[11px] mt-0.5 tracking-widest uppercase">Menu · AI · Video</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-sumi-800 text-white"
                    : "text-sumi-300 hover:bg-sumi-800/60 hover:text-white"
                )}
              >
                {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-beni-400 rounded-full" />}
                <Icon className={clsx("w-4 h-4 flex-shrink-0", active ? "text-beni-400" : "text-sumi-500")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Live system status */}
        <div className="px-4 py-4 border-t border-sumi-800">
          <p className="text-[10px] font-medium text-sumi-500 uppercase tracking-widest mb-2">ระบบสด</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sumi-400">เครดิต Phaya</span>
              <span className={clsx("text-xs font-semibold", lowCredit ? "text-beni-400" : "text-kin-300")}>
                {typeof credit === "number" ? `${credit.toFixed(2)} ฿` : "—"}
                {lowCredit ? " ⚠️" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-sumi-400">คิววิดีโอ</span>
              <span className="text-xs text-sumi-300">
                รอ {vq.waiting ?? "—"} · ทำ {vq.active ?? 0}
                {vq.failed ? ` · ✗${vq.failed}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="px-4 py-4 border-t border-sumi-800">
          <p className="text-[10px] font-medium text-sumi-500 uppercase tracking-widest mb-2">สถานะ API</p>
          <div className="space-y-1.5">
            {apiStatus.map(({ label }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-sumi-400">{label}</span>
                <span className="flex items-center gap-1 text-seiji-500 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-seiji-500 animate-pulse" />
                  พร้อม
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ─── Mobile bottom nav ─── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sumi-900 border-t border-sumi-800 flex">
        {navItems.slice(0, 5).map(({ href, icon: Icon, label, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] transition-colors",
                active ? "text-beni-400" : "text-sumi-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label.slice(0, 4)}</span>
            </Link>
          );
        })}
      </div>

      {/* ─── Main ─── */}
      <main className="flex-1 overflow-auto min-w-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
