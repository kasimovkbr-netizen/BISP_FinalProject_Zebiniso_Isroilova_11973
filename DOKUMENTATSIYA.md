# PediaMom — To'liq Loyiha Dokumentatsiyasi

> Versiya: 2.0.0 | 2026 | **Supabase + Node.js + Vanilla JS**
>
> ⚠️ Loyiha Firebase/Firestore dan **Supabase (PostgreSQL)** ga to'liq ko'chirilgan.
> `backend/functions/_archived_notifications.js` — eski Firebase Functions, arxivlangan, ishlatilmaydi.

---

Batafsil: **[README.md](./README.md)** | Terminal buyruqlari: **[START.md](./START.md)**

---

## 1. Loyiha haqida

**PediaMom** — ota-onalarga bolalarining sog'lig'ini kuzatib borish uchun mo'ljallangan zamonaviy veb-ilova.

### Asosiy funksiyalar

| Funksiya | Tavsif |
|---|---|
| 👶 Bolalar profili | Bola ma'lumotlarini saqlash (ism, yosh, jins, tug'ilgan sana) |
| 💊 Dorilar | Dori jadvalini boshqarish, kunlik tekshiruv ro'yxati |
| 💉 Emlash | O'zbekiston milliy emlash jadvali (20 ta vaksina) |
| 🧪 Tibbiy tahlil | Qon va vitamin tahlillarini kiritish va saqlash |
| 🤖 AI Tahlil | Gemini AI orqali tahlil natijalarini izohlash |
| 📚 Bilim bazasi | Ota-onalar uchun ta'limiy maqolalar (6 kategoriya) |
| 🤖 Telegram Bot | Barcha eslatmalar Telegram orqali |
| 💳 To'lov | Stripe orqali kredit sotib olish |
| 🩸 Hayz kuzatuvi | Ayollar sog'ligi va tsikl kuzatuvi |
| ⚙️ Sozlamalar | Profil, parol, dark mode, Telegram Chat ID |

---

## 2. Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Frontend | Vanilla JS (ES Modules), HTML5, CSS3 |
| Backend | Node.js 18+, Express.js 5 |
| **Ma'lumotlar bazasi** | **Supabase (PostgreSQL)** — Firebase EMAS |
| **Autentifikatsiya** | **Supabase Auth** — Firebase Auth EMAS |
| AI | Google Gemini API (gemini-2.5-flash-lite) |
| To'lov | Stripe Checkout |
| Bot | Telegram Bot API (polling rejimi) |
| Scheduler | node-cron |
| Testlar | Jest + fast-check (property-based) |

---

## 3. Loyiha tuzilmasi

