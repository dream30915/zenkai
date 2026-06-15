-- ============================================================
-- 002_menu_images — เก็บรูปอาหารในคลังเมนู
-- รันใน Supabase Dashboard → SQL Editor → วาง → Run
-- ============================================================
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
