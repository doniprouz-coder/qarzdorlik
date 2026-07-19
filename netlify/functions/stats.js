// netlify/functions/stats.js
// Dashboard statistikasi - jami mijozlar, qarz, yig'ilgan pul

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();

  const supabase = getClient();

  try {
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { data: debts } = await supabase
      .from('debts')
      .select('total_amount, paid_amount, status');

    let totalDebt = 0;
    (debts || []).forEach((d) => {
      if (d.status !== 'yopilgan') {
        totalDebt += d.total_amount - d.paid_amount;
      }
    });

    const { data: payments } = await supabase.from('payments').select('amount');
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
