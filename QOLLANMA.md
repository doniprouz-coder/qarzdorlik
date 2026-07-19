# Qarzdorlik - Netlify + Supabase Qo'llanmasi

Bu versiya **Netlify** (sizga tanish joy) va **Supabase** (bepul database) bilan ishlaydi.

**Qanday farq qiladi avvalgisidan:**
- Admin sahifa — Netlify'da (statik sayt sifatida)
- Database — Supabase'da (mijozlar, qarzlar shu yerda saqlanadi)
- Bot — Netlify Functions orqali (Telegram "webhook" usulida ishlaydi)

---

## 1-QADAM: Supabase'da Database Yaratish

### 1.1. Ro'yxatdan o'tish

1. https://supabase.com ga kiring
2. "Start your project" tugmasini bosing
3. GitHub bilan ro'yxatdan o'ting (bepul)

### 1.2. Yangi loyiha yaratish

1. "New Project" tugmasini bosing
2. Ma'lumotlarni to'ldiring:
   - **Name:** `qarzdorlik` (yoki xohlagan nom)
   - **Database Password:** kuchli parol o'ylab toping va **saqlab qo'ying**
   - **Region:** eng yaqin joyni tanlang (masalan Singapore)
3. "Create new project" bosing
4. **1-2 daqiqa kuting** — loyiha tayyorlanadi

### 1.3. Jadvallarni yaratish

1. Chap menyuda **"SQL Editor"** ni toping va bosing
2. "New query" tugmasini bosing
3. `supabase-schema.sql` faylidagi **barcha kodni** nusxalab, shu yerga joylashtiring
4. "Run" tugmasini bosing (yoki Ctrl+Enter)
5. Pastda "Success" degan yozuv chiqishi kerak

Tekshirish uchun chap menyuda **"Table Editor"** ga o'ting — 3 ta jadval ko'rinishi kerak: `customers`, `debts`, `payments`

### 1.4. Kalitlarni olish

