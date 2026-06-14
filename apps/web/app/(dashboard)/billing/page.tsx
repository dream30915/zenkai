import { Check, Crown, Sparkles } from "lucide-react";
import { stripe, priceIdForPlan } from "@/lib/stripe";

export const metadata = { title: "แพ็กเกจ & การเรียกเก็บเงิน — Zenkai" };
export const dynamic = "force-dynamic";

type Tier = {
  id: "starter" | "pro" | "premium";
  name: string;
  jp?: string;
  price: string;
  period?: string;
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
};

export default function BillingPage() {
  // Stripe พร้อมจ่ายเงินจริงไหม (มี secret key + price id)
  const proLive = !!stripe && !!priceIdForPlan("pro");
  const premiumLive = !!stripe && !!priceIdForPlan("premium");
  const live = proLive || premiumLive;

  const tiers: Tier[] = [
    {
      id: "starter",
      name: "Starter",
      price: "ฟรี",
      blurb: "เหมาะกับร้านที่เพิ่งเริ่มลองตลาด",
      features: ["5 คลิป/เดือน", "ลายน้ำ Zenkai", "เผยแพร่ 1 แพลตฟอร์ม", "เทมเพลตพื้นฐาน"],
      cta: "แพ็กเกจปัจจุบัน",
      href: "/upload",
    },
    {
      id: "pro",
      name: "Pro",
      price: "฿990",
      period: "/เดือน",
      blurb: "สำหรับร้านที่จริงจังกับการเติบโต",
      features: [
        "60 คลิป/เดือน",
        "ไม่มีลายน้ำ",
        "เผยแพร่ทุกแพลตฟอร์ม",
        "เทมเพลตพรีเมียมทั้งหมด",
        "ปฏิทิน + ตั้งเวลาโพสต์",
        "วิเคราะห์ผลเชิงลึก",
      ],
      cta: proLive ? "ทดลองฟรี 14 วัน" : "ติดต่อทีมงาน",
      href: "/api/checkout?plan=pro",
      popular: true,
    },
    {
      id: "premium",
      name: "Premium",
      jp: "プレミアム",
      price: "฿2,990",
      period: "/เดือน",
      blurb: "สำหรับเชนร้านและหลายสาขา",
      features: [
        "คลิปไม่จำกัด",
        "หลายสาขา / หลายแบรนด์",
        "ทีมงานหลายผู้ใช้",
        "เทมเพลตแบรนด์เฉพาะร้าน",
        "ผู้จัดการบัญชีส่วนตัว",
      ],
      cta: premiumLive ? "สมัคร Premium" : "ติดต่อทีมงาน",
      href: "/api/checkout?plan=premium",
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">แพ็กเกจ & การเรียกเก็บเงิน</h1>
        <p className="text-gray-500 mt-1">
          เลือกแพ็กเกจที่เหมาะกับร้านของคุณ ยกเลิกได้ทุกเมื่อ ไม่มีค่าธรรมเนียมแอบแฝง
        </p>
        {!live && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-kin-200 bg-kin-50 px-4 py-3 text-sm text-kin-700">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              ขณะนี้ระบบชำระเงินออนไลน์กำลังจะเปิดให้บริการ — กดปุ่มเพื่อคุยกับทีมงานและสมัครล่วงหน้าได้เลย
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3 items-stretch">
        {tiers.map((t) => (
          <div
            key={t.id}
            className={
              "relative flex flex-col rounded-2xl border bg-white p-7 " +
              (t.popular ? "border-beni-300 shadow-lg ring-1 ring-beni-100" : "border-gray-200 shadow-sm")
            }
          >
            {t.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-beni-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
                <Crown className="w-3 h-3" /> ยอดนิยม
              </span>
            )}
            <p className="text-sm font-semibold text-gray-700">
              {t.name} {t.jp && <span className="text-beni-500">{t.jp}</span>}
            </p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-black text-gray-900">{t.price}</span>
              {t.period && <span className="mb-1 text-sm text-gray-400">{t.period}</span>}
            </div>
            <p className="mt-2 text-[13px] text-gray-500">{t.blurb}</p>
            <ul className="mt-6 space-y-3 text-[14px] text-gray-700 flex-1">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-seiji-600" />
                  {f}
                </li>
              ))}
            </ul>
            {t.id === "starter" ? (
              <span className="mt-8 rounded-xl border border-gray-200 bg-gray-50 py-3 text-center text-sm font-bold text-gray-400">
                {t.cta}
              </span>
            ) : (
              <a
                href={t.href}
                className={
                  "mt-8 rounded-xl py-3 text-center text-sm font-bold transition " +
                  (t.popular
                    ? "bg-gradient-to-r from-beni-500 to-beni-600 text-white hover:brightness-110"
                    : "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50")
                }
              >
                {t.cta}
              </a>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        การชำระเงินดำเนินการอย่างปลอดภัยผ่าน Stripe · ยกเลิกหรือเปลี่ยนแพ็กเกจได้ทุกเมื่อ
      </p>
    </div>
  );
}
