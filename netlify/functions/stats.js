// netlify/functions/stats.js
// Dashboard statistikasi - TEZLASHTIRILGAN: so'rovlar parallel bajariladi

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();

  const supabase = getClient();

  try {
    // Bir-biriga bog'liq bo'lmagan so'rovlarni BIR VAQTDA yuboramiz
    const [
      { count: totalCustomers },
      { data: debts },
      { data: settings },
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('debts').select('total_amount, paid_amount, status'),
      supabase.from('app_settings').select('stats_reset_at').eq('id', 1).maybeSingle(),
    ]);

    let totalDebt = 0;
    (debts || []).forEach((d) => {
      if (d.status !== 'yopilgan') {
        totalDebt += d.total_amount - d.paid_amount;
      }
    });

    // "Yig'ilgan pul" reset qilingan bo'lsa, faqat shu vaqtdan keyingi to'lovlar
    const resetAt = settings && settings.stats_reset_at;

    let paymentsQuery = supabase.from('payments').select('amount');
    if (resetAt) {
      paymentsQuery = paymentsQuery.gt('created_at', resetAt);
    }

    const { data: payments } = await paymentsQuery;
    const totalCollected = (payments || []).reduce((sum, p) => sum + p.amount, 0);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalCustomers: totalCustomers || 0,
        totalDebt,
        totalCollected,
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
