# 🍱 Kaizen — Menu-to-Video Platform
### Setup Guide (Windows & macOS)

---

## ขั้นตอนทำงานต่อบนเครื่องใหม่

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/kaizen.git
cd kaizen

# 2. Copy env file
# Windows:
copy .env.example apps\web\.env.local
# macOS:
cp .env.example apps/web/.env.local

# 3. ใส่ค่า API keys ใน apps/web/.env.local

# 4. Start Docker services (n8n + Redis + Postgres)
docker-compose up -d

# 5. Install Next.js dependencies
cd apps/web
npm install   # หรือ yarn / pnpm install

# 6. Start dev server
npm run dev
```

เปิดเบราว์เซอร์: http://localhost:3000

---

## Services URLs (local dev)

| Service | URL |
|---|---|
| Next.js App | http://localhost:3000 |
| n8n Dashboard | http://localhost:5678 |
| Redis Commander | http://localhost:8081 |
| PostgreSQL | postgresql://kaizen:kaizen_secret@localhost:5432/kaizen |

---

## ลำดับ Setup APIs (Phase 1)

1. **Supabase** — สร้าง project ที่ supabase.com → รัน SQL ใน `supabase/migrations/001_init.sql`
2. **OpenAI** — สร้าง API key ที่ platform.openai.com
3. **Cloudflare R2** — สร้าง bucket ที่ cloudflare.com
4. ใส่ค่าทั้งหมดใน `.env.local`
5. `npm run dev` แล้วลองอัปโหลดเมนูแรก!

---

## Build Phases

- [x] Phase 1: Dashboard + Upload + AI Script
- [ ] Phase 2: Image Gen (fal.ai) + Processing
- [ ] Phase 3: Video Pipeline (Creatomate/Kling)
- [ ] Phase 4: TTS + Audio merge
- [ ] Phase 5: Auto-post
- [ ] Phase 6: LINE OA + Telegram
- [ ] Phase 7: Analytics
- [ ] Phase 8: QR Menu + Review Monitor

---

## Git Workflow

```bash
# เริ่มฟีเจอร์ใหม่
git checkout -b feat/video-pipeline

# Commit
git add .
git commit -m "feat: add Creatomate video generation"

# Push & sync
git push origin feat/video-pipeline

# ย้ายเครื่อง — pull ล่าสุด
git pull origin main
```
