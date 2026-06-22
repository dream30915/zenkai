#!/bin/bash
# Zenkai autonomous marketing → Telegram.
# Logs in as the dashboard user, hits /api/marketing/run so the AI team plans
# the day's content and pushes it to the owner's Telegram for approval/posting.
cd /opt/zenkai/apps/web || exit 1
PW=$(grep -E "^BASIC_AUTH_PASSWORD=" .env.local | cut -d= -f2- | tr -d '"\r')
J=$(mktemp)
curl -s -m 8 -c "$J" http://localhost:3000/api/auth/login \
  -H "content-type: application/json" -d "{\"password\":\"$PW\"}" >/dev/null 2>&1
echo "===== $(date -u) =====" >> /opt/zenkai/marketing-auto.log
curl -s -m 115 -b "$J" -X POST http://localhost:3000/api/marketing/run \
  -H "content-type: application/json" -d '{"count":4}' >> /opt/zenkai/marketing-auto.log 2>&1
echo "" >> /opt/zenkai/marketing-auto.log
rm -f "$J"
