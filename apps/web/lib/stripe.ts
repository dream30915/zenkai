/**
 * Stripe client — guarded so the app deploys & runs WITHOUT keys.
 *
 * ถ้ายังไม่ใส่ STRIPE_SECRET_KEY ใน .env.local ระบบจะถือว่า "ยังไม่เปิดรับเงิน":
 * ปุ่มราคาบนหน้า landing จะ fallback ไปแชท Telegram แทน (ไม่ crash)
 * พอใส่ key จริง + STRIPE_PRICE_* แล้ว restart service → ระบบรับชำระเงินทันที
 */
import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export type PlanId = "pro" | "premium";

export const PLANS: Record<
  PlanId,
  { label: string; priceEnv: string; amount: number; trialDays: number }
> = {
  pro: { label: "Pro", priceEnv: "STRIPE_PRICE_PRO", amount: 990, trialDays: 14 },
  premium: { label: "Premium", priceEnv: "STRIPE_PRICE_PREMIUM", amount: 2990, trialDays: 0 },
};

export function isPlan(x: string): x is PlanId {
  return x === "pro" || x === "premium";
}

export function priceIdForPlan(plan: PlanId): string | null {
  return process.env[PLANS[plan].priceEnv] || null;
}
