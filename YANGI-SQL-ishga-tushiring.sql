-- MUHIM: Bu faylni Supabase "SQL Editor" bo'limida ishga tushiring
--
-- ⚠️ supabase-schema.sql faylini QAYTA ishga tushirmang - jadvallar
-- allaqachon yaratilgan, qayta yaratishga urinsa xato chiqadi.
--
-- Faqat SHU kodni ishga tushiring - u faqat 1 ta yangi ustun qo'shadi:

ALTER TABLE debts ADD COLUMN due_date DATE;
