// netlify/functions/customers.js
// Mijozlar ro'yxatini olish (GET) va yangi mijoz qo'shish (POST)

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();

  const supabase = getClient();

  // ============================================
  // RO'YXATNI OLISH
  // ============================================
  if (event.httpMethod === 'GET') {
    try {
      // Ikkala so'rovni BIR VAQTDA yuboramiz (avval ketma-ket edi)
      const [{ data: customers, error }, { data: debts }] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('debts').select('customer_id, total_amount, paid_amount').neq('status', 'yopilgan'),
      ]);

      if (error) throw error;

      const debtMap = {};
      (debts || []).forEach((d) => {
        debtMap[d.customer_id] = (debtMap[d.customer_id] || 0) + (d.total_amount - d.paid_amount);
      });

      const result = customers.map((c) => ({
        ...c,
        total_debt: debtMap[c.id] || 0,
      }));

      // Eng ko'p qarzi borlar tepada chiqishi uchun saralash
      result.sort((a, b) => b.total_debt - a.total_debt);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  // ============================================
  // YANGI MIJOZ QO'SHISH
  // ============================================
  if (event.httpMethod === 'POST') {
    try {
      const { name, phone } = JSON.parse(event.body || '{}');

      if (!name) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Ism kiritilishi shart' }),
        };
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({ name, phone: phone || null })
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
