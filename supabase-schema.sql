-- ============================================
-- QARZDORLIK - Supabase Database Sxemasi
-- ============================================
-- Bu kodni Supabase saytida "SQL Editor" bo'limiga
-- nusxalab, "Run" tugmasini bosing - jadvallar avtomatik yaraladi

-- Mijozlar jadvali
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  telegram_id TEXT UNIQUE,
  telegram_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Qarzlar jadvali
CREATE TABLE debts (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_amount BIGINT NOT NULL,
  paid_amount BIGINT DEFAULT 0,
  comment TEXT,
  status TEXT DEFAULT 'qarzdor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- To'lovlar jadvali
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  debt_id BIGINT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tezroq qidirish uchun indexlar
CREATE INDEX idx_customers_telegram_id ON customers(telegram_id);
CREATE INDEX idx_debts_customer_id ON debts(customer_id);
CREATE INDEX idx_payments_debt_id ON payments(debt_id);

-- ============================================
-- MUHIM: Row Level Security (RLS) ni o'chiramiz
-- ============================================
-- Chunki biz Netlify Functions orqali "service_role" kaliti bilan
-- ulanamiz - bu kalit RLS'ni chetlab o'tadi, shuning uchun oddiy
-- loyiha uchun RLS yoqilmasligi kerak (aks holda xato chiqadi)

ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Tayyor! Endi "Table Editor" bo'limida 3 ta jadval ko'rinishi kerak:
-- customers, debts, payments
