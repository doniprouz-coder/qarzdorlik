// netlify/functions/telegram-webhook.js
//
// MUHIM TUSHUNCHA: Netlify Functions "doim tinglab turolmaydi" (oddiy
// serverdan farqli). Shuning uchun bot boshqacha ishlaydi:
//
//   Eski usul (server):  Bot doim Telegram'ga "yangi xabar bormi?" deb so'raydi
//   Bu usul (Netlify):   Telegram o'zi, yangi xabar kelganda, BIZGA yozadi
//
// Bu "webhook" deyiladi. Buni sozlash uchun 1 marta maxsus link ochish kerak
// (QOLLANMA.md faylida ko'rsatilgan).
//
// Yana bir farq: bu funksiya har safar "toza holatda" ishga tushadi, hech
// narsani xotirada saqlay olmaydi. Shuning uchun ro'yxatdan o'tish oddiy
// qilib qilingan - ism va telefonni BITTA xabarda, vergul bilan ajratib
// yuborish orqali.

const { getClient } = require('./_supabase');
const { sendTelegramMessage, formatSum } = require('./_telegram');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const update = JSON.parse(event.body || '{}');
  const message = update.message;

  // Agar oddiy matn xabar bo'lmasa (masalan rasm), e'tiborsiz qoldiramiz
  if (!message || !message.text) {
    return { statusCode: 200, body: 'ok' };
  }

  const chatId = message.chat.id;
  const telegramId = String(message.from.id);
  const text = message.text.trim();
  const username = message.from.username || null;

  const supabase = getClient();

  try {
    // ============================================
    // /start - BOSHLASH
    // ============================================
    if (text === '/start') {
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (existing) {
        await sendTelegramMessage(
          chatId,
          `Salom, ${existing.name}! 👋\n\nSiz allaqachon ro'yxatdan o'tgansiz.\n\nQarzingizni bilish uchun /qarz buyrug'ini yuboring.`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `Assalomu alaykum! 👋\n\nQarzdorlik botiga xush kelibsiz.\n\n` +
            `Ro'yxatdan o'tish uchun ism va telefon raqamingizni SHU FORMATDA yuboring:\n\n` +
            `Aziz Karimov, +998901234567\n\n` +
            `(Ism bilan telefon orasiga vergul qo'ying)`
        );
      }
      return { statusCode: 200, body: 'ok' };
    }

    // ============================================
    // /qarz - QARZNI TEKSHIRISH
    // ============================================
    if (text === '/qarz') {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (!customer) {
        await sendTelegramMessage(
          chatId,
          `Siz hali ro'yxatdan o'tmagansiz.\n\nRo'yxatdan o'tish uchun /start buyrug'ini yuboring.`
        );
        return { statusCode: 200, body: 'ok' };
      }

      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('customer_id', customer.id)
        .neq('status', 'yopilgan');

      if (!debts || debts.length === 0) {
        await sendTelegramMessage(chatId, `✅ Sizda qarz mavjud emas!`);
        return { statusCode: 200, body: 'ok' };
      }

      let msg = `💰 Sizning qarzlaringiz:\n\n`;
      let total = 0;

      debts.forEach((d, i) => {
        const remaining = d.total_amount - d.paid_amount;
        total += remaining;
        msg += `${i + 1}. ${d.comment || 'Qarz'}\n`;
        msg += `   Jami: ${formatSum(d.total_amount)}\n`;
        msg += `   To'landi: ${formatSum(d.paid_amount)}\n`;
        msg += `   Qoldiq: ${formatSum(remaining)}\n\n`;
      });

      msg += `━━━━━━━━━━━━━\n💵 Umumiy qarz: ${formatSum(total)}`;

      await sendTelegramMessage(chatId, msg);
      return { statusCode: 200, body: 'ok' };
    }

    // ============================================
    // RO'YXATDAN O'TISH ("Ism, Telefon" formatida)
    // ============================================
    if (text.includes(',')) {
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (existing) {
        await sendTelegramMessage(chatId, `Siz allaqachon ro'yxatdan o'tgansiz.\n\n/qarz buyrug'ini yuboring.`);
        return { statusCode: 200, body: 'ok' };
      }

      const parts = text.split(',');
      const name = parts[0].trim();
      const phone = parts[1] ? parts[1].trim() : null;

      if (!name) {
        await sendTelegramMessage(
          chatId,
          `Iltimos, to'g'ri formatda yuboring:\n\nAziz Karimov, +998901234567`
        );
        return { statusCode: 200, body: 'ok' };
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          name,
          phone,
          telegram_id: telegramId,
          telegram_username: username,
        })
        .select()
        .single();

      if (error) {
        await sendTelegramMessage(chatId, `Xatolik yuz berdi, qayta urinib ko'ring.`);
        return { statusCode: 200, body: 'ok' };
      }

      await sendTelegramMessage(
        chatId,
        `✅ Muvaffaqiyatli ro'yxatdan o'tdingiz!\n\n` +
          `👤 Ism: ${customer.name}\n` +
          `📱 Telefon: ${customer.phone || 'kiritilmagan'}\n\n` +
          `Qarzingizni bilish uchun istalgan vaqtda /qarz buyrug'ini yuborishingiz mumkin.`
      );
      return { statusCode: 200, body: 'ok' };
    }

    // ============================================
    // TUSHUNARSIZ XABAR
    // ============================================
    await sendTelegramMessage(
      chatId,
      `Tushunmadim 🤔\n\nMavjud buyruqlar:\n/start - Ro'yxatdan o'tish\n/qarz - Qarzni ko'rish`
    );
    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    console.log('Webhook xatosi:', error.message);
    return { statusCode: 200, body: 'ok' }; // Telegram'ga har doim 200 qaytarish kerak
  }
};
