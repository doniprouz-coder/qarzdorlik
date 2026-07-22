-- Bu kodni Supabase "SQL Editor"da ishga tushiring

-- Mijozga keshbek balansini qo'shamiz
ALTER TABLE customers ADD COLUMN cashback_balance BIGINT DEFAULT 0;

-- Xaridlar tarixi jadvali
CREATE TABLE purchases (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  cashback_earned BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_customer_id ON purchases(customer_id);

ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
