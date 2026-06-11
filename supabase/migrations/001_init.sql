-- ============================================================
-- Kaizen Platform — Database Schema
-- รัน: ใน Supabase SQL Editor หรือ local postgres
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- jobs — งานสร้างวิดีโอแต่ละชิ้น
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id             TEXT PRIMARY KEY,
  menu_name      TEXT NOT NULL,
  menu_name_en   TEXT,
  price          INTEGER,
  description    TEXT,
  video_tier     TEXT NOT NULL DEFAULT 'tier1' CHECK (video_tier IN ('tier1','tier2','tier3')),
  post_to        JSONB NOT NULL DEFAULT '[]',
  image_urls     JSONB NOT NULL DEFAULT '[]',
  script         TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','processing','done','error','posted')),
  video_url      TEXT,
  error_message  TEXT,
  schedule_at    TIMESTAMPTZ,
  posted_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- post_results — ผลการโพสต์แต่ละแพลตฟอร์ม
-- ============================================================
CREATE TABLE IF NOT EXISTS post_results (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id         TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','success','failed')),
  post_url       TEXT,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- menus — คลังเมนูร้าน
-- ============================================================
CREATE TABLE IF NOT EXISTS menus (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_th        TEXT NOT NULL,
  name_en        TEXT,
  name_jp        TEXT,
  category       TEXT,
  price          INTEGER,
  description    TEXT,
  is_available   BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- analytics — engagement data (Phase 7)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id         TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,
  views          INTEGER DEFAULT 0,
  likes          INTEGER DEFAULT 0,
  comments       INTEGER DEFAULT 0,
  shares         INTEGER DEFAULT 0,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_results_job_id ON post_results(job_id);
CREATE INDEX IF NOT EXISTS idx_analytics_job_id ON analytics(job_id);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security (RLS) — เปิด RLS ทุก table
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- ⚠️ ตั้งใจไม่สร้าง policy ใด ๆ:
-- service_role key (ฝั่งเซิร์ฟเวอร์) ข้าม RLS ได้อยู่แล้ว
-- ส่วน publishable/anon key จะถูกบล็อกทั้งหมด — ถูกต้องแล้ว
-- เพราะ policy แบบ USING (true) จะเปิดให้ใครก็ได้อ่าน/เขียนผ่าน key สาธารณะ
