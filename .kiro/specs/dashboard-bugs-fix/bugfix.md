# Bugfix Requirements Document

## Introduction

Dashboard sahifasida 9 ta bug aniqlandi. Ushbu buglar quyidagi modullarda joylashgan:
`daily_checklist.module.js` (chart va missed warning logikasi), `addanalysis.module.js`
(validation xabarlari va API calls), `savedarticles.module.js` (Read tugmasi navigatsiyasi),
`pregnancy.module.js` (info cards interaktivligi), `settings.module.js` va `dashboard.js`
(settings save va email readonly UX), va Telegram bot mavjud emasligi. Bu buglar foydalanuvchi
tajribasini sezilarli darajada buzadi: chart noto'g'ri foiz ko'rsatadi, warning noto'g'ri
chiqadi, xabarlar o'zbek tilida, analysis saqlanmaydi, va bir nechta UI elementlari ishlamaydi.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Weekly Medicine Chart noto'g'ri foiz ko'rsatadi**

1.1 WHEN user 2 ta dori qo'shadi va har biri `timesPerDay=2` bo'lsa THEN the system calculates `totalMedicines = 2` (medicine count only) and displays up to 200–250% instead of 100%

1.2 WHEN `drawWeeklyChart()` runs THEN the system divides taken log count by `medsSnap.size` (medicine document count) instead of the total expected log entries (sum of all `timesPerDay` values)

**Bug 2 — "Missed medicines" warning noto'g'ri chiqadi**

2.1 WHEN yesterday's `medicine_logs` collection has no documents at all (`snap.empty === true`) THEN the system shows the missed medicines warning even though the user has never started taking medicines

2.2 WHEN the warning is shown THEN the system displays a date-specific message (e.g. "You missed medicines on April 3") instead of a relative message

**Bug 3 — Analysis validation xabarlari o'zbek tilida**

3.1 WHEN hemoglobin or ferritin value is out of valid range THEN the system shows `"Noto'g'ri qiymat kiritildi"` (Uzbek) instead of English

3.2 WHEN hemoglobin is below the age-based threshold THEN the system shows `"⚠️ Hemoglobin past: bolaning yoshi uchun norma ... g/dL dan yuqori bo'lishi kerak"` (Uzbek)

3.3 WHEN ferritin is below the age-based threshold THEN the system shows `"⚠️ Ferritin past: bolaning yoshi uchun norma ... ng/mL dan yuqori bo'lishi kerak"` (Uzbek)

**Bug 4 — "Error processing analysis" xatosi vitamin analysis kiritganda**

4.1 WHEN user submits a vitamin analysis THEN the system calls `/api/analysis/estimate` and `/api/analysis/execute` API endpoints which do not exist or are unavailable, resulting in "Error processing analysis" error

4.2 WHEN the API call fails THEN the system does not fall back to direct Firestore save, leaving the analysis data unsaved

**Bug 5 — Saved Articles "Read" tugmasi boshqa sahifaga o'tkazadi**

5.1 WHEN user clicks "Read →" on a saved article card THEN the system navigates away to the Knowledge Base page instead of showing the article content in the Saved Articles page

**Bug 6 — Pregnancy info cards bosilmaydi**

6.1 WHEN user clicks on Overview, This Week, Milestones, Symptoms, or AI Advice cards THEN the system does nothing — no click handlers are attached to these cards

6.2 WHEN user views the Symptoms card THEN the system shows only static text with no textarea or save button for entering symptoms

**Bug 7 — Settings Email field readonly UX muammosi**

7.1 WHEN user tries to type in the Email field in Settings THEN the system silently ignores input because the field has `readonly` attribute, with no visual indication that the field is non-editable

**Bug 8 — Settings "Save Profile" ishlamaydi**

8.1 WHEN user clicks "Save Profile" THEN the system calls `updateDoc(doc(db, "users", currentUser.uid), ...)` which fails with "Failed to save profile" error because the user document does not exist in the `users` collection or Firestore rules deny the write

**Bug 9 — Telegram Bot mavjud emas**

9.1 WHEN user opens Settings THEN the system displays a link to `@PediaMomBot` which does not exist, misleading the user into trying to use a non-functional bot

---

### Expected Behavior (Correct)

**Bug 1 — Weekly Medicine Chart**

