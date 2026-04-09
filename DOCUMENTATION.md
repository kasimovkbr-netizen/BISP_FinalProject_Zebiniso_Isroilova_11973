# PediaMom — Full Project Documentation

> Version: 1.0.0 | Platform: Firebase + Node.js + Vanilla JS

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Backend Architecture](#7-backend-architecture)
8. [Firebase Functions](#8-firebase-functions)
9. [Telegram Bot](#9-telegram-bot)
10. [Payment System](#10-payment-system)
11. [API Reference](#11-api-reference)
12. [Database Schema (Firestore)](#12-database-schema-firestore)
13. [Authentication & Security](#13-authentication--security)
14. [Testing](#14-testing)
15. [Deployment](#15-deployment)

---

## 1. Project Overview

**PediaMom** is a web application designed for parents to track their children's health. It provides:

- Child health profile management
- Medicine and supplement tracking with daily checklists
- Medical analysis (blood, vitamin) with AI-powered interpretation
- Knowledge base with educational health articles
- Mother health tracking (water intake, appointments, pregnancy calendar)
- Telegram bot notifications for medicine reminders, vaccine schedules, and doctor appointments
- Freemium monetization with credit-based and subscription-based AI analysis

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES Modules), HTML5, CSS3 |
| Backend | Node.js 20, Express.js 5 |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Hosting | Firebase Hosting |
| Functions | Firebase Cloud Functions v2 |
| Payments | Stripe |
| Notifications | Telegram Bot API |
| Testing | Jest, fast-check (Property-Based Testing) |

---

## 3. Project Structure

```
pediamom/
├── frontend/                    # Static web app (Firebase Hosting)
│   ├── index.html               # Landing page
│   ├── 404.html                 # Error page
│   ├── assets/
│   │   └── logo_padiamom.png
│   ├── auth/
│   │   ├── dashboard.html       # Main SPA shell
│   │   ├── login.html
│   │   └── register.html
│   ├── css/
│   │   └── style.css            # All styles (light + dark mode)
│   ├── js/
│   │   ├── firebase.js          # Firebase SDK init
│   │   ├── auth.js              # Login / Register / Auth guard
│   │   ├── toast.js             # Toast notification utility
│   │   ├── dashboard.js         # SPA router + page templates
│   │   ├── children.module.js   # Children CRUD
│   │   ├── medicine.module.js   # Medicines + Supplements
│   │   ├── daily_checklist.module.js
│   │   ├── addanalysis.module.js
│   │   ├── results.module.js
│   │   ├── knowledgebase.module.js
│   │   ├── savedarticles.module.js
│   │   ├── motherhealth.module.js
│   │   ├── pregnancy.module.js
│   │   ├── admin.module.js
│   │   ├── billing.module.js    # Payment UI
│   │   └── settings.module.js
│   └── tests/
│       ├── bug-exploration.test.js
│       └── preservation.test.js
│
├── backend/                     # Firebase Cloud Functions + Express API
│   ├── index.js                 # Entry point — all function exports
│   ├── config/
│   │   ├── firebase.js          # Admin SDK init
│   │   ├── monetization.js      # Pricing config
│   │   └── stripe.js            # Stripe config
│   ├── middleware/
│   │   ├── auth.js              # Firebase token verification
│   │   ├── security.js          # Helmet, rate limiting, sanitization
│   │   └── validation.js        # Request body validation
│   ├── routes/
│   │   ├── analysis.js          # AI analysis endpoints
│   │   ├── monetization.js      # Credits + subscriptions
│   │   └── webhooks.js          # Stripe webhooks
│   ├── services/
│   │   ├── AIAnalysisEngine.js
│   │   ├── AnalysisService.js
│   │   ├── CreditSystem.js
│   │   ├── CreditValidator.js
│   │   ├── EnterpriseAccessControl.js
│   │   ├── FreemiumController.js
│   │   ├── HybridPaymentSystem.js
│   │   ├── PaymentGateway.js
│   │   ├── SubscriptionManager.js
│   │   ├── TelegramNotifier.js
│   │   ├── UsageNotificationService.js
│   │   └── UsageTracker.js
│   ├── models/
│   │   ├── FreeUsageTracking.js
│   │   ├── TransactionRecord.js
│   │   ├── UsageRecord.js
│   │   └── UserPaymentProfile.js
│   ├── functions/
│   │   └── notifications.js     # Scheduled Telegram reminders
│   └── scripts/
│       ├── initializeDatabase.js
│       └── seedKnowledgeBase.js
│
├── firebase.json                # Firebase project config
├── .firebaserc                  # Firebase project alias
└── .gitignore
```

---

## 4. Getting Started

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Firestore, Auth, Hosting, and Functions enabled

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd pediamom

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your values (see Section 5)

# 4. Login to Firebase
firebase login

# 5. Set Firebase project
firebase use --add
```

### Running Locally

```bash
# Start backend API server (Firebase Functions emulator)
cd backend
npm run serve

# Serve frontend (use VS Code Live Server or any static server)
# Open frontend/auth/dashboard.html in browser
```

> Note: On Windows PowerShell, run this first:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## 5. Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Environment
NODE_ENV=development

# API
API_BASE_URL=http://localhost:5001

# Frontend origin (CORS)
FRONTEND_URL=http://localhost:3000

# OpenAI (for AI analysis cost tracking)
OPENAI_API_KEY=sk-...

# Pricing
DEFAULT_CURRENCY=usd
FREE_ANALYSIS_LIMIT=5

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ANALYSIS_RATE_LIMIT_MAX=20

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

For production (Firebase Secret Manager):
```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set STRIPE_SECRET_KEY
```

---

## 6. Frontend Architecture

### SPA Router

The app is a Single Page Application (SPA) running inside `dashboard.html`. Navigation is handled by `dashboard.js` which:

1. Listens for sidebar menu clicks
2. Injects page HTML templates into `#page-content`
3. Dynamically imports the corresponding JS module

```javascript
// Example: navigating to "children" page
menuItem.click() 
  → content.innerHTML = pages.children
  → import('./children.module.js')
  → module.initChildrenModule()
```

### Page Modules

Each page is a self-contained ES module with an `init` function:

| Module | Function | Description |
|---|---|---|
| `children.module.js` | `initChildrenModule()` | Add/edit/delete children with age (years or months) |
| `medicine.module.js` | `initMedicineModule()` | Child medicines + mother supplements |
| `daily_checklist.module.js` | `initDailyChecklist()` | Daily medicine tracking with chart |
| `addanalysis.module.js` | `initAddAnalysisModule()` | Blood/vitamin analysis with AI |
| `results.module.js` | `initResultsModule()` | Analysis history + trend charts |
| `knowledgebase.module.js` | `initKnowledgeBaseModule()` | Educational articles by category |
| `savedarticles.module.js` | `initSavedArticlesModule()` | Bookmarked articles |
| `motherhealth.module.js` | `initMotherHealthModule()` | Water intake + appointments |
| `pregnancy.module.js` | `initPregnancyModule()` | Period calendar + pregnancy tracking |
| `admin.module.js` | `initAdminModule()` | Article management (admin only) |
| `billing.module.js` | `initBillingModule()` | Credits + subscription UI |
| `settings.module.js` | `initSettingsModule()` | Profile, password, dark mode |

### Toast Notifications

All user-facing messages use `toast.js` instead of browser `alert()`:

```javascript
import { toast } from './toast.js';

toast('Saved successfully!', 'success');  // green
toast('Invalid input', 'error');          // red
toast('Please select a child', 'warning'); // yellow
toast('Loading...', 'info');              // blue
```

### Dark Mode

Toggled via `settings.module.js`. Stored in `localStorage`. Applied by setting `document.body.dataset.theme = 'dark'`. All CSS uses `[data-theme="dark"]` selectors.

---

## 7. Backend Architecture

### Express API

The backend runs as a Firebase Cloud Function (`monetizationApi`) using Express.js. All routes are under `/api`.

### Middleware Stack

```
Request
  → securityHeaders (Helmet)
  → CORS
  → limitRequestSize
  → express.json()
  → sanitizeInput
  → apiLimiter (rate limiting)
  → securityLogger
  → authenticateUser (Firebase token)
  → Route handler
```

### Services

| Service | Responsibility |
|---|---|
| `AIAnalysisEngine.js` | Calls OpenAI API, interprets blood/vitamin results |
| `AnalysisService.js` | Orchestrates analysis flow with payment checks |
| `CreditSystem.js` | Credit balance, purchase, deduction |
| `CreditValidator.js` | Validates credit sufficiency before analysis |
| `FreemiumController.js` | Free tier limits, upgrade recommendations |
| `SubscriptionManager.js` | Monthly subscription management |
| `HybridPaymentSystem.js` | Combines free tier + credits + subscription |
| `PaymentGateway.js` | Stripe payment intent creation |
| `TelegramNotifier.js` | Sends messages via Telegram Bot API |
| `UsageTracker.js` | Tracks analysis usage per user |
| `UsageNotificationService.js` | Sends usage warnings to users |
| `EnterpriseAccessControl.js` | Enterprise-level access management |

---

## 8. Firebase Functions

Four Cloud Functions are exported from `backend/index.js`:

### A. `cascadeDeleteOnChildDelete` (Gen2 Firestore trigger)

Triggered when a document in `children/{childId}` is deleted.

Automatically deletes:
- `medicine_list` where `childId` matches
- `medical_results` where `childId` matches
- `medicine_logs` where `childId` matches

### B. `cascadeDeleteOnUserDelete` (V1 Auth trigger)

Triggered when a Firebase Auth user is deleted.

Automatically deletes all data where `parentId == uid`:
- `children`
- `medicine_list`
- `medical_results`
- `medicine_logs`

### C. `monetizationApi` (V1 HTTPS)

Express.js REST API for payments, credits, and subscriptions. See [API Reference](#11-api-reference).

### D. Scheduled Functions (V2 Scheduler)

See [Telegram Bot](#9-telegram-bot) section.

---

## 9. Telegram Bot

### Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Get the bot token
3. Set it in `.env`: `TELEGRAM_BOT_TOKEN=your_token`
4. For production: `firebase functions:secrets:set TELEGRAM_BOT_TOKEN`

### How Users Connect

Users get their Telegram Chat ID from [@userinfobot](https://t.me/userinfobot) and save it in Settings → Telegram Chat ID field. This is stored in Firestore under `users/{uid}.telegramChatId`.

### Scheduled Notifications

| Function | Schedule | What it sends |
|---|---|---|
| `hourlyReminders` | Every 1 hour | 💊 Medicine doses, 🌿 Supplement doses, 💧 Water intake reminders |
| `dailyReminders` | Daily at 03:00 UTC (08:00 Tashkent) | 💉 Vaccine due dates, 🏥 Doctor appointment reminders |
| `articleNotifications` | Every 30 minutes | 📚 New knowledge base articles |

### Timezone

All time calculations use UTC+5 (Tashkent). The `tashkentHour()` helper converts UTC to local time.

### Medicine Dose Schedule

| Times per day | Hours (Tashkent) |
|---|---|
| 1 | 08:00 |
| 2 | 08:00, 20:00 |
| 3 | 08:00, 13:00, 20:00 |
| 4+ | Evenly distributed 08:00–20:00 |

---

## 10. Payment System

### Three-Tier Model

```
User requests AI analysis
        ↓
Free tier remaining? → Yes → Use free (no charge)
        ↓ No
Active subscription? → Yes → Use subscription quota
        ↓ No
Credits available?   → Yes → Deduct credits
        ↓ No
Show upgrade options
```

### Free Tier

- 5 analyses per month (configurable via `FREE_ANALYSIS_LIMIT` env var)
- Resets on the 1st of each month
- Upgrade prompt shown when 80% used

### Credit Packages

| Package | Credits | Bonus | Price |
|---|---|---|---|
| Basic | 50 | 0 | $5.00 |
| Standard | 100 | +10 | $9.00 |
| Premium | 250 | +50 | $20.00 |
| Enterprise | 500 | +150 | $35.00 |

### Analysis Credit Cost

| Analysis Type | Credits |
|---|---|
| Blood | 5 |
| Vitamin | 4 |

### Subscription Plans

| Plan | Price/month | Analyses/month |
|---|---|---|
| Basic | $9.99 | 20 |
| Professional | $19.99 | 50 |
| Enterprise | $49.99 | Unlimited |

### Payment Flow (Stripe)

1. Frontend calls `POST /api/monetization/credits/purchase`
2. Backend creates Stripe PaymentIntent
3. Frontend confirms payment with Stripe.js
4. Stripe sends webhook to `/api/webhooks/stripe`
5. Backend confirms payment and adds credits to user balance

> Note: In demo mode, credits are added directly without real Stripe charge.

---

## 11. API Reference

Base URL: `http://localhost:5001/api` (local) or Firebase Function URL (production)

All endpoints require `Authorization: Bearer <firebase_id_token>` header except `/health` and `/webhooks/*`.

### Health Check

```
GET /api/health
Response: { success: true, message: "...", timestamp: "..." }
```

### Monetization Status

```
GET /api/monetization/status
Response: {
  success: true,
  data: {
    freeTier: { used, limit, remaining, resetDate },
    credits: number,
    subscription: { tierId, tierName, analysisLimit, status } | null,
    plan: "free" | "credits" | "subscription"
  }
}
```

### Credit Packages

```
GET /api/monetization/credits/packages
Response: { success: true, data: [ { id, name, credits, bonusCredits, price, priceFormatted, popular } ] }
```

### Credit Balance

```
GET /api/monetization/credits/balance
Response: { success: true, data: { balance: number } }
```

### Purchase Credits

```
POST /api/monetization/credits/purchase
Body: { packageId: "basic_50" | "standard_100" | "premium_250" | "enterprise_500" }
Response: { success: true, data: { creditsAdded: number, package: string } }
```

### Subscription Tiers

```
GET /api/monetization/subscriptions/tiers
Response: { success: true, data: [ { id, name, monthlyPrice, priceFormatted, analysisLimit, analysisLimitLabel, features, popular } ] }
```

### Create Subscription

```
POST /api/monetization/subscriptions/create
Body: { tierId: "basic" | "professional" | "enterprise" }
Response: { success: true, data: { subscriptionId: string, tier: string } }
```

### Cancel Subscription

```
DELETE /api/monetization/subscriptions/cancel
Response: { success: true, data: { message: "Subscription cancelled" } }
```

---

## 12. Database Schema (Firestore)

### `users/{uid}`
```json
{
  "email": "string",
  "role": "parent | admin",
  "displayName": "string",
  "telegramChatId": "string",
  "createdAt": "timestamp"
}
```

### `children/{childId}`
```json
{
  "name": "string",
  "age": "number",
  "ageUnit": "years | months",
  "gender": "male | female",
  "parentId": "string (uid)",
  "birthDate": "string (optional, YYYY-MM-DD)",
  "createdAt": "timestamp"
}
```

### `medicine_list/{docId}`
```json
{
  "parentId": "string",
  "childId": "string",
  "name": "string",
  "dosage": "string",
  "timesPerDay": "number",
  "createdAt": "timestamp"
}
```

### `supplements_list/{docId}`
```json
{
  "userId": "string",
  "name": "string",
  "dosage": "string",
  "timesPerDay": "number",
  "createdAt": "timestamp"
}
```

### `analyses/{docId}`
```json
{
  "userId": "string",
  "childId": "string",
  "type": "blood | vitamin",
  "values": {
    "hemoglobin": "number",
    "ferritin": "number"
  },
  "createdAt": "timestamp"
}
```

### `knowledge_base/{docId}`
```json
{
  "title": "string",
  "summary": "string",
  "content": "string",
  "category": "harmful | immunity | vaccines | herbal | nutrition | sleep",
  "warning": "string (optional)",
  "status": "published | draft",
  "order": "number",
  "notified": "boolean"
}
```

### `user_bookmarks/{docId}`
```json
{
  "userId": "string",
  "articleId": "string",
  "savedAt": "timestamp"
}
```

### `water_intake/{docId}`
```json
{
  "userId": "string",
  "dailyLiters": "number",
  "startHour": "number (0-23)",
  "endHour": "number (0-23)"
}
```

### `appointments/{docId}`
```json
{
  "userId": "string",
  "appointmentDate": "string (YYYY-MM-DD)"
}
```

### `user_payment_profiles/{uid}`
```json
{
  "userId": "string",
  "creditBalance": "number",
  "updatedAt": "timestamp"
}
```

### `subscriptions/{docId}`
```json
{
  "userId": "string",
  "tierId": "string",
  "tierName": "string",
  "monthlyPrice": "number",
  "analysisLimit": "number (-1 = unlimited)",
  "status": "active | cancelled",
  "currentPeriodStart": "timestamp",
  "currentPeriodEnd": "timestamp",
  "createdAt": "timestamp"
}
```

### `transactions/{docId}`
```json
{
  "userId": "string",
  "type": "credit_purchase",
  "packageId": "string",
  "creditsAdded": "number",
  "amount": "number (cents)",
  "status": "succeeded | failed | pending",
  "createdAt": "timestamp"
}
```

### `free_usage/{userId_YYYY-MM}`
```json
{
  "userId": "string",
  "count": "number",
  "month": "string (YYYY-MM)"
}
```

---

## 13. Authentication & Security

### Firebase Auth

- Email/password authentication
- Auth state managed by `onAuthStateChanged` in `auth.js`
- Unauthenticated users are redirected to `login.html`
- Admin role stored in Firestore `users/{uid}.role`

### Backend Security

- **Helmet** — sets secure HTTP headers
- **CORS** — only allows configured origins
- **Rate limiting** — 100 req/15min globally, 20 req/min for analysis
- **Request size limit** — 50KB max body
- **Input sanitization** — strips dangerous characters
- **Firebase token verification** — all API routes require valid ID token

### Validation

`backend/middleware/validation.js` validates analysis requests:
- Allowed types: `blood`, `vitamin` (urine removed)
- Blood values: `hemoglobin` (0–25 g/dL), `ferritin` (0–2000 ng/mL)
- Vitamin values: `vitaminD` (0–200), `vitaminB12` (0–2000)

---

## 14. Testing

### Backend Tests

```bash
cd backend
npm test              # Run all tests once
npm run test:watch    # Watch mode
```

Tests use **Jest** + **fast-check** (Property-Based Testing):

| Test File | What it tests |
|---|---|
| `CreditSystem.property.test.js` | Credit balance invariants |
| `FreemiumController.property.test.js` | Free tier limit logic |
| `SubscriptionManager.property.test.js` | Subscription state transitions |
| `PaymentGateway.property.test.js` | Payment processing |
| `AIAnalysisEngine.property.test.js` | Analysis result consistency |
| `UsageTracker.property.test.js` | Usage counting accuracy |
| `integration-checkpoint.test.js` | End-to-end integration |

### Frontend Tests

Located in `frontend/tests/`:
- `bug-exploration.test.js` — reproduces known bugs
- `preservation.test.js` — ensures fixes don't regress

---

## 15. Deployment

### Deploy Everything

```bash
firebase deploy
```

### Deploy Only Frontend

```bash
firebase deploy --only hosting
```

### Deploy Only Functions

```bash
cd backend
firebase deploy --only functions
```

### Set Production Secrets

```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

### Initialize Database

```bash
cd backend
npm run init-db
```

### Seed Knowledge Base Articles

```bash
cd backend
node scripts/seedKnowledgeBase.js
```

---

## Notes

- The app uses **UTC+5 (Tashkent)** timezone for all scheduled notifications
- Dark mode preference is stored in `localStorage` as `pediamom_darkmode`
- The billing module works in **demo mode** by default (no real Stripe charge)
- To enable real payments, configure Stripe keys and implement the full Stripe.js flow in `billing.module.js`
- Knowledge base articles require a Firestore composite index on `(category, status, order)` — create it via Firebase Console or `firestore.indexes.json`
