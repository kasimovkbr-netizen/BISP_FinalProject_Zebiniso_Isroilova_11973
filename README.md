# 🍼 PediaMom — Bolalar Sog'ligi Platformasi

> Ota-onalar uchun aqlli sog'liq kuzatuv tizimi.
> **Stack: Vanilla JS + Node.js + Supabase (PostgreSQL) + Telegram Bot + Stripe + Gemini AI**

---

## 📋 Mundarija

- [🍼 PediaMom — Bolalar Sog'ligi Platformasi](#-pediamom--bolalar-sogligi-platformasi)
  - [📋 Mundarija](#-mundarija)
  - [Loyiha haqida](#loyiha-haqida)
  - [Texnologiyalar](#texnologiyalar)
  - [Tezkor ishga tushirish](#tezkor-ishga-tushirish)
  - [Muhit o'zgaruvchilari](#muhit-ozgaruvchilari)
  - [Ma'lumotlar bazasi](#malumotlar-bazasi)
    - [Supabase sozlash](#supabase-sozlash)
    - [Jadvallar](#jadvallar)
    - [Kredit ustuni qo'shish (agar yo'q bo'lsa)](#kredit-ustuni-qoshish-agar-yoq-bolsa)
  - [Loyiha tuzilmasi](#loyiha-tuzilmasi)
  - [API endpointlari](#api-endpointlari)
    - [Autentifikatsiya](#autentifikatsiya)
    - [Endpointlar ro'yxati](#endpointlar-royxati)
  - [Telegram Bot](#telegram-bot)
    - [Buyruqlar](#buyruqlar)
    - [Bildirishnomalar jadvali](#bildirishnomalar-jadvali)
    - [Chat ID olish](#chat-id-olish)
  - [To'lov tizimi](#tolov-tizimi)
    - [Kredit tizimi](#kredit-tizimi)
    - [Kredit paketlari](#kredit-paketlari)
    - [Stripe test kartasi](#stripe-test-kartasi)
    - [Stripe sozlash](#stripe-sozlash)
  - [Testlar](#testlar)
  - [Muhim eslatmalar](#muhim-eslatmalar)

---

## Loyiha haqida

PediaMom — ota-onalarga bolalarining sog'lig'ini kuzatishga yordam beruvchi to'liq stack veb-ilova.

> ⚠️ **Muhim:** Loyiha Firebase/Firestore dan **Supabase (PostgreSQL)** ga to'liq ko'chirilgan.
> `backend/functions/` papkasidagi eski Firebase Functions fayllar arxivlangan va ishlatilmaydi.

| Funksiya | Tavsif |
|---|---|
| 👶 Bolalar profili | Bola ma'lumotlarini saqlash |
| 💊 Dorilar | Dori jadvalini kuzatish |
| 💉 Emlash | O'zbekiston milliy emlash jadvali (20 ta vaksina) |
| 🧪 Tahlillar | Qon va vitamin tahlillari |
| 🤖 AI Tahlil | Gemini AI orqali natijalarni izohlash |
| 📚 Bilim bazasi | Bolalar sog'ligi maqolalari |
| 🤖 Telegram Bot | Barcha eslatmalar Telegram orqali |
| 💳 To'lov | Stripe orqali kredit sotib olish |
| 🩸 Hayz kuzatuvi | Ayollar sog'ligi va tsikl kuzatuvi |
| ⚙️ Sozlamalar | Profil, parol, dark mode |

---

## Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Frontend | Vanilla JS, HTML5, CSS3 |
| Backend | Node.js 18+, Express.js |
| Ma'lumotlar bazasi | **Supabase (PostgreSQL)** |
| Autentifikatsiya | **Supabase Auth** |
| AI | Google Gemini API (`gemini-2.5-flash-lite`) |
| To'lov | Stripe Checkout |
| Bot | Telegram Bot API (polling) |
| Scheduler | node-cron |

---

## Tezkor ishga tushirish

```bash
# 1. Loyihani yuklab oling
git clone <repo-url>
cd pediamom

# 2. Backend dependencies o'rnatish
cd backend
npm install

# 3. .env fayl yaratish
cp .env.example .env
# .env faylini to'ldiring (quyida ko'rsatilgan)

# 4. Supabase SQL migratsiyalarini ishga tushiring
# (supabase.com → SQL Editor — quyida batafsil)

# 5. Serverni ishga tushiring
node index.js

# 6. Frontend — VS Code Live Server bilan oching
# frontend/index.html → O'ng tugma → Open with Live Server
```

---

## Muhit o'zgaruvchilari

`backend/.env` fayli (`.env.example` dan nusxa oling):

```env
# ═══════════════════════════════════════════
# SUPABASE — Ma'lumotlar bazasi va Auth
# supabase.com → Loyiha → Settings → API
# ═══════════════════════════════════════════
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_JWT_SECRET=your-jwt-secret

# ═══════════════════════════════════════════
# GEMINI AI — AI tahlil uchun
# aistudio.google.com → Get API key
# ═══════════════════════════════════════════
GEMINI_API_KEY=AIzaSy...

# ═══════════════════════════════════════════
# TELEGRAM BOT — Bildirishnomalar uchun
# @BotFather → /newbot
# ═══════════════════════════════════════════
TELEGRAM_BOT_TOKEN=1234567890:AAF...

# ═══════════════════════════════════════════
# STRIPE — To'lov tizimi (ixtiyoriy)
# dashboard.stripe.com → Developers → API keys
# ═══════════════════════════════════════════
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ═══════════════════════════════════════════
# SERVER
# ═══════════════════════════════════════════
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://127.0.0.1:5500

# ═══════════════════════════════════════════
# KREDIT LIMITI
# ═══════════════════════════════════════════
FREE_MONTHLY_CREDITS=10
FREE_ANALYSIS_LIMIT=10
DEFAULT_CURRENCY=usd
```

---

## Ma'lumotlar bazasi

### Supabase sozlash

1. [supabase.com](https://supabase.com) → yangi project yarating
2. **Settings → API** dan kerakli kalitlarni oling
3. **SQL Editor** da quyidagi fayllarni **tartib bilan** ishga tushiring:

```
1. backend/scripts/schema.sql              ← Asosiy jadvallar
2. backend/scripts/run_all_migrations.sql  ← Qo'shimcha ustunlar
3. backend/scripts/triggers.sql           ← Yangi user → 50 kredit
4. backend/scripts/rls.sql                ← Row Level Security
```

### Jadvallar

| Jadval | Tavsif |
|---|---|
| `users` | Foydalanuvchilar (Supabase Auth bilan bog'liq) |
| `children` | Bolalar profillari |
| `medicine_list` | Dorilar ro'yxati |
| `medicine_logs` | Dori qabul jurnali |
| `vaccination_records` | Emlash yozuvlari (20 ta vaksina) |
| `medical_analyses` | Tibbiy tahlillar (qon, vitamin) |
| `knowledge_base` | Maqolalar |
| `saved_articles` | Saqlangan maqolalar |
| `water_intake` | Suv iste'moli maqsadi |
| `appointments` | Shifokor uchrashuvlari |
| `mother_health` | Ona sog'ligi ma'lumotlari |
| `cycle_history` | Hayz tsikli tarixi |

### Kredit ustuni qo'shish (agar yo'q bo'lsa)

```sql
-- Supabase SQL Editor da ishga tushiring
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 50;
UPDATE users SET credits = 50 WHERE credits = 0 OR credits IS NULL;
```

---

## Loyiha tuzilmasi

```
pediamom/
│
├── README.md                    ← Dokumentatsiya
├── START.md                     ← Terminal buyruqlari
├── firebase.json                ← Firebase Hosting (frontend deploy uchun)
├── .firebaserc                  ← Firebase project config
│
├── frontend/                    ← Vanilla JS + HTML + CSS
│   ├── index.html               ← Bosh sahifa (landing)
│   ├── 404.html
│   ├── assets/
│   │   └── logo_padiamom.png
│   ├── auth/
│   │   ├── login.html           ← Kirish sahifasi
│   │   ├── register.html        ← Ro'yxatdan o'tish
│   │   └── dashboard.html       ← Asosiy panel (SPA)
│   ├── css/
│   │   └── style.css            ← Barcha stillar + responsive + dark mode
│   └── js/
│       ├── supabase.js          ← Supabase client (CDN)
│       ├── auth.js              ← Login/Register/Logout
│       ├── dashboard.js         ← SPA router + page templates
│       ├── toast.js             ← Bildirishnoma UI
│       ├── uz_vaccine_schedule.js ← O'zbekiston emlash jadvali (ES module)
│       ├── vaccination_utils.js ← Emlash hisoblash funksiyalari
│       ├── vaccination.module.js
│       ├── children.module.js
│       ├── medicine.module.js
│       ├── daily_checklist.module.js
│       ├── addanalysis.module.js
│       ├── results.module.js
│       ├── knowledgebase.module.js
│       ├── savedarticles.module.js
│       ├── motherhealth.module.js
│       ├── pregnancy.module.js
│       ├── billing.module.js    ← Stripe to'lov
│       ├── settings.module.js
│       └── admin.module.js
│
└── backend/                     ← Node.js + Express
    ├── index.js                 ← Server entry point
    ├── .env                     ← Muhit o'zgaruvchilari (git da YO'Q)
    ├── .env.example             ← Namuna
    ├── package.json
    │
    ├── config/
    │   ├── supabase.js          ← Supabase admin client
    │   ├── stripe.js            ← Stripe client
    │   └── monetization.js      ← Narxlar konfiguratsiyasi
    │
    ├── middleware/
    │   ├── auth.js              ← Supabase JWT tekshiruvi
    │   ├── security.js          ← Rate limiting, sanitization
    │   └── validation.js        ← Input validatsiya
    │
    ├── routes/
    │   ├── ai.js                ← POST /api/analysis/ai
    │   ├── monetization.js      ← /api/monetization/*
    │   ├── telegram.js          ← /api/telegram/*
    │   └── webhooks.js          ← /api/webhooks/stripe
    │
    ├── services/
    │   ├── TelegramBot.js       ← Telegram bot (asosiy, polling)
    │   ├── TelegramNotifier.js  ← sendMessage() yordamchi
    │   ├── Scheduler.js         ← node-cron jobs
    │   └── runPoller.js         ← Alohida poller (ixtiyoriy)
    │
    ├── shared/
    │   └── uz_vaccine_schedule.js ← Emlash jadvali (CommonJS)
    │
    ├── scripts/
    │   ├── schema.sql           ← Asosiy jadvallar
    │   ├── run_all_migrations.sql ← Barcha migratsiyalar
    │   ├── triggers.sql         ← Supabase triggerlar
    │   ├── rls.sql              ← Row Level Security
    │   └── add_credits_column.sql ← Kredit ustuni
    │
    ├── functions/
    │   └── _archived_notifications.js ← ARXIV: eski Firebase Functions
    │
    └── test/
        └── services/            ← Property-based testlar (fast-check)
```

---

## API endpointlari

### Autentifikatsiya

Barcha `/api` endpointlari (webhook va health bundan mustasno) `Authorization: Bearer <token>` talab qiladi.

```javascript
// Token olish
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;

// So'rov yuborish
fetch('/api/analysis/ai', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Endpointlar ro'yxati

```
GET  /api/health                              ← Server holati

POST /api/analysis/ai                         ← AI tahlil
     Body: { analysisId, type, data }
     Kredit: blood=5, vitamin=4

GET  /api/monetization/status                 ← Kredit holati
GET  /api/monetization/credits/packages       ← Kredit paketlari
POST /api/monetization/credits/checkout       ← Stripe checkout
GET  /api/monetization/subscriptions/tiers    ← Obuna rejalari
POST /api/monetization/subscriptions/checkout ← Obuna checkout
DEL  /api/monetization/subscriptions/cancel   ← Obunani bekor qilish

POST /api/telegram/test                       ← Test xabar yuborish
POST /api/telegram/webhook                    ← Telegram webhook (bot)
GET  /api/telegram/setup                      ← Webhook URL sozlash

POST /api/webhooks/stripe                     ← Stripe to'lov webhook

DEL  /api/account                             ← Hisobni o'chirish
```

---

## Telegram Bot

### Buyruqlar

| Buyruq | Tavsif |
|---|---|
| `/start` | Bosh menyu (inline keyboard bilan) |
| `/today` | Bugungi dorilar ro'yxati |
| `/vaccines` | Emlash jadvali (kechikkan + yaqin 30 kun) |
| `/children` | Bolalar ro'yxati |
| `/credits` | Kredit balansi |
| `/status` | Hisob holati |
| `/chatid` | Chat ID ni ko'rish |
| `/test` | Test xabar |
| `/help` | Barcha buyruqlar |

### Bildirishnomalar jadvali

| Tur | Vaqt | Tavsif |
|---|---|---|
| 💊 Dori eslatmalari | Har soat | Dori jadvaliga qarab |
| 💧 Suv eslatmalari | Har soat | Belgilangan oraliqda |
| 💉 Emlash eslatmalari | Har kuni 09:00 Toshkent | Kechikkan va bugungi |
| 🏥 Shifokor uchrashuvlari | Har kuni 09:00 Toshkent | Bugun va 2 kundan keyin |
| 📚 Yangi maqolalar | Har 30 daqiqa | Yangi maqolalar chiqsa |

### Chat ID olish

```
1. Telegram → @PediaMomBot → /start
2. Bot Chat ID ni ko'rsatadi
3. Dashboard → Settings → Telegram Notifications
4. Chat ID ni kiriting → Saqlash
5. Test xabar keladi ✅
```

---

## To'lov tizimi

### Kredit tizimi

| Holat | Kredit |
|---|---|
| Yangi foydalanuvchi | 50 kredit (avtomatik) |
| Har oy bepul | 10 kredit |
| Qon tahlili | 5 kredit |
| Vitamin tahlili | 4 kredit |

### Kredit paketlari

| Paket | Kredit | Narx |
|---|---|---|
| Starter | 100 | $3.99 |
| Value | 300 | $8.99 |
| Pro | 800 | $19.99 |
| Monthly Plan | 500/oy | $14.99/oy |

### Stripe test kartasi

```
Karta:   4242 4242 4242 4242
Muddati: 12/34
CVV:     123
```

### Stripe sozlash

```bash
# Stripe CLI o'rnatish
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Webhook listener (server ishlab turgan paytda)
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Chiqadigan whsec_... ni .env ga qo'ying
```

---

## Testlar

```bash
cd backend

# Barcha testlar
npm test

# Faqat emlash testlari
npx jest --testPathPattern="vaccination" --no-coverage

# Faqat to'lov testlari
npx jest --testPathPattern="payment" --no-coverage

# Coverage bilan
npx jest --coverage
```

---

## Muhim eslatmalar

> ⚠️ **Firebase/Firestore ishlatilmaydi.** Loyiha to'liq Supabase ga ko'chirilgan.
> `backend/functions/_archived_notifications.js` — bu eski Firebase Functions fayli, arxivlangan.

> ⚠️ **`.env` faylini hech kimga yubormang** — u `.gitignore` da.

> ✅ **Yangi foydalanuvchi** ro'yxatdan o'tganda Supabase trigger avtomatik 50 kredit beradi.

---

*PediaMom — bolalar sog'ligi uchun 🍼*