2.1 WHEN `drawWeeklyChart()` calculates the total expected doses THEN the system SHALL sum `timesPerDay` across all medicine documents to get `totalExpected`, and divide taken count by `totalExpected` to produce a percentage ≤ 100%

2.2 WHEN there are no medicines (`totalExpected === 0`) THEN the system SHALL display 0% for that day without errors

**Bug 2 — Missed medicines warning**

2.3 WHEN yesterday's `medicine_logs` is empty (`snap.empty === true`) THEN the system SHALL NOT show the missed medicines warning

2.4 WHEN yesterday has log entries and all have `taken === false` THEN the system SHALL show the warning with the message "Yesterday you missed your medicines"

2.5 WHEN the warning is displayed THEN the system SHALL use a relative message ("Yesterday you missed your medicines") rather than a date-specific one

**Bug 3 — Analysis validation messages**

2.6 WHEN hemoglobin or ferritin value is out of valid range THEN the system SHALL show `"Invalid value entered"` in English

2.7 WHEN hemoglobin is below the age-based threshold THEN the system SHALL show an English warning: `"⚠️ Hemoglobin is low: normal for child's age is above X g/dL"`

2.8 WHEN ferritin is below the age-based threshold THEN the system SHALL show an English warning: `"⚠️ Ferritin is low: normal for child's age is above X ng/mL"`

**Bug 4 — Analysis save fallback**

2.9 WHEN user submits a vitamin or blood analysis THEN the system SHALL save the analysis data directly to Firestore (`analyses` collection) without requiring `/api/analysis/estimate` or `/api/analysis/execute` API calls

2.10 WHEN the analysis is saved successfully THEN the system SHALL show a success message and reset the form

**Bug 5 — Saved Articles Read button**

2.11 WHEN user clicks "Read →" on a saved article card THEN the system SHALL display the article content (title, summary, full content) inline within the Saved Articles page using a modal or expanded card, without navigating away

**Bug 6 — Pregnancy info cards**

2.12 WHEN user clicks on Overview, This Week, or Milestones cards THEN the system SHALL expand or show the card's detailed content inline

2.13 WHEN user views the Symptoms card THEN the system SHALL display a textarea and a Save button for entering and persisting symptoms

2.14 WHEN user clicks AI Advice card THEN the system SHALL show a "Coming soon" message in a user-friendly way (e.g. a toast or inline note) rather than doing nothing

**Bug 7 — Email field UX**

2.15 WHEN the Email field is rendered in Settings THEN the system SHALL visually indicate it is non-editable (e.g. grayed out styling, a lock icon, or a helper text "Email cannot be changed here")

**Bug 8 — Save Profile**

2.16 WHEN user clicks "Save Profile" and the user document does not exist in Firestore THEN the system SHALL use `setDoc` with `merge: true` instead of `updateDoc` to create or update the document

2.17 WHEN the profile is saved successfully THEN the system SHALL show "Profile saved successfully!" message

**Bug 9 — Telegram Bot**

2.18 WHEN the Telegram bot does not exist THEN the system SHALL either remove the Telegram section from Settings or replace the bot link with a placeholder note indicating the feature is not yet available

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN user has 1 medicine with `timesPerDay=1` and takes it THEN the system SHALL CONTINUE TO show 100% for that day in the weekly chart

3.2 WHEN yesterday has log entries and at least one has `taken === true` THEN the system SHALL CONTINUE TO hide the missed medicines warning

3.3 WHEN hemoglobin and ferritin values are within valid range THEN the system SHALL CONTINUE TO proceed with saving the analysis without showing validation errors

3.4 WHEN user submits a blood analysis with valid values THEN the system SHALL CONTINUE TO validate hemoglobin and ferritin against age-based thresholds and show appropriate warnings

3.5 WHEN user navigates to Knowledge Base directly THEN the system SHALL CONTINUE TO function independently of Saved Articles changes

3.6 WHEN user saves period data in the Pregnancy calendar THEN the system SHALL CONTINUE TO save to Firestore and re-render the calendar correctly

3.7 WHEN user changes password in Settings THEN the system SHALL CONTINUE TO reauthenticate and update the password via Firebase Auth

3.8 WHEN user toggles dark mode in Settings THEN the system SHALL CONTINUE TO apply the theme and persist the preference in localStorage

3.9 WHEN user deletes their account THEN the system SHALL CONTINUE TO remove the Firestore document and Firebase Auth user, then redirect to the home page
