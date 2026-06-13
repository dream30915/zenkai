"use client";
import { useState } from "react";
import ContentPlanner from "@/components/planner/ContentPlanner";
import MonthlyCalendar from "@/components/planner/MonthlyCalendar";
import { clsx } from "clsx";

export default function PlannerPage() {
  const [tab, setTab] = useState<"daily" | "monthly">("daily");
  return (
    <div>
      {/* Tab switcher */}
      <div className="bg-sumi-900 px-5 pt-6 pb-0">
        <div className="flex gap-1 bg-sumi-800 rounded-xl p-1">
          {[["daily","📅 แผนวันนี้"],["monthly","🗓️ รายเดือน"]].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v as "daily"|"monthly")}
              className={clsx("flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                tab === v ? "bg-beni-600 text-white" : "text-sumi-400 hover:text-white")}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === "daily" ? <ContentPlanner /> : <MonthlyCalendar />}
    </div>
  );
}
