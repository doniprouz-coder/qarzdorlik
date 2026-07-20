// netlify/functions/_reminder-logic.js
// Qarzi bor mijozlarga eslatma yuborish logikasi
// Bu fayl ikki joyda ishlatiladi:
//   1. notify-debtors.js - admin "Eslatma yuborish" tugmasini bosganda
//   2. scheduled-reminder.js - har kuni avtomatik (soat 9:00da)

const { getClient } = require('./_supabase');
const { sendTelegramMessage, formatSum } = require('./_telegram');

const REMINDER_TEXT =
  `Assalomu alaykum. Eslatib o'tmoqchiman, sizda bizdan qolgan qarz mavjud. ` +
  `Imkoningiz bo'lsa, yaqin kunlarda to'lab qo'ysangiz minnatdor bo'lardik.\n\n` +
  `Qarz inson zimmasidagi mas'uliyatdir. Uni vaqtida ado etish ham bu dunyo, ` +
  `ham oxirat uchun xotirjamlik beradi.\n\n` +
  `Rahmat.`;

async function sendDebtorReminders() {
  const supabase = getClient();

  // Telegram'da ro'yxatdan o'tgan barcha mijozlarni olamiz
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('*')
    .not('telegram_id', 'is', null);

  if (customersError) throw customersError;

  // Yopilmagan qarzlarni olamiz
  const { data: debts, error: debtsError } = await supabase
    .from('debts')
    .select('customer_id, total_amount, paid_amount')
    .neq('status', 'yopilgan');

  if (debtsError) throw debtsError;

  // Mijoz bo'yicha qarzlarni jamlaymiz
  const debtMap = {};
  (debts || []).forEach((d) => {
    debtMap[d.customer_id] = (debtMap[d.customer_id] || 0) + (d.total_amount - d.paid_amount);
  });

  // Faqat qarzi > 0 bo'lgan mijozlarni tanlaymiz
  const debtors = (customers || []).filter((c) => (debtMap[c.id] || 0) > 0);

  let sentCount = 0;
  for (const debtor of debtors) {
    const amount = debtMap[debtor.id];
    const message = `${REMINDER_TEXT}\n\n💰 Qarz summasi: ${formatSum(amount)}`;

    await sendTelegramMessage(debtor.telegram_id, message);
    sentCount++;
  }

  return { sentCount, totalDebtors: debtors.length };
}

module.exports = { sendDebtorReminders };
