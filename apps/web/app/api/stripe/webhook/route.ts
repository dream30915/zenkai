import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { sendTelegramAlert } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — ต้องอ่าน raw body เพื่อ verify signature
 * ตั้ง endpoint นี้ใน Stripe Dashboard → Developers → Webhooks:
 *   https://zenkai.dumpsc.com/api/stripe/webhook
 * แล้วเอา signing secret มาใส่ STRIPE_WEBHOOK_SECRET
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "stripe disabled" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!secret || !sig) {
    return NextResponse.json({ ok: false, error: "missing webhook secret/signature" }, { status: 400 });
  }

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const plan = s.metadata?.plan || "?";
        const email = s.customer_details?.email || s.customer_email || "ไม่ระบุ";
        const amount = ((s.amount_total || 0) / 100).toLocaleString("th-TH");
        await sendTelegramAlert(
          `💳 <b>มีผู้สมัครแพ็กเกจใหม่!</b>\n\n` +
            `📦 แพ็กเกจ: <b>${plan}</b>\n` +
            `📧 อีเมล: ${email}\n` +
            `💰 ยอด: ฿${amount}\n` +
            `🆔 <code>${s.id}</code>`
        );
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object;
        await sendTelegramAlert(
          `⚠️ <b>ชำระเงินไม่สำเร็จ</b>\n\n📧 ${inv.customer_email || "ไม่ระบุ"}\n🆔 <code>${inv.id}</code>`
        );
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await sendTelegramAlert(`🚫 <b>มีการยกเลิกการสมัคร</b>\n\n🆔 <code>${sub.id}</code>`);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
  }

  return NextResponse.json({ received: true });
}
