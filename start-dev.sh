#!/bin/bash
# ============================================================
# Kaizen Dev Startup Script — macOS / Linux
# รัน: chmod +x start-dev.sh && ./start-dev.sh
# ============================================================

echo "🚀 Starting Kaizen Dev Environment..."
cd "$(dirname "$0")"

# 1. Docker services
echo "\n📦 Starting Docker services..."
docker-compose up -d
sleep 5
docker-compose ps

# 2. Next.js (background)
echo "\n⚡ Starting Next.js..."
cd apps/web
npm run dev &
NEXTJS_PID=$!

# 3. Workers
echo "\n🎬 Starting workers..."
npm run worker:video &
npm run worker:post &

echo "\n✨ Dev ready!"
echo "   Next.js: http://localhost:3000"
echo "   n8n:     http://localhost:5678"
echo ""
echo "กด Ctrl+C เพื่อหยุดทุกอย่าง"

# Wait for all background processes
wait
