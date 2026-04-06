# Dashboard Bugs Fix — Bugfix Design

## Overview

Dashboard sahifasida 9 ta bug aniqlandi va ushbu design document ularni tuzatish uchun
texnik yondashuvni belgilaydi. Buglar 5 ta frontend modulda joylashgan:
`daily_checklist.module.js`, `addanalysis.module.js`, `savedarticles.module.js`,
`pregnancy.module.js`, va `settings.module.js` (shu jumladan `dashboard.js` HTML template).

Har bir bug uchun bug condition (C), expected behavior (P), va preservation requirements
aniqlanadi. Fix minimal va targeted bo'ladi — faqat buggy code o'zgartiriladi.

---

## Glossary

- **Bug_Condition (C)**: Bugni trigger qiladigan input yoki holat
- **Property (P)**: Bug condition ushlanganida kutilayotgan to'g'ri xulq
- **Preservation**: Fix tomonidan o'zgartirilmasligi kerak bo'lgan mavjud xulq
- **totalExpected**: Barcha dorilar `timesPerDay` qiymatlarining yig'indisi (Bug 1 uchun)
- **snap.empty**: Firestore query natijasida hech qanday document yo'qligi (Bug 2 uchun)
- **setDoc with merge:true**: Firestore'da document mavjud bo'lmasa yaratadigan, mavjud bo'lsa yangilaydigan operatsiya (Bug 8 uchun)
- **drawWeeklyChart()**: `daily_checklist.module.js` dagi haftalik chart chizuvchi funksiya
- **checkMissedYesterday()**: `daily_checklist.module.js` dagi kechagi missed warning tekshiruvchi funksiya
- **openArticleDetail()**: `savedarticles.module.js` dagi article ochuvchi funksiya
- **initPregnancyModule()**: `pregnancy.module.js` dagi pregnancy page init funksiyasi
- **initSettingsModule()**: `settings.module.js` dagi settings page init funksiyasi

---

## Bug Details

### Bug 1 — Chart: totalMedicines o'rniga sum of timesPerDay

The bug manifests when any medicine has `timesPerDay > 1`. The `drawWeeklyChart()` function
divides taken log count by `medsSnap.size` (medicine document count) instead of the total
expected log entries (sum of all `timesPerDay` values), producing percentages above 100%.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug1(medicines)
  INPUT: medicines — array of medicine documents
  OUTPUT: boolean

  totalExpected := SUM(med.timesPerDay FOR med IN medicines)
  RETURN totalExpected > medicines.length
         // i.e., at least one medicine has timesPerDay > 1
END FUNCTION
```

**Examples:**
- 2 medicines, each `timesPerDay=2` → totalExpected=4, but code uses divisor=2 → 200% possible
- 1 medicine, `timesPerDay=3`, 2 taken → code shows 200%, correct is 67%
- 1 medicine, `timesPerDay=1` → no bug (divisor equals totalExpected)

---

### Bug 2 — Warning: snap.empty bo'lsa ko'rsatmaslik

The bug manifests when `snap.empty === true` (user has never logged any medicine for yesterday).
The `checkMissedYesterday()` function shows the warning even though the user hasn't started
tracking yet. Additionally, the message uses a date-specific format instead of "Yesterday you
missed your medicines".

**Formal Specification:**
```
FUNCTION isBugCondition_Bug2(snap)
  INPUT: snap — Firestore query snapshot for yesterday's medicine_logs
  OUTPUT: boolean

  RETURN snap.empty === true
         OR (NOT snap.empty AND snap.docs.every(d => d.data().taken === false)
             AND warningMessage CONTAINS specific date string)
END FUNCTION
```

**Examples:**
- `snap.empty === true` → warning shown (bug), should be hidden
- All docs have `taken=false` → warning shows "You missed medicines on April 3" (bug), should say "Yesterday you missed your medicines"
- At least one doc has `taken=true` → warning correctly hidden (no bug)

---

### Bug 3 — Validation messages: O'zbek tilidan English ga

The bug manifests when hemoglobin/ferritin values are invalid or below threshold. The
`addanalysis.module.js` shows Uzbek-language error messages.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug3(message)
  INPUT: message — validation message string shown to user
  OUTPUT: boolean

  RETURN message CONTAINS "Noto'g'ri qiymat kiritildi"
         OR message CONTAINS "bolaning yoshi uchun norma"
         OR message CONTAINS "dan yuqori bo'lishi kerak"
END FUNCTION
```

