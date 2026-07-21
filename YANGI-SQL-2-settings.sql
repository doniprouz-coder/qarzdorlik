-- Bu kodni Supabase "SQL Editor"da ishga tushiring
-- (avvalgi jadvallarga tegmaydi, faqat 1 ta yangi jadval qo'shadi)

CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  stats_reset_at TIMESTAMPTZ
);

INSERT INTO app_settings (id, stats_reset_at) VALUES (1, NULL);

ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
