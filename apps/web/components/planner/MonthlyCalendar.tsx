"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { clsx } from "clsx";

const DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

interface DayPlan {
  date: number;
  theme: string;
  platform: string;
  contentType: string;
  hook: string;
  icon: string;
  color: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: "bg-sumi-900 text-white",
  Instagram: "bg-purple-500 text-white",
  Facebook: "bg-blue-600 text-white",
  "LINE OA": "bg-green-500 text-white",
  "ทุกแพลตฟอร์ม": "bg-beni-600 text-white",
};

const CONTENT_COLORS: Record<string, string> = {
  "🎬": "bg-beni-50 border-beni-200",
  "🎵": "bg-purple-50 border-purple-200",
  "💥": "bg-orange-50 border-orange-200",
  "👨‍🍳": "bg-sumi-100 border-sumi-200",
  "🍽️": "bg-kin-50 border-kin-200",
  "💧": "bg-blue-50 border-blue-200",
  "📸": "bg-seiji-50 border-seiji-200",
  "🎁": "bg-pink-50 border-pink-200",
};

export default function MonthlyCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [plans, setPlans] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DayPlan | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setPlans([]);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setPlans([]);
  };

  const generate = useCallback(async () => {
    setLoading(true);
    setPlans([]);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `สร้างแผนคอนเทนต์รายวันสำหรับร้านอาหารญี่ปุ่น Zenkai เดือน${MONTHS_TH[month]} ${year + 543}

กฎ:
- วันจันทร์ = วัตถุดิบสด/Behind the scenes
- วันอังคาร = Hero dish ASMR/Money shot
- วันพุธ = เบื้องหลังเชฟ/Educational  
- วันพฤหัส = Social proof/รีวิวลูกค้า
- วันศุกร์ = Weekend FOMO/โปรโมชั่น
- วันเสาร์ = บรรยากาศ/Date night
- วันอาทิตย์ = Community/ขอบคุณ
- เพิ่ม theme พิเศษสำหรับวันหยุดไทยและ Japanese seasons ที่เกี่ยวข้อง
- platform หลัก: TikTok, Instagram, Facebook, LINE OA, หรือ "ทุกแพลตฟอร์ม"

ตอบเป็น JSON array เท่านั้น ${daysInMonth} elements:
[{"date":1,"theme":"ชื่อธีม","platform":"TikTok","contentType":"ASMR","hook":"hook 1 ประโยค","icon":"🎵","color":"purple"}]

icon ให้เลือกจาก: 🎬🎵💥👨‍🍳🍽️💧📸🎁
date ตั้งแต่ 1 ถึง ${daysInMonth}
ห้ามใส่อะไรนอกจาก JSON array`
          }]
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
      }

      const clean = full.replace(/```json|```/g, "").trim();
      const start = clean.indexOf("[");
      const end = clean.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        const data = JSON.parse(clean.slice(start, end + 1));
        setPlans(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, year, daysInMonth]);

  const getPlan = (date: number) => plans.find(p => p.date === date);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="min-h-screen bg-washi-50">
      {/* Header */}
      <div className="bg-sumi-900 px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sumi-400 text-xs tracking-widest uppercase mb-1">Monthly Planner</p>
            <h1 className="text-white font-black text-2xl">ปฏิทินคอนเทนต์</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-sumi-800 flex items-center justify-center text-white hover:bg-sumi-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-bold text-sm min-w-[120px] text-center">
              {MONTHS_TH[month]} {year + 543}
            </span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-sumi-800 flex items-center justify-center text-white hover:bg-sumi-700 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button onClick={generate} disabled={loading}
          className="w-full py-3 bg-beni-600 hover:bg-beni-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> AI กำลังวางแผนทั้งเดือน...</>
            : <><Sparkles className="w-4 h-4" /> สร้างแผน {MONTHS_TH[month]} ทั้งเดือน</>}
        </button>
      </div>

      {/* Calendar */}
      <div className="px-3 py-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d, i) => (
            <div key={d} className={clsx("text-center text-xs font-bold py-1",
              i === 0 ? "text-beni-500" : i === 6 ? "text-blue-500" : "text-sumi-400")}>
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />;
            const plan = getPlan(date);
            const isToday = date === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            const dow = (firstDay + date - 1) % 7;

            return (
              <button key={date}
                onClick={() => plan && setSelected(plan)}
                className={clsx(
                  "relative rounded-xl p-1.5 min-h-[60px] text-left transition-all border",
                  plan ? "bg-white hover:shadow-md cursor-pointer" : "bg-white/50",
                  isToday ? "ring-2 ring-beni-500" : "",
                  plan ? (CONTENT_COLORS[plan.icon] || "bg-white border-washi-200") : "border-washi-100"
                )}>
                <span className={clsx("text-xs font-bold block mb-0.5",
                  isToday ? "text-beni-600" :
                  dow === 0 ? "text-beni-400" :
                  dow === 6 ? "text-blue-400" : "text-sumi-600")}>
                  {date}
                </span>
                {plan && (
                  <>
                    <span className="text-base leading-none block">{plan.icon}</span>
                    <p className="text-[9px] text-sumi-500 mt-0.5 leading-tight line-clamp-2">{plan.theme}</p>
                  </>
                )}
                {loading && !plan && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full border border-sumi-200 animate-pulse" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        {plans.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-washi-200 p-4">
            <p className="text-xs font-bold text-sumi-500 uppercase tracking-widest mb-3">ประเภทคอนเทนต์</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["🎬","Cinematic"], ["🎵","ASMR"], ["💥","Money Shot"],
                ["👨‍🍳","Behind Scenes"], ["🍽️","Plating"], ["💧","Pour Shot"],
                ["📸","Social Proof"], ["🎁","Promotion"],
              ].map(([icon, label]) => (
                <div key={icon} className="flex items-center gap-2 text-xs text-sumi-600">
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Day detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sumi-900 flex items-center justify-center text-2xl">
                  {selected.icon}
                </div>
                <div>
                  <p className="text-xs text-sumi-400 font-medium">{MONTHS_TH[month]} {selected.date}</p>
                  <h3 className="font-black text-sumi-900 text-lg">{selected.theme}</h3>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-sumi-400 hover:text-sumi-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sumi-400 uppercase tracking-widest w-20">Platform</span>
                <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-full",
                  PLATFORM_COLORS[selected.platform] || "bg-sumi-100 text-sumi-700")}>
                  {selected.platform}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sumi-400 uppercase tracking-widest w-20">สไตล์</span>
                <span className="text-sm text-sumi-700 font-medium">{selected.contentType}</span>
              </div>
              <div className="bg-beni-50 border border-beni-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-beni-400 uppercase tracking-widest mb-2">Hook เปิดคลิป</p>
                <p className="text-sm text-sumi-800 font-medium leading-relaxed">"{selected.hook}"</p>
              </div>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="mt-4 w-full py-3.5 bg-sumi-900 text-white font-bold rounded-2xl text-sm">
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