**Examples:**
- Invalid hemoglobin → shows `"Noto'g'ri qiymat kiritildi"` (bug), should be `"Invalid value entered"`
- Low hemoglobin → shows Uzbek threshold message (bug), should be English
- Valid values → no validation message shown (no bug)

---

### Bug 4 — Analysis: API call o'rniga to'g'ridan-to'g'ri Firestore ga saqlash

The bug manifests when user submits any analysis. The code calls `/api/analysis/estimate`
and `/api/analysis/execute` which are unavailable, causing "Error processing analysis".

**Formal Specification:**
```
FUNCTION isBugCondition_Bug4(submission)
  INPUT: submission — analysis form submission event
  OUTPUT: boolean

  RETURN submission.type IN ["blood", "vitamin"]
         AND code CALLS fetch('/api/analysis/estimate')
         // API endpoint unavailable → always fails
END FUNCTION
```

**Examples:**
- Submit vitamin analysis → API call fails → "Error processing analysis" (bug)
- Submit blood analysis → same failure (bug)
- Expected: data saved directly to Firestore `analyses` collection

---

### Bug 5 — Saved Articles: modal ichida article ko'rsatish

The bug manifests when user clicks "Read →" on a saved article card. The `openArticleDetail()`
function navigates to the Knowledge Base page instead of showing content inline.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug5(clickEvent)
  INPUT: clickEvent — click on "Read →" button in saved articles
  OUTPUT: boolean

  RETURN clickEvent.target.classList.contains("read-article-btn")
         AND code CALLS kbMenuItem.click()  // navigates away
END FUNCTION
```

**Examples:**
- Click "Read →" → navigates to Knowledge Base page (bug), should show modal
- Modal should display: title, summary, full content, close button

---

### Bug 6 — Pregnancy cards: Symptoms card da textarea va save button

The bug manifests when the Pregnancy page renders. The Symptoms card has no textarea or
save button — only static text. The `renderInfoCards()` function looks for `#updateSymptomsBtn`
which doesn't exist in the HTML template.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug6(dom)
  INPUT: dom — rendered pregnancy page DOM
  OUTPUT: boolean

  RETURN dom.querySelector("#symptomsTextarea") === null
         OR dom.querySelector("#updateSymptomsBtn") === null
END FUNCTION
```

**Examples:**
- Pregnancy page renders → Symptoms card has no textarea (bug)
- Click Symptoms card → nothing happens (bug)
- Expected: textarea + "Save" button visible in Symptoms card

---

### Bug 7 — Email field: readonly styling yaxshilash

The bug manifests when Settings page renders. The email input has `readonly` attribute but
no visual indication — user tries to type and nothing happens with no feedback.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug7(emailInput)
  INPUT: emailInput — email field DOM element
  OUTPUT: boolean

  RETURN emailInput.hasAttribute("readonly")
         AND NOT emailInput.classList.contains("readonly-field")
         AND NOT emailInput.nextSibling CONTAINS helper text
END FUNCTION
```

**Examples:**
- Email field renders → no gray styling, no helper text (bug)
- User tries to type → silently ignored (bug)
- Expected: grayed out + helper text "Email cannot be changed"

---

### Bug 8 — Settings save: updateDoc o'rniga setDoc with merge:true

The bug manifests when user clicks "Save Profile" and the `users` document doesn't exist
in Firestore. `updateDoc` fails on non-existent documents.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug8(userId)
  INPUT: userId — current user's UID
  OUTPUT: boolean

  userDoc := getDoc(db, "users", userId)
  RETURN NOT userDoc.exists()
         AND code CALLS updateDoc(...)  // fails on non-existent doc
END FUNCTION
```

**Examples:**
- New user, no Firestore doc → `updateDoc` throws → "Failed to save profile" (bug)
- Existing user → `updateDoc` works (no bug, but setDoc with merge is safer)
- Expected: `setDoc(ref, data, { merge: true })` works for both cases

---

### Bug 9 — Telegram: bot yo'q, settings dan olib tashlash

The bug manifests when Settings page renders. The Telegram section shows a link to
`@PediaMomBot` which doesn't exist, misleading users.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug9(dom)
  INPUT: dom — rendered settings page DOM
  OUTPUT: boolean

  RETURN dom.querySelector('a[href*="PediaMomBot"]') !== null
         AND botActuallyExists === false
END FUNCTION
```

