# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE any fix)
  - **Property 1: Bug Condition** - All 9 Bug Conditions
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the code when tests fail**
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - Open `frontend/tests/bug-exploration.test.js` and write the following checks:
  - Bug 1: Mock 2 medicines with `timesPerDay=2`, 3 taken logs → assert computed percentage > 100 (confirms divisor bug)
  - Bug 2: Call `checkMissedYesterday` with `snap.empty=true` mock → assert `#missedWarning` does NOT have class `"hidden"` (confirms warning shown when it shouldn't be)
  - Bug 2b: Call with all `taken=false`, not empty → assert warning text contains a date string (not "Yesterday you missed your medicines")
  - Bug 3: Trigger invalid hemoglobin path → assert message contains `"Noto'g'ri"` (Uzbek string present)
  - Bug 4: Submit vitamin analysis → assert `fetch` was called with `/api/analysis/estimate` (API call present)
  - Bug 5: Call `openArticleDetail({id:"x", title:"T", category:"herbal"})` → assert `kbMenuItem.click` was called (navigates away)
  - Bug 6: Render pregnancy template → assert `document.getElementById("symptomsTextarea")` is null (textarea missing)
  - Bug 7: Render settings template → assert email input does NOT have class `"readonly-field"` (no visual indicator)
  - Bug 8: Mock `updateDoc` to throw → assert "Failed to save profile" error shown
  - Bug 9: Render settings template → assert `document.querySelector('a[href*="PediaMomBot"]')` is not null (bot link present)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL (this is correct — proves bugs exist)
  - Document counterexamples found for each bug
  - Mark task complete when all tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 6.1, 6.2, 7.1, 8.1, 9.1_

- [x] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - All Non-Buggy Behaviors
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed code behavior for non-buggy inputs first
  - Open `frontend/tests/preservation.test.js` and write the following checks:
  - Preservation 1 (Bug 1): For medicines where all `timesPerDay=1`, assert `taken/medsSnap.size * 100` equals `taken/sum(timesPerDay) * 100` — same result (no regression)
  - Preservation 2 (Bug 2): For snapshot where at least one log has `taken=true`, assert `#missedWarning` has class `"hidden"` on unfixed code
  - Preservation 3 (Bug 3): For valid hemoglobin/ferritin values, assert no validation error message is shown
  - Preservation 4 (Bug 4): For blood analysis, assert hemoglobin/ferritin validation still runs (age-based threshold check present)
  - Preservation 5 (Bug 5): Navigate to Knowledge Base directly → assert KB module functions independently (no interference from saved articles fix)
  - Preservation 6 (Bug 6): Save period data in Pregnancy calendar → assert `savePeriodData` is called and calendar re-renders
  - Preservation 7 (Bug 7/8): Change password flow → assert `reauthenticateWithCredential` + `updatePassword` still called
  - Preservation 8 (Bug 8): Dark mode toggle → assert `localStorage.setItem("pediamom_darkmode", ...)` still called
  - Preservation 9 (Bug 8): Delete account → assert `deleteDoc` + `deleteUser` still called
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 3. Fix Bug 1 — drawWeeklyChart() totalMedicines calculation

  - [x] 3.1 Replace totalMedicines with sum of timesPerDay in daily_checklist.module.js
    - In `drawWeeklyChart()`, replace `const totalMedicines = medsSnap.size`
    - With `const totalMedicines = medsSnap.docs.reduce((sum, d) => sum + (Number(d.data().timesPerDay) || 1), 0)`
    - _Bug_Condition: isBugCondition_Bug1(medicines) — at least one medicine has timesPerDay > 1_
    - _Expected_Behavior: percentage = taken / sum(timesPerDay) * 100, always in [0, 100]_
    - _Preservation: medicines with all timesPerDay=1 produce same result as before_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Chart percentage never exceeds 100%
    - **IMPORTANT**: Re-run the SAME test from task 1 (Bug 1 check) — do NOT write a new test
    - Run: medicines with timesPerDay=2 → assert percentage ≤ 100
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 1 is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Single-dose medicine chart accuracy
    - Re-run preservation test 1 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (no regression for timesPerDay=1 medicines)

- [x] 4. Fix Bug 2 — checkMissedYesterday() snap.empty handling and message

  - [x] 4.1 Fix snap.empty guard and warning message in daily_checklist.module.js
    - In `checkMissedYesterday()`, replace the combined `if (snap.empty || ...)` block
    - Add early return when `snap.empty === true`: `if (snap.empty) { warning.classList.add("hidden"); return; }`
    - Change warning message from date-specific to: `warning.innerHTML = "⚠️ Yesterday you missed your medicines"`
    - _Bug_Condition: isBugCondition_Bug2(snap) — snap.empty===true OR all taken===false with date string_
    - _Expected_Behavior: snap.empty → warning hidden; all taken=false → "Yesterday you missed your medicines"_
    - _Preservation: at least one taken=true → warning stays hidden_
    - _Requirements: 2.3, 2.4, 2.5, 3.2_

  - [x] 4.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Warning hidden when snap.empty; relative message when all missed
    - Re-run Bug 2 and Bug 2b checks from task 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms Bug 2 is fixed)
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 4.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Warning hidden when at least one taken
    - Re-run preservation test 2 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (no regression)

