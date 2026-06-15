#!/bin/bash
# Zenkai daily brief → Telegram. Logs in as the dashboard user, hits /api/brief.
cd /opt/zenkai/apps/web || exit 1
PW=$(grep -E "^BASIC_AUTH_PASSWORD=" .env.local | cut -d= -f2- | tr -d '"\r')
J=$(mktemp)
curl -s -m 8 -c "$J" http://localhost:3000/api/auth/login \
  -H "content-type: application/json" -d "{\"password\":\"$PW\"}" >/dev/null 2>&1
echo "===== $(date -u) =====" >> /opt/zenkai/daily-brief.log
curl -s -m 115 -b "$J" -X POST http://localhost:3000/api/brief >> /opt/zenkai/daily-brief.log 2>&1
echo "" >> /opt/zenkai/daily-brief.log
rm -f "$J"