**Examples:**
- Settings renders → shows `@PediaMomBot` link (bug)
- User clicks link → bot doesn't exist (bug)
- Expected: section replaced with "Coming soon" note or removed entirely

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- 1 medicine with `timesPerDay=1`, taken → chart shows 100% (Bug 1 fix must not break this)
- Yesterday has logs with at least one `taken=true` → warning stays hidden (Bug 2 fix must not break this)
- Valid hemoglobin/ferritin values → no validation error shown (Bug 3 fix must not break this)
- Blood analysis validation against age-based thresholds still runs (Bug 4 fix must not break this)
- Knowledge Base page functions independently of Saved Articles (Bug 5 fix must not break this)
- Period data save/load in Pregnancy calendar still works (Bug 6 fix must not break this)
- Password change via Firebase Auth still works (Bug 7/8 fix must not break this)
- Dark mode toggle persists in localStorage (Bug 8 fix must not break this)
- Account deletion removes Firestore doc + Auth user (Bug 8 fix must not break this)

**Scope:**
All inputs that do NOT match the respective bug conditions above should be completely
unaffected by these fixes. Each fix is isolated to its specific function/template section.

---

## Hypothesized Root Cause

### Bug 1
`drawWeeklyChart()` uses `medsSnap.size` as the denominator. The correct denominator is
`medsSnap.docs.reduce((sum, d) => sum + (Number(d.data().timesPerDay) || 1), 0)`.

### Bug 2
`checkMissedYesterday()` has `if (snap.empty || snap.docs.every(...taken === false))` — the
`snap.empty` branch should skip showing the warning, not show it. Also the message uses
`toLocaleDateString` instead of the static string "Yesterday you missed your medicines".

### Bug 3
Hardcoded Uzbek strings in `addanalysis.module.js` lines with `"Noto'g'ri qiymat kiritildi"`,
`"bolaning yoshi uchun norma"`, etc. Simple string replacement needed.

### Bug 4
The form submit handler calls `getAnalysisCostEstimate()` and `executeAIAnalysis()` which
use `fetch('/api/analysis/...')`. These backend endpoints are not deployed/available. The fix
bypasses the API and uses `addDoc(collection(db, "analyses"), {...})` directly.

### Bug 5
`openArticleDetail()` calls `kbMenuItem.click()` which triggers full page navigation. The fix
creates an inline modal within the saved articles page.

### Bug 6
The pregnancy page HTML template in `dashboard.js` has the Symptoms card with only static
`<p>` text. The `renderInfoCards()` function looks for `#updateSymptomsBtn` which doesn't
exist. Fix: add `<textarea id="symptomsTextarea">` and `<button id="updateSymptomsBtn">` to
the Symptoms card HTML in the template.

### Bug 7
The email `<input>` in the settings template has `readonly` attribute but no CSS class or
helper text. Fix: add `class="readonly-field"` and a `<small>` helper text below the input.

### Bug 8
`saveProfileBtn` click handler calls `updateDoc(...)`. Firestore's `updateDoc` throws if the
document doesn't exist. Fix: replace with `setDoc(ref, { displayName: name }, { merge: true })`.

### Bug 9
The settings HTML template in `dashboard.js` contains the full Telegram section with a live
bot link. Fix: replace the section content with a "Coming soon" message.

---

## Correctness Properties

Property 1: Bug Condition — Chart percentage never exceeds 100%

_For any_ set of medicines where at least one has `timesPerDay > 1`, the fixed
`drawWeeklyChart()` function SHALL calculate the percentage as
`taken / sum(timesPerDay) * 100`, ensuring the result is always between 0 and 100 inclusive.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Single-dose medicine chart accuracy

_For any_ set of medicines where all have `timesPerDay === 1`, the fixed `drawWeeklyChart()`
SHALL produce the same percentage result as the original function, preserving existing
single-dose chart behavior.

**Validates: Requirements 3.1**

Property 3: Bug Condition — Warning hidden when snap.empty

_For any_ call to `checkMissedYesterday()` where the Firestore snapshot is empty
(`snap.empty === true`), the fixed function SHALL NOT show the `#missedWarning` element
(it SHALL remain hidden with class `"hidden"`).

**Validates: Requirements 2.3, 2.5**

Property 4: Bug Condition — Warning message is relative