1. Chap menyuda **"Settings"** (pastda, tishli g'ildirak belgisi)
2. **"API"** bo'limini bosing
3. Ikkita narsani nusxalab, biror joyga saqlang:
   - **Project URL** — masalan: `https://xxxxx.supabase.co`
   - **service_role key** (⚠️ "anon" key EMAS, "service_role" ni oling — pastroqda, "Reveal" bosib ko'ring)

**MUHIM:** `service_role` key — bu maxfiy kalit, hech kimga bermang, GitHub'ga yuklamang!

---

## 2-QADAM: Telegram Bot Yaratish

1. Telegram'da **@BotFather** ni toping
2. `/newbot` yozing
3. Bot uchun ism bering: `Mening Do'kon Bot`
4. Username bering (oxiri "bot" bilan): `mening_dokon_bot`
5. Sizga TOKEN beradi — nusxalab saqlang:
   ```
   7123456789:AAHkj3k2j4k5j6k7j8k9j0k1j2k3j4k5j6
   ```

**Hozircha botni sozlashni davom ettirmang** — avval saytni deploy qilishimiz kerak, chunki botga "qayerga xabar yuborish"ni ko'rsatish uchun tayyor sayt manzili kerak bo'ladi.

---

## 3-QADAM: Netlify'ga Deploy Qilish

### 3.1. GitHub'ga yuklash

```bash
cd qarzdorlik-netlify
git init
git add .
git commit -m "Birinchi versiya"
```

GitHub saytida yangi repository yarating (masalan `qarzdorlik`), keyin:
```bash
git remote add origin https://github.com/SIZNING_USERNAME/qarzdorlik.git
git push -u origin main
```

### 3.2. Netlify'da loyihani ulash

1. https://app.netlify.com ga kiring
2. "Add new site" → "Import an existing project"
3. "Deploy with GitHub" tanlang
4. Repository'ngizni (`qarzdorlik`) toping va tanlang
5. Sozlamalar avtomatik to'g'ri chiqadi (chunki `netlify.toml` fayli bor):
   - Build command: (bo'sh qoldiring)
   - Publish directory: `public`
6. **"Deploy site"** tugmasini bosing

### 3.3. Environment o'zgaruvchilarni kiritish

1. Netlify saytida loyihangizga kiring
2. **"Site configuration"** → **"Environment variables"**
3. **"Add a variable"** tugmasi bilan, birma-bir qo'shing:

| Nomi | Qiymati |
|------|---------|
| `ADMIN_PASSWORD` | O'zingiz xohlagan parol |
| `SESSION_SECRET` | Tasodifiy uzun matn (masalan: `abc123xyz789qwerty456`) |
| `SUPABASE_URL` | 1.4-qadamda olgan Project URL |
| `SUPABASE_SERVICE_KEY` | 1.4-qadamda olgan service_role key |
| `TELEGRAM_BOT_TOKEN` | 2-qadamda olgan bot token |

4. Har birini qo'shgandan keyin **"Save"** bosing

### 3.4. Qayta deploy qilish

Environment o'zgaruvchilar qo'shilgandan keyin, saytni qayta ishga tushirish kerak:

1. **"Deploys"** bo'limiga o'ting
2. **"Trigger deploy"** → **"Deploy site"** bosing
3. 1-2 daqiqa kuting

Sizga sayt manzili beriladi, masalan:
```
https://sizning-loyiha-nomi.netlify.app
```

### 3.5. Sinab ko'rish

1. Sayt manzilini oching
2. Parolni kiriting (ADMIN_PASSWORD qilib qo'ygan parolingiz)
3. Mijoz qo'shib ko'ring — ishlashi kerak!

---

## 4-QADAM: Telegram Botni Ulash (Webhook)

Endi saytimiz tayyor, botga "qachon xabar kelsa shu manzilga yuboraverish" deb aytamiz.

### 4.1. Webhook o'rnatish

Brauzeringizda, quyidagi manzilni oching (o'z TOKEN va SAYT manzilingiz bilan almashtirib):

```
https://api.telegram.org/bot SIZNING_TOKEN /setWebhook?url=https:// SIZNING_SAYT .netlify.app/api/telegram-webhook
```

**Aniq misol** (o'zingiznikiga moslang):
```
https://api.telegram.org/bot7123456789:AAHkj3k2j4k5j6k7j8k9j0k1j2k3j4k5j6/setWebhook?url=https://sizning-loyiha-nomi.netlify.app/api/telegram-webhook
```

Brauzerda shunday javob chiqishi kerak:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

`"ok":true` chiqsa — muvaffaqiyatli!

### 4.2. Botni sinab ko'rish

1. Telegramda botingizni toping
2. `/start` yuboring
3. Bot javob berishi kerak: "Assalomu alaykum..."
4. Ko'rsatilgan formatda yozing: `Aziz Karimov, +998901234567`
5. Bot "Muvaffaqiyatli ro'yxatdan o'tdingiz!" deb javob beradi
6. Admin panelda (saytingizda) shu mijoz paydo bo'lganini tekshiring!
7. Botga `/qarz` deb yozing — qarzingiz haqida ma'lumot beradi

---

## ✅ TAYYOR! To'liq ishlash tartibi

```
Siz admin panelda:
  → Mijoz qo'shasiz
  → Unga qarz yozasiz
        ↓
  Bot avtomatik mijozga xabar yuboradi:
  "Sizga yangi qarz qo'shildi: 50,000 so'm"
        ↓
  Mijoz istalgan vaqt botga /qarz yozib,
  qarzini tekshira oladi
        ↓
  Siz to'lov qabul qilib, admin panelda belgilaysiz
        ↓
  Bot mijozga: "To'lov qabul qilindi!" deb xabar beradi
```

---

## 🐛 Muammolarni Hal Qilish

### "Kirish talab qilinadi" xatosi doim chiqadi
→ Environment variables to'g'ri kiritilganini tekshiring (ADMIN_PASSWORD)
→ Qayta deploy qilib ko'ring (3.4-qadam)

### Bot javob bermayapti
→ Webhook to'g'ri o'rnatilganini tekshiring:
```
https://api.telegram.org/bot SIZNING_TOKEN /getWebhookInfo
```
Bu yerda `"url"` qismida sizning sayt manzilingiz ko'rinishi kerak

### "SUPABASE_URL yoki SUPABASE_SERVICE_KEY sozlanmagan" xatosi
→ Netlify'da Environment Variables to'g'ri kiritilganini tekshiring
→ `service_role` key ishlatilganini tekshiring (`anon` key emas)
→ Qayta deploy qiling

### Mijozlar ro'yxati bo'sh ko'rinadi
→ Supabase'da "Table Editor" ga kirib, `customers` jadvalida ma'lumot borligini tekshiring
→ Brauzerda F12 bosib, "Console" bo'limida xato bor-yo'qligini ko'ring

### Netlify Functions ishlamayapti
→ "Deploys" bo'limida oxirgi deploy statusini tekshiring — xato bo'lsa qizil rangda ko'rinadi
→ "Functions" bo'limida barcha funksiyalar ro'yxatda ko'rinishi kerak

---

## 📝 Lokalda Sinash (ixtiyoriy)

Agar deploy qilishdan oldin kompyuteringizda sinab ko'rmoqchi bo'lsangiz:

```bash
# Netlify CLI o'rnatish
npm install -g netlify-cli

# .env faylini yaratish
cp .env.example .env
# .env faylini to'ldiring (yuqoridagi kabi)

# Lokal serverni ishga tushirish
netlify dev
```

Brauzerda **http://localhost:8888** ochiladi.

**Eslatma:** Botni lokalda sinash qiyinroq, chunki Telegram'ga kompyuteringiz manzili ko'rinmaydi. Bot uchun to'g'ridan-to'g'ri Netlify'ga deploy qilib sinash osonroq.

---

## 🔐 Xavfsizlik Eslatmalari

- `SUPABASE_SERVICE_KEY` — hech kimga bermang, bu database'ga to'liq kirish huquqi
- `ADMIN_PASSWORD` — kuchli parol tanlang
- `.env` faylini **hech qachon** GitHub'ga yuklamang (`.gitignore` buni oldini oladi)

---

## 📊 Xulosa - Bosqichlar

```
1️⃣ Supabase'da loyiha yaratish
2️⃣ SQL sxemani ishga tushirish (jadvallar yaratish)
3️⃣ Kalitlarni olish (URL + service_role key)
4️⃣ Telegram bot yaratish (@BotFather)
5️⃣ GitHub'ga yuklash
6️⃣ Netlify'da deploy qilish
7️⃣ Environment variables kiritish
8️⃣ Qayta deploy qilish
9️⃣ Telegram webhook o'rnatish (1 marta link ochish)
🔟 Sinab ko'rish - tayyor!
```

Har bir qadamda savol tug'ilsa — qaysi raqamda qotilib qolganingizni ayting, birga hal qilamiz.
