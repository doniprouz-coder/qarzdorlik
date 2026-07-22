// netlify/functions/pay-customer.js
// Umumiy to'lov - eng eski qarzdan avtomatik taqsimlaydi
// TEZLASHTIRILGAN: barcha yozuvlar PARALLEL bajariladi (ketma-ket emas)

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

    // Qarzlarni VA mijozni BIR VAQTDA (parallel) olamiz
    const [{ data: debts, error: fetchError }, { data: customer }] = await Promise.all([
      supabase
        .from('debts')
        .select('*')
        .eq('customer_id', customer_id)
        .neq('status', 'yopilgan')
        .order('created_at', { ascending: true }),
      supabase.from('customers').select('*').eq('id', customer_id).single(),
    ]);

    if (fetchError) throw fetchError;

    if (!debts || debts.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Bu mijozda ochiq qarz yo'q" }),
      };
    }

    // Avval - qaysi qarzga qancha borishini XOTIRADA hisoblaymiz (DB'ga tegmasdan)
    const updates = [];
    for (const debt of debts) {
      if (amountLeft <= 0) break;

      const remaining = debt.total_amount - debt.paid_amount;
      if (remaining <= 0) continue;

      const applyAmount = Math.min(remaining, amountLeft);
      const newPaidAmount = debt.paid_amount + applyAmount;
      const newStatus = newPaidAmount >= debt.total_amount ? 'yopilgan' : 'qisman_tolangan';

      updates.push({ debtId: debt.id, applyAmount, newPaidAmount, newStatus });
      amountLeft -= applyAmount;
    }

    // Endi hisoblangan barcha yozuvlarni BIR VAQTDA (parallel) DB'ga yozamiz
    await Promise.all(
      updates.flatMap((u) => [
        supabase.from('debts').update({ paid_amount: u.newPaidAmount, status: u.newStatus }).eq('id', u.debtId),
        supabase.from('payments').insert({ debt_id: u.debtId, amount: u.applyAmount }),
      ])
    );

    // Yangi umumiy qoldiqni QAYTA SO'ROV YUBORMASDAN, xotiradagi ma'lumotdan hisoblaymiz
    const updatesMap = {};
    updates.forEach((u) => { updatesMap[u.debtId] = u.newPaidAmount; });

    const totalRemaining = debts.reduce((sum, d) => {
      const paid = updatesMap[d.id] !== undefined ? updatesMap[d.id] : d.paid_amount;
      return sum + Math.max(d.total_amount - paid, 0);
    }, 0);

    const affectedCount = updates.length;

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
