# ============================================================
# Kaizen Dev Startup Script — Windows PowerShell
# รัน: .\start-dev.ps1
# ============================================================

Write-Host "🚀 Starting Kaizen Dev Environment..." -ForegroundColor Cyan

# 1. Start Docker services
Write-Host "`n📦 Starting Docker services (n8n + Redis + Postgres + rembg)..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
docker-compose up -d

# รอ services พร้อม
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 2. Check Docker status
$running = docker-compose ps --services --filter "status=running" 2>&1
Write-Host "`n✅ Running services:" -ForegroundColor Green
docker-compose ps

# 3. Start Next.js
Write-Host "`n⚡ Starting Next.js..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\apps\web"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

# 4. Start Workers (optional — comment out ถ้าไม่ต้องการ)
Write-Host "`n🎬 Starting Video Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\apps\web'; npm run worker:video" -WindowStyle Minimized

Write-Host "`n📱 Starting Post Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\apps\web'; npm run worker:post" -WindowStyle Minimized

Write-Host "`n✨ Dev environment ready!" -ForegroundColor Green
Write-Host "   Next.js:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   n8n:      http://localhost:5678" -ForegroundColor Cyan
Write-Host "   Redis UI:  http://localhost:8081 (run with: docker-compose --profile tools up -d)" -ForegroundColor Cyan
