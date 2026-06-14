import { NextRequest, NextResponse } from "next/server";
import { stripe, priceIdForPlan, PLANS, isPlan } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ก่อนเปิด Stripe (ยังไม่มี key) ปุ่มจะพาไปคุยทีมงานแทน
const FALLBACK = "https://t.me/Projectd_auto_bot";

export async function GET(req: NextRequest) {
  return start(req);
}

export async function POST(req: NextRequest) {
  return start(req);
}

async function start(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("plan") || "pro").toLowerCase();
  if (!isPlan(raw)) {
    return NextResponse.redirect(FALLBACK, 303);
  }
  const plan = raw;
  const priceId = priceIdForPlan(plan);

  // Stripe ยังไม่เปิดใช้ → fallback ไป Telegram
  if (!stripe || !priceId) {
    return NextResponse.redirect(FALLBACK, 303);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const trialDays = PLANS[plan].trialDays;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "th",
      metadata: { plan },
      subscription_data: {
        metadata: { plan },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (err) {
    console.error("[checkout] create session failed:", err);
    return NextResponse.redirect(FALLBACK, 303);
  }
}
