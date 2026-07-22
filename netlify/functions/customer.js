// netlify/functions/customer.js
// Bitta mijozning tafsilotlarini olish (GET) va o'chirish (DELETE)
// Foydalanish: /api/customer?id=5

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();

  const id = event.queryStringParameters && event.queryStringParameters.id;

  if (!id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Mijoz id kerak' }),
    };
  }

  const supabase = getClient();

  // ============================================
  // MIJOZ TAFSILOTLARI (qarzlari bilan)
  // ============================================
  if (event.httpMethod === 'GET') {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !customer) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Mijoz topilmadi' }),
        };
      }

      const [{ data: debts }, { data: purchases }, { data: spends }] = await Promise.all([
        supabase.from('debts').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        supabase.from('purchases').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        supabase.from('cashback_spends').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      ]);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customer,
          debts: debts || [],
          purchases: purchases || [],
          cashbackSpends: spends || [],
        }),
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
  // MIJOZNI O'CHIRISH (qarzlari, to'lovlari, xaridlari bilan)
  // ============================================
  if (event.httpMethod === 'DELETE') {
    try {
      const { data: debts } = await supabase.from('debts').select('id').eq('customer_id', id);
      const debtIds = (debts || []).map((d) => d.id);

      if (debtIds.length > 0) {
        await supabase.from('payments').delete().in('debt_id', debtIds);
        await supabase.from('debts').delete().eq('customer_id', id);
      }

      await supabase.from('purchases').delete().eq('customer_id', id);
      await supabase.from('cashback_spends').delete().eq('customer_id', id);
      await supabase.from('customers').delete().eq('id', id);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
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
