// netlify/functions/_supabase.js
// Supabase bilan ulanish uchun umumiy funksiya
// Boshqa barcha functions shu faylni ishlatadi

const { createClient } = require('@supabase/supabase-js');

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL yoki SUPABASE_SERVICE_KEY sozlanmagan');
  }

  return createClient(url, key);
}

module.exports = { getClient };
