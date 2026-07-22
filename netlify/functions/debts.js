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

    // Qarzni yaratish VA mijoz ma'lumotini BIRGALIKDA olish
    // (avval alohida-alohida 2 ta so'rov edi, endi 1 ta so'rovda)
    const { data: debt, error } = await supabase
      .from('debts')
      .insert({
        customer_id,
        total_amount: parseInt(total_amount),
        comment: comment || null,
        due_date: due_date || null,
      })
      .select('*, customer:customers(*)')
      .single();

    if (error) throw error;

    const customer = debt.customer;

    if (customer && customer.telegram_id) {
      const message =
        `🔔 Sizga yangi qarz qo'shildi!\n\n` +
        `${comment ? `📝 ${comment}\n` : ''}` +
        `💰 Summa: ${formatSum(total_amount)}\n\n` +
        `Qarzingizni tekshirish uchun /qarz buyrug'ini yuboring.`;

      await sendTelegramMessage(customer.telegram_id, message);
    }

    delete debt.customer; // frontend'ga keraksiz ma'lumot yubormaymiz

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