_For any_ call to `checkMissedYesterday()` where all yesterday's logs have `taken === false`
and `snap.empty === false`, the fixed function SHALL show the warning with the exact text
`"Yesterday you missed your medicines"` (not a date-specific string).

**Validates: Requirements 2.4, 2.5**

Property 5: Preservation — Warning hidden when at least one taken

_For any_ call to `checkMissedYesterday()` where at least one yesterday's log has
`taken === true`, the fixed function SHALL produce the same result as the original function,
keeping the warning hidden.

**Validates: Requirements 3.2**

Property 6: Bug Condition — Validation messages in English

_For any_ invalid or below-threshold hemoglobin/ferritin value, the fixed
`addanalysis.module.js` SHALL display validation messages exclusively in English
(no Uzbek strings).

**Validates: Requirements 2.6, 2.7, 2.8**

Property 7: Bug Condition — Analysis saved directly to Firestore

_For any_ valid analysis submission (blood or vitamin), the fixed form submit handler SHALL
save data directly to the Firestore `analyses` collection using `addDoc`, without calling
`/api/analysis/estimate` or `/api/analysis/execute`.

**Validates: Requirements 2.9, 2.10**

Property 8: Preservation — Analysis validation still runs

_For any_ blood analysis submission, the fixed handler SHALL still validate hemoglobin and
ferritin against age-based thresholds and show appropriate English warnings, preserving
existing validation logic.

**Validates: Requirements 3.4**

Property 9: Bug Condition — Saved article opens in modal

_For any_ click on "Read →" in the saved articles page, the fixed `openArticleDetail()`
SHALL display the article content in an inline modal within the same page, without
navigating to the Knowledge Base page.

**Validates: Requirements 2.11**

Property 10: Bug Condition — Settings save works for new users

_For any_ user (whether or not their `users` document exists in Firestore), the fixed
"Save Profile" handler SHALL successfully persist the display name using
`setDoc(..., { merge: true })` without throwing an error.

**Validates: Requirements 2.16, 2.17**

Property 11: Preservation — Settings save works for existing users

_For any_ user whose `users` document already exists, the fixed save handler SHALL produce
the same outcome as `updateDoc` would have (document updated, no data loss), preserving
existing profile data.

**Validates: Requirements 3.7**

---

## Fix Implementation

### Bug 1 — `frontend/js/daily_checklist.module.js` → `drawWeeklyChart()`

**Change**: Replace `const totalMedicines = medsSnap.size` with sum of `timesPerDay`:
```javascript
// Before
const totalMedicines = medsSnap.size;

// After
const totalMedicines = medsSnap.docs.reduce(
  (sum, d) => sum + (Number(d.data().timesPerDay) || 1), 0
);
```

---

### Bug 2 — `frontend/js/daily_checklist.module.js` → `checkMissedYesterday()`

**Change 1**: Guard against `snap.empty` — hide warning and return early:
```javascript
// Before
if (snap.empty || snap.docs.every(d => d.data().taken === false)) {
  const yFormatted = y.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  warning.innerHTML = `⚠️ You missed medicines on ${yFormatted}`;
  warning.classList.remove("hidden");
} else {
  warning.classList.add("hidden");
}

// After
if (snap.empty) {
  warning.classList.add("hidden");
  return;
}
if (snap.docs.every(d => d.data().taken === false)) {
  warning.innerHTML = `⚠️ Yesterday you missed your medicines`;
  warning.classList.remove("hidden");
} else {
  warning.classList.add("hidden");
}
```

---

### Bug 3 — `frontend/js/addanalysis.module.js` → form submit handler

**Change**: Replace Uzbek strings with English:
```javascript
// Before
showMessage("Noto'g'ri qiymat kiritildi", "error");
// ...
warnings.push("⚠️ Hemoglobin past: bolaning yoshi uchun norma " + threshold + " g/dL dan yuqori bo'lishi kerak");
warnings.push("⚠️ Ferritin past: bolaning yoshi uchun norma " + threshold + " ng/mL dan yuqori bo'lishi kerak");

// After
showMessage("Invalid value entered", "error");
// ...
warnings.push("⚠️ Hemoglobin is low: normal for child's age is above " + threshold + " g/dL");
warnings.push("⚠️ Ferritin is low: normal for child's age is above " + threshold + " ng/mL");
```

---

### Bug 4 — `frontend/js/addanalysis.module.js` → form submit handler