```
pediamom/
├── README.md                          ← Asosiy dokumentatsiya
├── START.md                           ← Terminal buyruqlari
├── DOKUMENTATSIYA.md                  ← Ushbu fayl
├── firebase.json                      ← Firebase Hosting (faqat frontend deploy)
├── .firebaserc                        ← Firebase project config
│
├── frontend/                          ← Vanilla JS + HTML + CSS
│   ├── index.html                     ← Bosh sahifa (landing)
│   ├── 404.html
│   ├── assets/logo_padiamom.png
│   ├── auth/
│   │   ├── login.html                 ← Kirish
│   │   ├── register.html              ← Ro'yxatdan o'tish
│   │   └── dashboard.html             ← Asosiy SPA panel
│   ├── css/style.css                  ← Barcha stillar + responsive + dark mode
│   └── js/
│       ├── supabase.js                ← Supabase client (CDN orqali)
│       ├── auth.js                    ← Login/Register/Logout/Auth guard
│       ├── dashboard.js               ← SPA router + sahifa shablonlari
│       ├── toast.js                   ← Bildirishnoma UI
│       ├── uz_vaccine_schedule.js     ← O'zbekiston emlash jadvali (ES module)
│       ├── vaccination_utils.js       ← Emlash hisoblash funksiyalari
│       ├── vaccination.module.js      ← Emlash tracker UI
│       ├── children.module.js         ← Bolalar CRUD
│       ├── medicine.module.js         ← Dorilar boshqaruvi
│       ├── daily_checklist.module.js  ← Kunlik dori tekshiruvi
│       ├── addanalysis.module.js      ← Tahlil qo'shish + AI
│       ├── results.module.js          ← Tahlil tarixi + grafik
│       ├── knowledgebase.module.js    ← Bilim bazasi
│       ├── savedarticles.module.js    ← Saqlangan maqolalar
│       ├── motherhealth.module.js     ← Ona sog'ligi
│       ├── pregnancy.module.js        ← Hayz taqvimi
│       ├── billing.module.js          ← Stripe to'lov UI
│       ├── settings.module.js         ← Sozlamalar
│       └── admin.module.js            ← Admin panel
│
└── backend/                           ← Node.js + Express
    ├── index.js                       ← Server entry point
    ├── .env                           ← Muhit o'zgaruvchilari (git da YO'Q)
    ├── .env.example                   ← Namuna
    ├── package.json
    ├── config/
    │   ├── supabase.js                ← Supabase admin client
    │   ├── stripe.js                  ← Stripe client
    │   └── monetization.js            ← Narxlar konfiguratsiyasi
    ├── middleware/
    │   ├── auth.js                    ← Supabase JWT tekshiruvi
    │   ├── security.js                ← Rate limiting, sanitization
    │   └── validation.js              ← Input validatsiya
    ├── routes/
    │   ├── ai.js                      ← POST /api/analysis/ai
    │   ├── monetization.js            ← /api/monetization/*
    │   ├── telegram.js                ← /api/telegram/*
    │   └── webhooks.js                ← /api/webhooks/stripe
    ├── services/
    │   ├── TelegramBot.js             ← Telegram bot (asosiy)
    │   ├── TelegramNotifier.js        ← sendMessage() yordamchi
    │   ├── Scheduler.js               ← node-cron jobs
    │   └── runPoller.js               ← Alohida poller (ixtiyoriy)
    ├── shared/
    │   └── uz_vaccine_schedule.js     ← Emlash jadvali (CommonJS)
    ├── scripts/
    │   ├── schema.sql                 ← Asosiy jadvallar
    │   ├── run_all_migrations.sql     ← Barcha migratsiyalar
    │   ├── triggers.sql               ← Supabase triggerlar
    │   ├── rls.sql                    ← Row Level Security
    │   └── add_credits_column.sql     ← Kredit ustuni
    ├── functions/
    │   └── _archived_notifications.js ← ARXIV: eski Firebase Functions
    └── test/
        └── services/                  ← Property-based testlar
```

---

## 4. Ishga tushirish

### Talablar

