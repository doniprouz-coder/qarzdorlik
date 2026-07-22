// netlify/functions/purchases.js
// Mijoz xaridini qo'shish - avtomatik 3% keshbek hisoblab, mijoz balansiga qo'shadi

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');
const { sendTelegramMessage, formatSum } = require('./_telegram');

const CASHBACK_PERCENT = 3; // Foiz - shu yerdan o'zgartirsa bo'ladi

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { customer_id, amount } = JSON.parse(event.body || '{}');

    if (!customer_id || !amount || amount <= 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "To'g'ri summa va mijozni tanlang" }),
      };
    }

    const supabase = getClient();
    const purchaseAmount = parseInt(amount);
    const cashbackEarned = Math.round((purchaseAmount * CASHBACK_PERCENT) / 100);

    // Mijozni topamiz
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

    const newCashbackBalance = (customer.cashback_balance || 0) + cashbackEarned;

    // Xaridni yozish VA mijoz balansini yangilash - bir vaqtda
    await Promise.all([
      supabase.from('purchases').insert({
        customer_id,
        amount: purchaseAmount,
        cashback_earned: cashbackEarned,
      }),
      supabase.from('customers').update({ cashback_balance: newCashbackBalance }).eq('id', customer_id),
    ]);

    // Mijozga Telegram orqali xabar
    if (customer.telegram_id) {
      const message =
        `🛍️ Xaridingiz uchun rahmat!\n\n` +
        `💵 Xarid summasi: ${formatSum(purchaseAmount)}\n` +
        `🎁 Keshbek: +${formatSum(cashbackEarned)} (${CASHBACK_PERCENT}%)\n\n` +
        `💰 Jami to'plangan keshbek: ${formatSum(newCashbackBalance)}`;

      await sendTelegramMessage(customer.telegram_id, message);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        cashbackEarned,
        newCashbackBalance,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
