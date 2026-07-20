// netlify/functions/scheduled-reminder.js
//
// Bu funksiya ODAM BOSMAYDI - Netlify o'zi har kuni belgilangan
// vaqtda avtomatik ishga tushiradi (netlify.toml faylida sozlangan).
//
// Hozirgi sozlama: har kuni ertalab soat 9:00 (Toshkent vaqti)

const { sendDebtorReminders } = require('./_reminder-logic');

exports.handler = async () => {
  try {
    const result = await sendDebtorReminders();
    console.log(`Avtomatik eslatma yuborildi: ${result.sentCount} ta mijozga`);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.log('Avtomatik eslatma xatosi:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
