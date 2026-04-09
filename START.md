# 🚀 PediaMom — Terminal Buyruqlari

## Birinchi marta o'rnatish

```bash
# 1. Backend papkasiga o'ting
cd backend

# 2. Dependencies o'rnatish
npm install

# 3. .env fayl yaratish
cp .env.example .env
```

`.env` faylini oching va to'ldiring:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=AIzaSy...
TELEGRAM_BOT_TOKEN=1234567890:AAF...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://127.0.0.1:5500
```

---

## Supabase SQL migratsiyalari (bir marta)

[supabase.com](https://supabase.com) → Loyihangiz → **SQL Editor** da ketma-ket:

```
1. backend/scripts/schema.sql
2. backend/scripts/run_all_migrations.sql
3. backend/scripts/triggers.sql
4. backend/scripts/rls.sql
```

---

## Har kuni ishga tushirish

### Terminal 1 — Backend server

```bash
cd backend
node index.js
```

Muvaffaqiyatli natija:
```
✅ Stripe configuration validated successfully
✅ PediaMom API server running on port 3001
🤖 Telegram bot started (polling)
⏰ Scheduler started
```

### Terminal 2 — Stripe webhook (to'lov uchun)

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

Chiqadigan `whsec_...` ni `backend/.env` ga qo'ying, serverni restart qiling.

### Terminal 3 — Frontend

VS Code da `frontend/index.html` → **O'ng tugma → Open with Live Server**

Yoki brauzerda: `http://127.0.0.1:5500/frontend/index.html`

---

## Muammolarni hal qilish

### Server javob bermayapti (port band)

```bash
# Portni tozalash
lsof -i :3001 -t | xargs kill -9

# Qayta ishga tushirish
cd backend && node index.js
```

### Supabase ulanishni tekshirish

```bash
cd backend
node -e "
require('dotenv').config();
const { supabase } = require('./config/supabase');
supabase.from('users').select('count').then(({data, error}) => {
  console.log(error ? 'XATO: ' + error.message : 'Supabase ulandi ✅');
  process.exit(0);
});
"
```

### Telegram bot tekshirish

```bash
# Bot tokenini tekshirish
curl https://api.telegram.org/bot<TOKEN>/getMe

# Test xabar yuborish (server ishlab turgan paytda)
# Dashboard → Settings → Telegram Notifications → Saqlash
```

### Kredit qo'shish (Supabase SQL Editor)

```sql
-- Bitta foydalanuvchiga kredit qo'shish
UPDATE users SET credits = credits + 100 WHERE email = 'your@email.com';

-- Barcha foydalanuvchilarga 50 kredit (agar 0 bo'lsa)
UPDATE users SET credits = 50 WHERE credits = 0 OR credits IS NULL;
```

### AI tahlil ishlamayapti (Gemini quota)

```bash
# Yangi API key olish: aistudio.google.com → Get API key
# .env da yangilash:
# GEMINI_API_KEY=yangi_key_bu_yerga

# Keyin serverni restart qiling
```

---

## Stripe to'liq sozlash

```bash
# 1. Stripe CLI o'rnatish (bir marta)
brew install stripe/stripe-cli/stripe

# 2. Login (bir marta)
stripe login

# 3. Webhook listener (har safar server ishlaganda)
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Chiqadigan whsec_... ni backend/.env ga qo'ying
```

Test karta: `4242 4242 4242 4242` | `12/34` | `123`

---

## Testlar

```bash
cd backend

# Barcha testlar
npm test

# Faqat emlash testlari
npx jest --testPathPattern="vaccination" --no-coverage

# Coverage bilan
npx jest --coverage
```

---

## Barcha buyruqlar — qisqacha

```bash
# Dependencies o'rnatish
cd backend && npm install

# Server ishga tushirish
cd backend && node index.js

# Stripe webhook
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Port tozalash
lsof -i :3001 -t | xargs kill -9

# Testlar
cd backend && npm test

# Supabase tekshirish
cd backend && node -e "require('dotenv').config(); const {supabase}=require('./config/supabase'); supabase.from('users').select('count').then(r=>console.log(r.error?'XATO':'OK ✅')).catch(e=>console.log('XATO:',e.message))"
```

---

> ⚠️ **Firebase ishlatilmaydi** — loyiha to'liq Supabase ga ko'chirilgan.
> `backend/functions/_archived_notifications.js` — arxivlangan eski fayl.


---

## Admin qilish

```sql
-- Supabase SQL Editor da:
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Admin panel imkoniyatlari:
- 📊 Dashboard — foydalanuvchilar, bolalar, tahlillar statistikasi
- 👥 Foydalanuvchilar — kredit qo'shish, rol o'zgartirish
- 📚 Maqolalar — qo'shish, tahrirlash, o'chirish
- 🪙 Kreditlar — eng ko'p/eng kam kreditlilar, ommaviy kredit berish
- 💬 Fikrlar — qo'llab-quvvatlash so'rovlari
