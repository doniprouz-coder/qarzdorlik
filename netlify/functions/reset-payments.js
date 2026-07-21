// netlify/functions/reset-payments.js
//
// MUHIM: Bu funksiya endi HECH QANDAY qarz yoki to'lov yozuvini
// O'CHIRMAYDI va O'ZGARTIRMAYDI. Faqat "hisoblash nuqtasi"ni belgilaydi -
// shu vaqtdan keyingi to'lovlarni "Yig'ilgan pul"ga qo'shib hisoblaydi.
//
// Natijada:
//   - Qarzlar holati (to'langan/to'lanmagan) - O'ZGARMAYDI
//   - To'lov tarixi - SAQLANIB QOLADI
//   - Faqat "Yig'ilgan pul" ko'rsatkichi 0'dan qayta sanaladi

const { getClient } = require('./_supabase');
const { verifyAuth, unauthorizedResponse } = require('./_auth');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const supabase = getClient();

  try {
    const { error } = await supabase
      .from('app_settings')
      .update({ stats_reset_at: new Date().toISOString() })
      .eq('id', 1);

    if (error) throw error;

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