- [x] 5. Fix Bug 3 — Uzbek validation messages → English

  - [x] 5.1 Replace Uzbek strings with English in addanalysis.module.js
    - Replace `showMessage("Noto'g'ri qiymat kiritildi", "error")` with `showMessage("Invalid value entered", "error")`
    - Replace Uzbek hemoglobin warning: `"⚠️ Hemoglobin past: bolaning yoshi uchun norma X g/dL dan yuqori bo'lishi kerak"` → `"⚠️ Hemoglobin is low: normal for child's age is above X g/dL"`
    - Replace Uzbek ferritin warning: `"⚠️ Ferritin past: bolaning yoshi uchun norma X ng/mL dan yuqori bo'lishi kerak"` → `"⚠️ Ferritin is low: normal for child's age is above X ng/mL"`
    - _Bug_Condition: isBugCondition_Bug3(message) — message contains Uzbek strings_
    - _Expected_Behavior: all validation messages in English only_
    - _Preservation: valid values still produce no validation error_
    - _Requirements: 2.6, 2.7, 2.8, 3.3_

  - [x] 5.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Validation messages in English
    - Re-run Bug 3 check from task 1 — assert no Uzbek strings in messages
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 3 is fixed)
    - _Requirements: 2.6, 2.7, 2.8_

  - [x] 5.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid values produce no error; blood validation still runs
    - Re-run preservation tests 3 and 4 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (no regression)

- [x] 6. Fix Bug 4 — Replace API calls with direct Firestore save in addanalysis.module.js

  - [x] 6.1 Replace getAnalysisCostEstimate/executeAIAnalysis with addDoc to Firestore
    - In the form `onsubmit` handler, remove the `try` block that calls `getAnalysisCostEstimate()` and `executeAIAnalysis()`
    - Replace with direct Firestore save: `await addDoc(collection(db, "analyses"), { userId, childId: childSelect.value, type, values, createdAt: serverTimestamp() })`
    - Show success message: `showMessage("Analysis saved successfully!", "success")`
    - Reset form and hide field sections after save
    - Ensure `addDoc`, `collection`, `serverTimestamp` are already imported (they are)
    - _Bug_Condition: isBugCondition_Bug4(submission) — code calls fetch('/api/analysis/estimate')_
    - _Expected_Behavior: data saved to Firestore analyses collection, no API call made_
    - _Preservation: blood analysis validation (hemoglobin/ferritin thresholds) still runs before save_
    - _Requirements: 2.9, 2.10, 3.4_

  - [x] 6.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Analysis saved to Firestore, no fetch() call
    - Re-run Bug 4 check from task 1 — assert `fetch` NOT called with `/api/analysis/estimate`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 4 is fixed)
    - _Requirements: 2.9, 2.10_

  - [x] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Blood analysis validation still runs
    - Re-run preservation test 4 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (no regression)

- [x] 7. Fix Bug 5 — openArticleDetail() shows modal instead of navigating away

  - [x] 7.1 Replace navigation logic with inline modal in savedarticles.module.js
    - Replace the body of `openArticleDetail(article)` — remove `kbMenuItem.click()` and `dispatchEvent` logic
    - Create inline modal: `const modal = document.createElement("div")` with id `"savedArticleModal"` and class `"pm-modal"`
    - Modal content: article title (`<h3>`), summary (`<p class="kb-summary">`), full content (`<div class="kb-content">`)
    - Add close button `id="closeSavedArticleModal"` and click-outside-to-close handler
    - Append modal to `document.body`
    - _Bug_Condition: isBugCondition_Bug5(clickEvent) — code calls kbMenuItem.click()_
    - _Expected_Behavior: modal appears inline, page does not navigate away_
    - _Preservation: Knowledge Base page functions independently_
    - _Requirements: 2.11, 3.5_

  - [x] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Modal shown, no navigation
    - Re-run Bug 5 check from task 1 — assert `kbMenuItem.click` NOT called, modal element exists in DOM
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 5 is fixed)
    - _Requirements: 2.11_

  - [x] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Knowledge Base independent
    - Re-run preservation test 5 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (no regression)

- [x] 8. Fix Bug 6 — Pregnancy Symptoms card: add textarea and save button

  - [x] 8.1 Add textarea and save button to Symptoms card in dashboard.js pregnancy template
    - In `pages.pregnancy` template, find the Symptoms `<div class="pregnancy-info-card">` block
    - Replace the static `<p>` text with: `<textarea id="symptomsTextarea" placeholder="Note your symptoms here..." rows="3" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;resize:vertical;"></textarea>`
    - Add below textarea: `<button id="updateSymptomsBtn" style="margin-top:8px;">Save</button>`
    - The existing `renderInfoCards()` in `pregnancy.module.js` already wires up `#updateSymptomsBtn` — no module change needed
    - _Bug_Condition: isBugCondition_Bug6(dom) — #symptomsTextarea or #updateSymptomsBtn is null_
    - _Expected_Behavior: textarea and save button present in Symptoms card DOM_
    - _Preservation: period data save/load and calendar still work_
    - _Requirements: 2.12, 2.13, 3.6_

  - [x] 8.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Symptoms card has textarea and save button
    - Re-run Bug 6 check from task 1 — assert `#symptomsTextarea` and `#updateSymptomsBtn` exist in DOM
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 6 is fixed)
    - _Requirements: 2.13_

  - [x] 8.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Period calendar save/load unaffected
    - Re-run preservation test 6 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (no regression)