**Change**: Replace API calls with direct Firestore `addDoc`:
```javascript
// Before (calls /api/analysis/estimate and /api/analysis/execute)
const costEstimate = await getAnalysisCostEstimate(...);
const analysisResult = await executeAIAnalysis(...);

// After
import { addDoc, collection, serverTimestamp } from "firebase-firestore";

await addDoc(collection(db, "analyses"), {
  userId,
  childId: childSelect.value,
  type,
  values,
  createdAt: serverTimestamp()
});
showMessage("Analysis saved successfully!", "success");
form.reset();
bloodFields.style.display = "none";
vitaminFields.style.display = "none";
```

---

### Bug 5 — `frontend/js/savedarticles.module.js` → `openArticleDetail()`

**Change**: Replace navigation with inline modal:
```javascript
// Before
function openArticleDetail(article) {
  const kbMenuItem = document.querySelector('[data-page="knowledgebase"]');
  if (kbMenuItem) { kbMenuItem.click(); ... }
}

// After
function openArticleDetail(article) {
  const existing = document.getElementById("savedArticleModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "savedArticleModal";
  modal.className = "pm-modal";
  modal.innerHTML = `
    <div class="pm-modal-box">
      <h3>${article.title || ""}</h3>
      <p class="kb-summary">${article.summary || ""}</p>
      <div class="kb-content">${article.content || ""}</div>
      <button id="closeSavedArticleModal">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById("closeSavedArticleModal")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}
```

---

### Bug 6 — `frontend/js/dashboard.js` → `pages.pregnancy` template

**Change**: Add textarea and save button to the Symptoms card:
```html
<!-- Before -->
<div class="pregnancy-info-card">
  <h3>🩺 Symptoms</h3>
  <p style="color:#64748b;font-size:14px;">Note any symptoms in your health journal.</p>
</div>

<!-- After -->
<div class="pregnancy-info-card">
  <h3>🩺 Symptoms</h3>
  <textarea id="symptomsTextarea" placeholder="Note your symptoms here..." rows="3"
    style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;resize:vertical;"></textarea>
  <button id="updateSymptomsBtn" style="margin-top:8px;">Save</button>
</div>
```

---

### Bug 7 — `frontend/js/dashboard.js` → `pages.settings` template + `frontend/css/style.css`

**Change 1** — Add CSS class and helper text to email field in settings template:
```html
<!-- Before -->
<input type="email" id="settingsEmail" placeholder="your@email.com" readonly />

<!-- After -->
<input type="email" id="settingsEmail" placeholder="your@email.com" readonly class="readonly-field" />
<small style="color:#94a3b8;font-size:12px;">Email cannot be changed here</small>
```

**Change 2** — Add CSS rule in `style.css`:
```css
.readonly-field {
  background-color: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}
```

---

### Bug 8 — `frontend/js/settings.module.js` → `saveProfileBtn` click handler

**Change**: Replace `updateDoc` with `setDoc` + `merge: true`. Also add `setDoc` to imports:
```javascript
// Import change
import { doc, getDoc, setDoc, deleteDoc } from "firebase-firestore";

// Before
await updateDoc(doc(db, "users", currentUser.uid), { displayName: name });

// After
await setDoc(doc(db, "users", currentUser.uid), { displayName: name }, { merge: true });
```

Also apply same fix to `saveTelegramBtn` handler:
```javascript
// Before
await updateDoc(doc(db, "users", currentUser.uid), { telegramChatId: chatId });

// After
await setDoc(doc(db, "users", currentUser.uid), { telegramChatId: chatId }, { merge: true });
```

---

### Bug 9 — `frontend/js/dashboard.js` → `pages.settings` template

**Change**: Replace Telegram section content with "Coming soon" note:
```html
<!-- Before -->
<div class="settings-section">
  <h3>📱 Telegram Notifications</h3>
  <p>...First, start our bot: <a href="https://t.me/PediaMomBot">@PediaMomBot</a>...</p>
  <div class="settings-field">...</div>
  <button id="saveTelegramBtn">Save</button>
</div>

<!-- After -->
<div class="settings-section">
  <h3>📱 Telegram Notifications</h3>
  <p style="font-size:13px;color:#94a3b8;">
    🚧 Telegram notifications are coming soon. Stay tuned!
  </p>
