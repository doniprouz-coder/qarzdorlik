// netlify/functions/debts.js
// Yangi qarz qo'shish - va mijozga Telegram orqali avtomatik xabar yuborish

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');
const { sendTelegramMessage, formatSum } = require('./_telegram');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { customer_id, total_amount, comment, due_date } = JSON.parse(event.body || '{}');

    if (!customer_id || !total_amount) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Mijoz va summa kiritilishi shart' }),
      };
    }

    const supabase = getClient();

    // Qarzni yaratish
    const { data: debt, error } = await supabase
      .from('debts')
      .insert({
        customer_id,
        total_amount: parseInt(total_amount),
        comment: comment || null,
        due_date: due_date || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Mijozga Telegram orqali xabar yuborish (agar u ro'yxatdan o'tgan bo'lsa)
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customer && customer.telegram_id) {
      const message =
        `🔔 Sizga yangi qarz qo'shildi!\n\n` +
        `${comment ? `📝 ${comment}\n` : ''}` +
        `💰 Summa: ${formatSum(total_amount)}\n\n` +
        `Qarzingizni tekshirish uchun /qarz buyrug'ini yuboring.`;

      await sendTelegramMessage(customer.telegram_id, message);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debt),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
