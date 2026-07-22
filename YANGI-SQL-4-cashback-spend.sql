-- Bu kodni Supabase "SQL Editor"da ishga tushiring

CREATE TABLE cashback_spends (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cashback_spends_customer_id ON cashback_spends(customer_id);

ALTER TABLE cashback_spends DISABLE ROW LEVEL SECURITY;
