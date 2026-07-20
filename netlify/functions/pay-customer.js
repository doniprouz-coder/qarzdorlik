// netlify/functions/pay-customer.js
//
// Mijozdan OLINGAN UMUMIY to'lovni qabul qiladi va avtomatik ravishda
// uning barcha ochiq qarzlariga (ENG ESKISIDAN boshlab) taqsimlab, ayirib
// chiqadi. Admin har bir qarzni alohida bosishi shart emas.
//
// Misol: mijozda 3 ta qarz bor (25,000 / 10,000 / 100,000 qoldiq)
// Admin 20,000 kiritsa:
//   -> 1-qarz (eng eski) 15,000 qoldiq edi -> to'liq yopiladi (15,000)
//   -> qolgan 5,000 -> 2-qarzga (10,000 qoldiq) qo'shiladi -> 5,000 qoldi

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
    let amountLeft = parseInt(amount);
    const totalPaid = amountLeft;

    // Mijozning ochiq qarzlarini ENG ESKISIDAN boshlab olamiz
    const { data: debts, error: fetchError } = await supabase
      .from('debts')
      .select('*')
      .eq('customer_id', customer_id)
      .neq('status', 'yopilgan')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!debts || debts.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Bu mijozda ochiq qarz yo'q" }),
      };
    }

    let affectedCount = 0;

    for (const debt of debts) {
      if (amountLeft <= 0) break;

      const remaining = debt.total_amount - debt.paid_amount;
      if (remaining <= 0) continue;

      const applyAmount = Math.min(remaining, amountLeft);
      const newPaidAmount = debt.paid_amount + applyAmount;
      const newStatus = newPaidAmount >= debt.total_amount ? 'yopilgan' : 'qisman_tolangan';

      await supabase
        .from('debts')
        .update({ paid_amount: newPaidAmount, status: newStatus })
        .eq('id', debt.id);

      await supabase.from('payments').insert({ debt_id: debt.id, amount: applyAmount });

      amountLeft -= applyAmount;
      affectedCount++;
    }

    // Mijozning yangi umumiy qoldig'ini hisoblaymiz
    const { data: remainingDebts } = await supabase
      .from('debts')
      .select('total_amount, paid_amount')
      .eq('customer_id', customer_id)
      .neq('status', 'yopilgan');

    const totalRemaining = (remainingDebts || []).reduce(
      (sum, d) => sum + (d.total_amount - d.paid_amount),
      0
    );

    // Mijozga Telegram orqali xabar yuborish
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (customer && customer.telegram_id) {
      let message =
        `✅ To'lov qabul qilindi!\n\n` +
        `💵 To'langan: ${formatSum(totalPaid)}\n` +
        `📊 Umumiy qoldiq: ${formatSum(totalRemaining)}`;

      if (amountLeft > 0) {
        message += `\n\n💡 Ortiqcha to'lov: ${formatSum(amountLeft)} (barcha qarzlar yopilgan)`;
      }

      if (totalRemaining === 0) {
        message += `\n\n🎉 Barcha qarzlaringiz to'liq yopildi!`;
      }

      await sendTelegramMessage(customer.telegram_id, message);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        affectedCount,
        totalRemaining,
        overpaid: amountLeft > 0 ? amountLeft : 0,
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
