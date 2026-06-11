"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, BookOpen, Briefcase, BarChart2, Settings, ChefHat } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", icon: Home, label: "หน้าหลัก", exact: true },
  { href: "/upload", icon: Upload, label: "สร้างวิดีโอ" },
  { href: "/menus", icon: BookOpen, label: "คลังเมนู" },
  { href: "/jobs", icon: Briefcase, label: "งานทั้งหมด" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "ตั้งค่า" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-sakura-500 rounded-xl flex items-center justify-center group-hover:bg-sakura-600 transition-colors">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">改善 Kaizen</h1>
              <p className="text-xs text-gray-500">Menu-to-Video</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label, exact }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive(href, exact)
                  ? "bg-sakura-50 text-sakura-600 border border-sakura-100"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Status */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-medium text-gray-500">สถานะ API</p>
            {[
              { label: "Phaya.io", envKey: "PHAYA_API_KEY" },
              { label: "Supabase", envKey: "NEXT_PUBLIC_SUPABASE_URL" },
              { label: "OpenAI", envKey: "OPENAI_API_KEY" },
            ].map(({ label }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{label}</span>
                <span className="flex items-center gap-1 text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  ยังไม่ตั้งค่า
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
