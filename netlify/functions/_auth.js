// netlify/functions/_auth.js
// Admin login tekshirish uchun oddiy token tizimi
//
// Netlify Functions "session" saqlay olmaydi (har so'rov mustaqil ishlaydi),
// shuning uchun oddiy usul: parol to'g'ri bo'lsa - doimiy token beramiz,
// frontend uni localStorage'da saqlaydi va har so'rovda yuboradi.

const crypto = require('crypto');

function getValidToken() {
  const secret = process.env.SESSION_SECRET || 'oddiy-maxfiy-kalit-buni-ozgartiring';
  return crypto.createHmac('sha256', secret).update('qarzdorlik-admin-tasdiqlangan').digest('hex');
}

function verifyAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  return token === getValidToken();
}

function unauthorizedResponse() {
  return {
    statusCode: 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Kirish talab qilinadi' }),
  };
}

module.exports = { getValidToken, verifyAuth, unauthorizedResponse };
