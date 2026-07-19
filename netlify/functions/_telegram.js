// netlify/functions/_telegram.js
// Telegram Bot API bilan gaplashish uchun yordamchi funksiya
// node-telegram-bot-api kutubxonasi kerak emas - to'g'ridan-to'g'ri
// Telegram serveriga so'rov yuboramiz (Node 18+ da fetch tayyor keladi)

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log('TELEGRAM_BOT_TOKEN sozlanmagan, xabar yuborilmadi');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.log('Telegram xabar xatosi:', data.description);
    }
  } catch (error) {
    console.log('Telegram xabar yuborishda xatolik:', error.message);
  }
}

function formatSum(amount) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}

module.exports = { sendTelegramMessage, formatSum };