- [x] 9. Fix Bug 7 — Email field readonly styling and helper text

  - [x] 9.1 Add readonly-field class and helper text to email input in dashboard.js settings template
    - In `pages.settings` template, find `<input type="email" id="settingsEmail" ... readonly />`
    - Add `class="readonly-field"` attribute to the input
    - Add `<small style="color:#94a3b8;font-size:12px;">Email cannot be changed here</small>` immediately after the input
    - _Bug_Condition: isBugCondition_Bug7(emailInput) — no readonly-field class, no helper text_
    - _Expected_Behavior: email field visually grayed out with helper text_
    - _Preservation: password change flow unaffected_
    - _Requirements: 2.15, 3.7_

  - [x] 9.2 Add .readonly-field CSS rule to style.css
    - Append to `frontend/css/style.css`:
    ```css
    .readonly-field {
      background-color: #f1f5f9;
      color: #94a3b8;
      cursor: not-allowed;
    }
    ```
    - _Requirements: 2.15_

  - [x] 9.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Email field has readonly-field class and helper text
    - Re-run Bug 7 check from task 1 — assert `emailInput.classList.contains("readonly-field")` is true and helper text exists
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 7 is fixed)
    - _Requirements: 2.15_

  - [x] 9.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Password change flow unaffected
    - Re-run preservation test 7 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (no regression)

- [x] 10. Fix Bug 8 — settings.module.js: updateDoc → setDoc with merge:true

  - [x] 10.1 Replace updateDoc with setDoc(merge:true) for saveProfileBtn and saveTelegramBtn
    - In `settings.module.js` imports, add `setDoc` and remove `updateDoc`: `import { doc, getDoc, setDoc, deleteDoc } from "firebase-firestore"`
    - In `saveProfileBtn` handler: replace `await updateDoc(doc(db, "users", currentUser.uid), { displayName: name })` with `await setDoc(doc(db, "users", currentUser.uid), { displayName: name }, { merge: true })`
    - In `saveTelegramBtn` handler: replace `await updateDoc(doc(db, "users", currentUser.uid), { telegramChatId: chatId })` with `await setDoc(doc(db, "users", currentUser.uid), { telegramChatId: chatId }, { merge: true })`
    - _Bug_Condition: isBugCondition_Bug8(userId) — user doc doesn't exist AND code calls updateDoc_
    - _Expected_Behavior: setDoc with merge:true works for both new and existing users_
    - _Preservation: existing users' profile data not overwritten; dark mode, password change, account deletion unaffected_
    - _Requirements: 2.16, 2.17, 3.7, 3.8, 3.9_

  - [x] 10.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Save Profile works for new users (no Firestore doc)
    - Re-run Bug 8 check from task 1 — assert no "Failed to save profile" error, `setDoc` called with `merge:true`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 8 is fixed)
    - _Requirements: 2.16, 2.17_

  - [x] 10.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing users, dark mode, password change, account deletion unaffected
    - Re-run preservation tests 7, 8, 9 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (no regression)

- [x] 11. Fix Bug 9 — Replace Telegram section with "coming soon" in dashboard.js settings template

  - [x] 11.1 Replace Telegram section content in pages.settings template
    - In `pages.settings` template, find the `<div class="settings-section">` containing `<h3>📱 Telegram Notifications</h3>`
    - Replace the entire section content (the `<p>` with bot link, the `settings-field` div, and the `saveTelegramBtn`) with:
    ```html
    <p style="font-size:13px;color:#94a3b8;">
      🚧 Telegram notifications are coming soon. Stay tuned!
    </p>
    ```
    - Keep the outer `<div class="settings-section">` and `<h3>` heading
    - _Bug_Condition: isBugCondition_Bug9(dom) — a[href*="PediaMomBot"] exists in DOM_
    - _Expected_Behavior: no bot link, "coming soon" text visible_
    - _Preservation: other settings sections (profile, password, notifications, preferences) unaffected_
    - _Requirements: 2.18_

  - [x] 11.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - No PediaMomBot link, coming soon text present
    - Re-run Bug 9 check from task 1 — assert `document.querySelector('a[href*="PediaMomBot"]')` is null
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 9 is fixed)
    - _Requirements: 2.18_

- [x] 12. Checkpoint — Ensure all tests pass
  - Re-run all tests in `frontend/tests/bug-exploration.test.js` and `frontend/tests/preservation.test.js`
  - All 9 bug condition exploration tests must PASS (bugs fixed)
  - All preservation tests must PASS (no regressions)
  - Ensure all tests pass; ask the user if questions arise
