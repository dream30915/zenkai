#!/bin/bash
# ============================================================
# Zenkai — Domain + HTTPS Setup
# รันบน VPS หลังจาก DNS A record ชี้มาที่ 72.61.125.87 แล้ว
# ใช้: bash /opt/zenkai/deploy/setup-domain.sh
# ============================================================
set -euo pipefail

DOMAIN="zenkai.dumpsc.com"
EMAIL="dream30915@gmail.com"   # <-- เปลี่ยนเป็นอีเมลจริงก่อนรัน
ENV="/opt/zenkai/apps/web/.env.local"

log() { echo -e "\n\033[1;32m▶ $1\033[0m"; }

# ── 1. ติดตั้ง Certbot ──────────────────────────────────────
log "ติดตั้ง Certbot..."
apt-get install -y -qq certbot python3-certbot-nginx

# ── 2. nginx config ─────────────────────────────────────────
log "ตั้งค่า nginx สำหรับ $DOMAIN..."
cat > /etc/nginx/sites-available/kaizen << NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 50M;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINX

nginx -t && systemctl reload nginx
log "nginx พร้อม ✅"

# ── 3. ตรวจ DNS ──────────────────────────────────────────────
log "ตรวจสอบ DNS..."
RESOLVED=$(dig +short $DOMAIN 2>/dev/null | head -1)
if [ "$RESOLVED" != "72.61.125.87" ]; then
    echo "⚠️  DNS ยังไม่ชี้มาที่ VPS (พบ: ${RESOLVED:-ไม่พบ})"
    echo "   รอ DNS propagate แล้วรันสคริปต์นี้อีกครั้ง"
    exit 0
fi
log "DNS ✅ $DOMAIN → $RESOLVED"

# ── 4. SSL Certificate ───────────────────────────────────────
log "ขอ SSL Certificate จาก Let's Encrypt..."
certbot --nginx \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    -m $EMAIL \
    --redirect

# ── 5. อัปเดต env ────────────────────────────────────────────
log "อัปเดต APP_URL ใน .env.local..."
sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|" $ENV

# ── 6. Rebuild + Restart ─────────────────────────────────────
log "Rebuild เว็บ..."
cd /opt/zenkai/apps/web
npm run build
systemctl restart zenkai-web

log "เสร็จแล้ว! 🎉"
echo ""
echo "  🌐 https://$DOMAIN"
echo "  🔑 login user: ${BASIC_AUTH_USER:-admin}"
echo "  🔑 password  : value from BASIC_AUTH_PASSWORD in $ENV"
echo "  🔄 cert ต่ออายุอัตโนมัติทุก 90 วัน"
