// netlify/functions/notify-debtors.js
// Admin panelda "Eslatma yuborish" tugmasi bosilganda ishga tushadi

const { verifyAuth, unauthorizedResponse } = require('./_auth');
const { sendDebtorReminders } = require('./_reminder-logic');

exports.handler = async (event) => {
  if (!verifyAuth(event)) return unauthorizedResponse();
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const result = await sendDebtorReminders();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, ...result }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
