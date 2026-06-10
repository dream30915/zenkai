"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Upload,
  Briefcase,
  BarChart2,
  Settings,
  ChefHat,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/upload", icon: Upload, label: "อัปโหลดเมนู" },
  { href: "/jobs", icon: Briefcase, label: "งานทั้งหมด" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "ตั้งค่า" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sakura-500 rounded-xl flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">
                改善 Kaizen
              </h1>
              <p className="text-xs text-gray-500">Menu-to-Video</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                pathname === href
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
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">
              สถานะระบบ
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">n8n</span>
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Queue</span>
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
