// netlify/functions/login.js
// Admin panelga kirish - parolni tekshiradi

const { getValidToken } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { password } = JSON.parse(event.body || '{}');

  if (password === process.env.ADMIN_PASSWORD) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, token: getValidToken() }),
    };
  }

  return {
    statusCode: 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: "Parol noto'g'ri" }),
  };
};
