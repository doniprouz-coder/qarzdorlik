// netlify/functions/telegram-webhook.js
//
// YANGILANGAN VERSIYA:
// 1. Vergul shart emas - "Ism Familiya +998901234567" formatida yuborsa yetarli
// 2. Agar admin oldindan shu telefon bilan mijoz qo'shgan bo'lsa - dublikat
//    yaratmaydi, balki o'sha eski yozuvga Telegram'ni ulaydi

const { getClient } = require('./_supabase');
const { sendTelegramMessage, formatSum } = require('./_telegram');

// ============================================
// YORDAMCHI FUNKSIYALAR
// ============================================

// Matndan telefon raqamini topib olish (format qanday bo'lishidan qat'iy nazar)
function extractPhone(text) {
  const match = text.match(/(\+?\d[\d\-\s]{7,17}\d)/);
  return match ? match[1] : null;
}

// Telefon raqamini solishtirish uchun - faqat oxirgi 9 ta raqamni olamiz
// (bu O'zbekiston mobil raqamlari uzunligi, +998, 998, yoki 0 bilan
// boshlanishidan qat'iy nazar to'g'ri solishtiradi)
function normalizePhoneKey(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-9);
}

// Telefon raqamini matndan olib tashlab, qolganini ism sifatida qaytaradi
function extractName(text, phoneRaw) {
  let name = text.replace(phoneRaw, '');
  name = name.replace(/[,\-–—]+/g, ' '); // vergul, tire va h.k. tozalash
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const update = JSON.parse(event.body || '{}');
  const message = update.message;

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
            `Ro'yxatdan o'tish uchun ism va telefon raqamingizni yuboring:\n\n` +
            `Aziz Karimov +998901234567`
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

      let msg = '';

      if (!debts || debts.length === 0) {
        msg = `✅ Sizda qarz mavjud emas!`;
      } else {
        msg = `💰 Sizning qarzlaringiz:\n\n`;
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
      }

      // Keshbek ma'lumotini har doim qo'shamiz (qarzi bo'lsa ham, bo'lmasa ham)
      const cashback = customer.cashback_balance || 0;
      msg += `\n\n🎁 To'plangan keshbek: ${formatSum(cashback)}`;

      await sendTelegramMessage(chatId, msg);
      return { statusCode: 200, body: 'ok' };
    }

    // ============================================
    // RO'YXATDAN O'TISH (vergul shart emas)
    // Matnda telefon raqami topilsa - ro'yxatdan o'tish deb hisoblanadi
    // ============================================
    const phoneRaw = extractPhone(text);

    if (phoneRaw) {
      // Avval - bu odam allaqachon Telegram orqali ro'yxatdan o'tganmi?
      const { data: existingByTelegram } = await supabase
        .from('customers')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (existingByTelegram) {
        await sendTelegramMessage(
          chatId,
          `Siz allaqachon ro'yxatdan o'tgansiz.\n\n/qarz buyrug'ini yuboring.`
        );
        return { statusCode: 200, body: 'ok' };
      }

      const name = extractName(text, phoneRaw);

      if (!name) {
        await sendTelegramMessage(
          chatId,
          `Iltimos, ism va telefon raqamingizni birga yuboring:\n\nAziz Karimov +998901234567`
        );
        return { statusCode: 200, body: 'ok' };
      }

      const phoneKey = normalizePhoneKey(phoneRaw);

      // MUHIM: Admin oldindan shu telefon bilan mijoz qo'shganmi?
      // (telegram_id hali bo'sh bo'lgan yozuvlarni tekshiramiz)
      const { data: candidates } = await supabase
        .from('customers')
        .select('*')
        .is('telegram_id', null)
        .not('phone', 'is', null);

      let matched = null;
      for (const c of candidates || []) {
        if (normalizePhoneKey(c.phone) === phoneKey) {
          matched = c;
          break;
        }
      }

      if (matched) {
        // DUBLIKAT YARATMAYMIZ - eski yozuvga Telegram'ni ulaymiz
        const { data: updated } = await supabase
          .from('customers')
          .update({
            telegram_id: telegramId,
            telegram_username: username,
          })
          .eq('id', matched.id)
          .select()
          .single();

        await sendTelegramMessage(
          chatId,
          `✅ Xush kelibsiz, ${updated.name}!\n\n` +
            `Siz bizning mijozlar ro'yxatida bor ekansiz, hisobingiz Telegram bilan ulandi.\n\n` +
            `Qarzingizni bilish uchun /qarz buyrug'ini yuboring.`
        );
        return { statusCode: 200, body: 'ok' };
      }

      // Mos kelmadi - yangi mijoz sifatida yaratamiz
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          name,
          phone: phoneRaw,
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
          `📱 Telefon: ${customer.phone}\n\n` +
          `Qarzingizni bilish uchun istalgan vaqtda /qarz buyrug'ini yuborishingiz mumkin.`
      );
      return { statusCode: 200, body: 'ok' };
    }

    // ============================================
    // TUSHUNARSIZ XABAR (telefon raqami topilmadi)
    // ============================================
    await sendTelegramMessage(
      chatId,
      `Tushunmadim 🤔\n\nMavjud buyruqlar:\n/start - Ro'yxatdan o'tish\n/qarz - Qarzni ko'rish`
    );
    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    console.log('Webhook xatosi:', error.message);
    return { statusCode: 200, body: 'ok' };
  }
};
