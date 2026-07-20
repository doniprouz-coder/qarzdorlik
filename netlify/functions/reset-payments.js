// netlify/functions/reset-payments.js
// "Yig'ilgan pul" statistikasini 0 ga qaytaradi:
// - Barcha to'lovlar tarixini o'chiradi
// - Har bir qarzni "to'lanmagan" holatga qaytaradi
// - Mijozlar va qarz summalari O'ZGARMAYDI

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const supabase = getClient();

  try {
    // Barcha to'lovlarni o'chirish
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .neq('id', 0); // barcha qatorlarni o'chirish uchun shart

    if (deleteError) throw deleteError;

    // Barcha qarzlarni "to'lanmagan" holatga qaytarish
    const { error: updateError } = await supabase
      .from('debts')
      .update({ paid_amount: 0, status: 'qarzdor' })
      .neq('id', 0);

    if (updateError) throw updateError;

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
};
