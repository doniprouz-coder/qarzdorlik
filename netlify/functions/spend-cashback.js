// netlify/functions/spend-cashback.js
// Mijoz to'plagan keshbekni ishlatganda (masalan tovar uchun to'lov o'rniga)
// balansdan ayirib qo'yadi

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');
const { sendTelegramMessage, formatSum } = require('./_telegram');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { customer_id, amount } = JSON.parse(event.body || '{}');

    if (!customer_id || !amount || amount <= 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "To'g'ri summa kiriting" }),
      };
    }

    const supabase = getClient();
    const spendAmount = parseInt(amount);

    const { data: customer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (findError || !customer) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Mijoz topilmadi' }),
      };
    }

    const currentBalance = customer.cashback_balance || 0;

    if (spendAmount > currentBalance) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `Yetarli keshbek yo'q. Mavjud: ${formatSum(currentBalance)}`,
        }),
      };
    }

    const newBalance = currentBalance - spendAmount;

    await Promise.all([
      supabase.from('customers').update({ cashback_balance: newBalance }).eq('id', customer_id),
      supabase.from('cashback_spends').insert({ customer_id, amount: spendAmount }),
    ]);

    if (customer.telegram_id) {
      const message =
        `🎁 Keshbek ishlatildi\n\n` +
        `➖ Ishlatilgan: ${formatSum(spendAmount)}\n` +
        `💰 Qolgan keshbek: ${formatSum(newBalance)}`;

      await sendTelegramMessage(customer.telegram_id, message);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, newBalance }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
