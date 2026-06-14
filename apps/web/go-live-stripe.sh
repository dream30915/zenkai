#!/bin/bash
# เปิดรับเงินจริงด้วย Stripe — รันสคริปต์นี้แล้วใส่ค่า 4 ตัวจาก Stripe Dashboard
# โค้ดพร้อมหมดแล้ว สคริปต์นี้แค่เขียน .env.local + restart service
set -e
ENV=/opt/zenkai/apps/web/.env.local
echo "=== ตั้งค่า Stripe สำหรับ zenkai.dumpsc.com ==="
read -rp "STRIPE_SECRET_KEY (sk_live_...): " SK
read -rp "STRIPE_PRICE_PRO (price_... ของ Pro ฿990): " PP
read -rp "STRIPE_PRICE_PREMIUM (price_... ของ Premium ฿2990): " PM
read -rp "STRIPE_WEBHOOK_SECRET (whsec_... จาก webhook endpoint): " WH
# ลบบรรทัดเก่า แล้วเขียนใหม่
sed -i "/^STRIPE_SECRET_KEY=/d;/^STRIPE_PRICE_PRO=/d;/^STRIPE_PRICE_PREMIUM=/d;/^STRIPE_WEBHOOK_SECRET=/d;/^NEXT_PUBLIC_APP_URL=/d" "$ENV"
{
  echo "STRIPE_SECRET_KEY=$SK"
  echo "STRIPE_PRICE_PRO=$PP"
  echo "STRIPE_PRICE_PREMIUM=$PM"
  echo "STRIPE_WEBHOOK_SECRET=$WH"
  echo "NEXT_PUBLIC_APP_URL=https://zenkai.dumpsc.com"
} >> "$ENV"
echo "=== restart zenkai-web ==="
systemctl restart zenkai-web.service
sleep 4
systemctl is-active zenkai-web.service
echo "=== ทดสอบ checkout (ควร redirect ไป checkout.stripe.com ไม่ใช่ Telegram) ==="
curl -s -o /dev/null -w "plan=pro -> %{http_code} %{redirect_url}\n" "http://127.0.0.1:3000/api/checkout?plan=pro"
echo "เสร็จ! ปุ่มราคาบน kaizen.dumpsc.com + หน้า /billing รับเงินจริงแล้ว"
