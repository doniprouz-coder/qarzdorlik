// netlify/functions/payment.js
// To'lovni qabul qilish - va mijozga Telegram orqali avtomatik xabar yuborish

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');
const { sendTelegramMessage, formatSum } = require('./_telegram');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { debt_id, amount } = JSON.parse(event.body || '{}');

    if (!debt_id || !amount || amount <= 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "To'g'ri summa kiriting" }),
      };
    }

    const supabase = getClient();

    // Qarzni topish
    const { data: debt, error: findError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', debt_id)
      .single();

    if (findError || !debt) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Qarz topilmadi' }),
      };
    }

    const paymentAmount = parseInt(amount);
    const newPaidAmount = debt.paid_amount + paymentAmount;
    const status = newPaidAmount >= debt.total_amount ? 'yopilgan' : 'qisman_tolangan';

    // Qarzni yangilash
    const { data: updated, error: updateError } = await supabase
      .from('debts')
      .update({ paid_amount: newPaidAmount, status })
      .eq('id', debt_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // To'lov tarixiga yozish
    await supabase.from('payments').insert({ debt_id, amount: paymentAmount });

    // Mijozga Telegram orqali xabar yuborish
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', debt.customer_id)
      .single();

    if (customer && customer.telegram_id) {
      const remaining = updated.total_amount - updated.paid_amount;
      const message =
        `✅ To'lov qabul qilindi!\n\n` +
        `💵 To'langan: ${formatSum(paymentAmount)}\n` +
        `📊 Qoldiq: ${formatSum(remaining)}\n\n` +
        (remaining === 0
          ? `🎉 Qarzingiz to'liq yopildi!`
          : `Qolgan qarzni ko'rish uchun /qarz buyrug'ini yuboring.`);

      await sendTelegramMessage(customer.telegram_id, message);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