- Node.js 18 yoki undan yuqori
- Supabase hisob ([supabase.com](https://supabase.com))
- Google Gemini API key ([aistudio.google.com](https://aistudio.google.com))
- Telegram bot tokeni ([@BotFather](https://t.me/BotFather))
- Stripe hisob (ixtiyoriy, to'lov uchun)

### O'rnatish

```bash
# 1. Loyihani yuklab oling
git clone <repo-url>
cd pediamom

# 2. Backend dependencies
cd backend
npm install

# 3. .env fayl yaratish
cp .env.example .env
# .env faylini to'ldiring
```

### Supabase SQL migratsiyalari (bir marta)

[supabase.com](https://supabase.com) → Loyihangiz → **SQL Editor** da ketma-ket:

```
1. backend/scripts/schema.sql
2. backend/scripts/run_all_migrations.sql
3. backend/scripts/triggers.sql
4. backend/scripts/rls.sql
```

### Serverni ishga tushirish

```bash
cd backend
node index.js
```

### Frontend

VS Code → `frontend/index.html` → **O'ng tugma → Open with Live Server**

---

## 5. Muhit o'zgaruvchilari

```env
# SUPABASE — supabase.com → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_JWT_SECRET=your-jwt-secret

# GEMINI AI — aistudio.google.com
GEMINI_API_KEY=AIzaSy...

# TELEGRAM BOT — @BotFather
TELEGRAM_BOT_TOKEN=1234567890:AAF...

# STRIPE — dashboard.stripe.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SERVER
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://127.0.0.1:5500
FREE_MONTHLY_CREDITS=10
```

---

## 6. Frontend arxitekturasi

### SPA Router

`dashboard.html` ichida ishlaydi. `dashboard.js` navigatsiyani boshqaradi:

```
Menyu tugmasi bosiladi
  → pages[pageKey] HTML shabloni yuklandi
  → import('./module.js') dinamik import
  → module.initXxx() chaqiriladi
  → window.__destroyCurrentPage = module.destroyXxx
```

### Sahifa modullari

| Modul | Init funksiya | Tavsif |
|---|---|---|
| `children.module.js` | `initChildrenModule()` | Bolalar CRUD, modal, real-time |
| `medicine.module.js` | `initMedicineModule()` | Dorilar boshqaruvi |
| `daily_checklist.module.js` | `initDailyChecklist()` | Kunlik dori tekshiruvi |
| `vaccination.module.js` | `initVaccinationModule()` | Emlash tracker |
| `addanalysis.module.js` | `initAddAnalysisModule()` | Tahlil + AI |
| `results.module.js` | `initResultsModule()` | Tahlil tarixi |
| `knowledgebase.module.js` | `initKnowledgeBaseModule()` | Maqolalar |
| `savedarticles.module.js` | `initSavedArticlesModule()` | Saqlangan |
| `motherhealth.module.js` | `initMotherHealthModule()` | Ona sog'ligi |
| `pregnancy.module.js` | `initPregnancyModule()` | Hayz taqvimi |
| `billing.module.js` | `initBillingModule()` | To'lov |
| `settings.module.js` | `initSettingsModule()` | Sozlamalar |
| `admin.module.js` | `initAdminModule()` | Admin panel |

### Toast xabarlari

```javascript
import { toast } from './toast.js';
toast('Saqlandi!', 'success');   // Yashil
toast('Xato!', 'error');         // Qizil
toast('Diqqat!', 'warning');     // Sariq
toast('Ma\'lumot', 'info');      // Ko'k
```

### Dark Mode

- Settings → toggle orqali yoqiladi
- `localStorage` da saqlanadi
- `document.body.dataset.theme = 'dark'` orqali qo'llaniladi

---

## 7. Backend arxitekturasi

### Middleware zanjiri

```
So'rov → CORS → securityHeaders → limitRequestSize
       → express.json() → sanitizeInput → apiLimiter
       → securityLogger → authenticateUser (Supabase JWT)
       → Route handler
```

### API endpointlari

```
GET  /api/health                              ← Server holati

POST /api/analysis/ai                         ← Gemini AI tahlil
     Body: { analysisId, type, data }
     Kredit: blood=5, vitamin=4

GET  /api/monetization/status                 ← Kredit holati
GET  /api/monetization/credits/packages       ← Kredit paketlari
POST /api/monetization/credits/checkout       ← Stripe checkout
GET  /api/monetization/subscriptions/tiers    ← Obuna rejalari
POST /api/monetization/subscriptions/checkout ← Obuna checkout
DEL  /api/monetization/subscriptions/cancel   ← Obunani bekor qilish

POST /api/telegram/test                       ← Test xabar
POST /api/telegram/webhook                    ← Telegram webhook
GET  /api/telegram/setup                      ← Webhook URL sozlash

POST /api/webhooks/stripe                     ← Stripe to'lov webhook
DEL  /api/account                             ← Hisobni o'chirish
```

---

## 8. Supabase ma'lumotlar bazasi

### Jadvallar

| Jadval | Tavsif |
|---|---|
| `users` | Foydalanuvchilar (Supabase Auth bilan bog'liq) |
| `children` | Bolalar profillari |
| `medicine_list` | Dorilar ro'yxati |
| `medicine_logs` | Dori qabul jurnali |
| `vaccination_records` | Emlash yozuvlari |
| `medical_analyses` | Tibbiy tahlillar |
| `knowledge_base` | Maqolalar |
| `saved_articles` | Saqlangan maqolalar |
| `water_intake` | Suv iste'moli |
| `appointments` | Shifokor uchrashuvlari |
| `mother_health` | Ona sog'ligi |
| `cycle_history` | Hayz tsikli tarixi |

### `users` jadval tuzilmasi

```sql
id               UUID PRIMARY KEY  -- Supabase Auth UID
email            TEXT
display_name     TEXT
role             TEXT DEFAULT 'parent'
telegram_chat_id TEXT
credits          INTEGER DEFAULT 50
free_credits_used INTEGER DEFAULT 0
stripe_customer_id TEXT
stripe_subscription_id TEXT
subscription_status TEXT
subscription_period_end TIMESTAMPTZ
created_at       TIMESTAMPTZ
```

### `vaccination_records` jadval tuzilmasi

```sql
id             UUID PRIMARY KEY
child_id       UUID → children(id) CASCADE
parent_id      UUID → users(id) CASCADE
vaccine_name   TEXT
scheduled_date DATE
taken_date     DATE
status         TEXT  -- 'pending' | 'taken' | 'overdue'
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```

### Trigger — yangi foydalanuvchiga 50 kredit

```sql
-- backend/scripts/triggers.sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, credits, created_at)
  VALUES (NEW.id, NEW.email, 'parent', 50, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 9. Autentifikatsiya

### Supabase Auth

- Email/parol autentifikatsiyasi
- `supabase.auth.onAuthStateChange()` orqali holat kuzatiladi
- Autentifikatsiya qilinmagan foydalanuvchilar `login.html` ga yo'naltiriladi
- Admin roli `users.role = 'admin'` da saqlanadi

### Backend JWT tekshiruvi

```javascript
// middleware/auth.js
const { data: { user } } = await supabase.auth.getUser(token);
req.user = { uid: user.id, email: user.email };
```

---

## 10. Telegram Bot

### Buyruqlar

| Buyruq | Tavsif |
|---|---|
| `/start` | Bosh menyu (inline keyboard) |
| `/today` | Bugungi dorilar |
| `/vaccines` | Emlash jadvali |
| `/children` | Bolalar ro'yxati |
| `/credits` | Kredit balansi |
| `/status` | Hisob holati |
| `/chatid` | Chat ID ko'rish |
| `/test` | Test xabar |
| `/help` | Barcha buyruqlar |

### Bildirishnomalar jadvali

| Tur | Vaqt |
|---|---|
| 💊 Dori eslatmalari | Har soat (dori jadvaliga qarab) |
| 💧 Suv eslatmalari | Har soat |
| 💉 Emlash eslatmalari | Har kuni 09:00 Toshkent (04:00 UTC) |
| 🏥 Shifokor uchrashuvlari | Har kuni 09:00 Toshkent |
| 📚 Yangi maqolalar | Har 30 daqiqa |

### Chat ID olish

```
1. Telegram → @PediaMomBot → /start
2. Bot Chat ID ni ko'rsatadi
3. Dashboard → Settings → Telegram Notifications
4. Chat ID kiriting → Saqlash → Test xabar keladi ✅
```

---

## 11. To'lov tizimi

### Kredit tizimi

| Holat | Kredit |
|---|---|
| Yangi foydalanuvchi | 50 kredit (trigger orqali) |
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

### To'lov oqimi

```
1. "Sotib olish" bosiladi
2. POST /api/monetization/credits/checkout
3. Stripe Checkout URL qaytadi
4. Foydalanuvchi Stripe sahifasiga o'tadi
5. To'lov → dashboard.html?payment=success
6. Stripe webhook → /api/webhooks/stripe
7. Backend → Supabase da credits qo'shiladi
```

---

## 12. O'zbekiston Emlash Jadvali

20 ta vaksina, tug'ilgan kundan o'tgan kunlar asosida:

| Kun | Vaksina |
|---|---|
| 0 | BCG, HepB-1 |
| 60 (2 oy) | OPV-1, DTP-1, HepB-2, Hib-1 |
| 90 (3 oy) | OPV-2, DTP-2, Hib-2 |
| 120 (4 oy) | OPV-3, DTP-3, HepB-3, Hib-3 |
| 365 (12 oy) | MMR-1, Varicella |
| 548 (18 oy) | DTP-4, OPV-4 |
| 730 (24 oy) | HepA |
| 2190 (6 yosh) | MMR-2, DTP-5 |

---

## 13. Testlar

```bash
cd backend

# Barcha testlar
npm test

# Faqat emlash testlari
npx jest --testPathPattern="vaccination" --no-coverage

# Coverage bilan
npx jest --coverage
```

### Test fayllari

| Fayl | Tavsif |
|---|---|
| `vaccination_schedule.property.test.js` | Emlash sanasi hisoblash |
| `vaccination_status.property.test.js` | Status aniqlash |
| `vaccination_duplicate.property.test.js` | Dublikat oldini olish |
| `vaccination_relative_scheduling.property.test.js` | Nisbiy jadval |
| `vaccination_pending_recalc.property.test.js` | Tug'ilgan sana o'zgarganda |
| `vaccination_schema.property.test.js` | Schema to'liqligi |
| `telegram_chatid.property.test.js` | Telegram ID validatsiya |
| `vaccination_scheduler.property.test.js` | Scheduler xato izolyatsiyasi |
| `dashboard_template.test.js` | UI elementlari tekshiruvi |

---

## 14. Deploy

### Frontend (Firebase Hosting)

```bash
# firebase.json da frontend papkasi ko'rsatilgan
firebase deploy --only hosting
```

### Backend

Backend standalone Express server — istalgan Node.js hosting da ishlaydi:
- Railway, Render, Heroku, VPS

```bash
# Production
NODE_ENV=production node index.js
```

---

## 15. Muhim eslatmalar

> ⚠️ **Firebase/Firestore ishlatilmaydi** — faqat Supabase.

> ⚠️ **`backend/functions/_archived_notifications.js`** — eski Firebase Functions, arxivlangan.

> ⚠️ **`.env` faylini hech kimga yubormang** — u `.gitignore` da.

> ✅ **Yangi foydalanuvchi** ro'yxatdan o'tganda Supabase trigger 50 kredit beradi.

> ✅ **Firebase Hosting** faqat frontend uchun ishlatiladi (statik fayllar).