</div>
```

---

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests on unfixed code to confirm root causes,
then verify fixes with fix-checking and preservation-checking tests.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples on UNFIXED code to confirm root cause analysis.

**Test Cases:**

1. **Bug 1 — Chart overflow**: Create 2 medicines with `timesPerDay=2`, mark 3 logs as taken.
   Assert percentage > 100 on unfixed code. (will fail on fixed code)

2. **Bug 2 — Empty snap warning**: Call `checkMissedYesterday()` with empty snapshot mock.
   Assert warning is visible on unfixed code. (will fail on fixed code)

3. **Bug 3 — Uzbek message**: Enter hemoglobin=0 (invalid). Assert message contains
   `"Noto'g'ri"` on unfixed code. (will fail on fixed code)

4. **Bug 4 — API call**: Submit vitamin analysis. Assert `fetch` is called with
   `/api/analysis/estimate` on unfixed code. (will fail on fixed code)

5. **Bug 8 — updateDoc on missing doc**: Mock Firestore `updateDoc` to throw "No document".
   Assert "Failed to save profile" error on unfixed code. (will fail on fixed code)

**Expected Counterexamples:**
- Chart percentage > 100 when timesPerDay > 1
- Warning shown when snap.empty
- Uzbek strings in validation messages
- fetch() called for analysis submission
- updateDoc throws for new users

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function
produces the expected behavior.

**Pseudocode (Bug 1):**
```
FOR ALL medicines WHERE sum(timesPerDay) > medicines.length DO
  result := drawWeeklyChart_fixed(medicines, logs)
  ASSERT result.percentage >= 0 AND result.percentage <= 100
END FOR
```

**Pseudocode (Bug 2):**
```
FOR ALL snap WHERE snap.empty === true DO
  result := checkMissedYesterday_fixed(snap)
  ASSERT warningElement.classList.contains("hidden")
END FOR

FOR ALL snap WHERE snap.empty === false AND all taken === false DO
  result := checkMissedYesterday_fixed(snap)
  ASSERT warningElement.innerHTML CONTAINS "Yesterday you missed your medicines"
END FOR
```

**Pseudocode (Bug 8):**
```
FOR ALL userId WHERE userDocExists(userId) === false DO
  result := saveProfile_fixed(userId, displayName)
  ASSERT result === "success"
  ASSERT setDoc WAS CALLED with merge:true
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed
function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL medicines WHERE all timesPerDay === 1 DO
  ASSERT drawWeeklyChart_original(medicines, logs)
       = drawWeeklyChart_fixed(medicines, logs)
END FOR

FOR ALL snap WHERE snap.docs.some(d => d.data().taken === true) DO
  ASSERT checkMissedYesterday_original(snap) = checkMissedYesterday_fixed(snap)
  // both hide the warning
END FOR
```

**Testing Approach**: Property-based testing is recommended for Bug 1 and Bug 2 preservation
because they involve numeric calculations and boolean logic over variable-length inputs.

---

### Unit Tests

- Bug 1: `drawWeeklyChart` with medicines having mixed `timesPerDay` values
- Bug 1: `drawWeeklyChart` with all `timesPerDay=1` (preservation)
- Bug 2: `checkMissedYesterday` with `snap.empty=true` → warning hidden
- Bug 2: `checkMissedYesterday` with all `taken=false` → message is "Yesterday you missed your medicines"
- Bug 2: `checkMissedYesterday` with one `taken=true` → warning hidden (preservation)
- Bug 3: Invalid hemoglobin → English error message
- Bug 3: Low hemoglobin → English threshold warning
- Bug 8: `saveProfile` when user doc doesn't exist → `setDoc` called, no error
- Bug 8: `saveProfile` when user doc exists → same result as before (preservation)

### Property-Based Tests

- Bug 1: For any array of medicines with random `timesPerDay` values (1–5), chart percentage is always in [0, 100]
- Bug 2: For any empty snapshot, warning is always hidden
- Bug 2: For any snapshot where all `taken=false` and not empty, warning message is always the fixed English string
- Bug 8: For any userId (existing or not), `setDoc` with `merge:true` always succeeds

### Integration Tests

- Bug 4: Submit blood analysis → data appears in Firestore `analyses` collection, no API call made
- Bug 4: Submit vitamin analysis → same as above
- Bug 5: Click "Read →" on saved article → modal appears, page does not navigate away
- Bug 6: Pregnancy page renders → Symptoms card has textarea and save button in DOM
- Bug 7: Settings page renders → email field has `readonly-field` class and helper text
- Bug 9: Settings page renders → no `@PediaMomBot` link, "coming soon" text visible
