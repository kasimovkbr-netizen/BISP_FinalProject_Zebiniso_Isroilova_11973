/**
 * Bug Condition Exploration Tests – PediaMom Dashboard UX Fixes
 *
 * These tests run on UNFIXED code and are EXPECTED TO FAIL.
 * A failing test confirms the bug exists (counterexample found).
 * A passing test would mean the bug is already fixed or the test logic is wrong.
 *
 * Run with: node frontend/tests/bug-exploration.test.js
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2,
 *            5.1, 6.1, 6.2, 7.1, 8.1, 9.1
 */

const fs = require("fs");
const path = require("path");

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function test(id, description, fn) {
  try {
    fn();
    // If we reach here the assertion passed – for exploration tests this is UNEXPECTED
    results.push({
      id,
      description,
      status: "PASS (unexpected – bug may be fixed)",
      counterexample: null,
    });
    passed++;
  } catch (err) {
    // Failure is the EXPECTED outcome for exploration tests – bug confirmed
    results.push({
      id,
      description,
      status: "FAIL (expected – bug confirmed)",
      counterexample: err.message,
    });
    failed++;
  }
}

async function testAsync(id, description, fn) {
  try {
    await fn();
    results.push({
      id,
      description,
      status: "PASS (unexpected – bug may be fixed)",
      counterexample: null,
    });
    passed++;
  } catch (err) {
    results.push({
      id,
      description,
      status: "FAIL (expected – bug confirmed)",
      counterexample: err.message,
    });
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ─── Read source files ────────────────────────────────────────────────────────

const checklistJs = fs.readFileSync(
  path.join(__dirname, "../js/daily_checklist.module.js"),
  "utf8",
);
const addanalysisJs = fs.readFileSync(
  path.join(__dirname, "../js/addanalysis.module.js"),
  "utf8",
);
const savedarticlesJs = fs.readFileSync(
  path.join(__dirname, "../js/savedarticles.module.js"),
  "utf8",
);
const dashboardJs = fs.readFileSync(
  path.join(__dirname, "../js/dashboard.js"),
  "utf8",
);
const settingsJs = fs.readFileSync(
  path.join(__dirname, "../js/settings.module.js"),
  "utf8",
);

// ─── Bug 1 — drawWeeklyChart() totalMedicines divisor bug ────────────────────
// Source must use medsSnap.size (not sum of timesPerDay) — confirms divisor bug
// EXPECTED: FAIL (medsSnap.size IS used — confirms Bug 1)

test(
  "Bug1",
  "daily_checklist.module.js: drawWeeklyChart should use sum(timesPerDay) not medsSnap.size as divisor (bug: medsSnap.size used)",
  () => {
    // Check that the source still uses medsSnap.size as divisor (the bug)
    const usesMedsSnapSize = checklistJs.includes("medsSnap.size");
    const usesSumTimesPerDay =
      checklistJs.includes("timesPerDay") && checklistJs.includes("reduce");

    // The test asserts the CORRECT behavior (sum of timesPerDay) — which the unfixed code violates
    assert(
      !usesMedsSnapSize || usesSumTimesPerDay,
      `Counterexample: daily_checklist.module.js uses medsSnap.size as divisor in drawWeeklyChart(). ` +
        `medsSnap.size present: ${usesMedsSnapSize}, sum(timesPerDay) via reduce present: ${usesSumTimesPerDay}. ` +
        `Bug 1 confirmed – medsSnap.size used instead of sum(timesPerDay), causing percentages > 100%.`,
    );
  },
);

// ─── Bug 2 — checkMissedYesterday() shows warning when snap.empty=true ───────
// Source must NOT have combined if(snap.empty || ...) that shows warning for empty snap
// EXPECTED: FAIL (combined condition IS present — confirms Bug 2)

test(
  "Bug2",
  "daily_checklist.module.js: checkMissedYesterday should guard snap.empty separately (bug: combined if shows warning when snap.empty)",
  () => {
    // The bug: combined `if (snap.empty || snap.docs.every(...))` shows warning for empty snap
    const hasCombinedCondition =
      checklistJs.includes("snap.empty ||") ||
      checklistJs.includes("snap.empty||");
    const hasEarlyReturn =
      checklistJs.includes("snap.empty") && checklistJs.includes("return;");

    assert(
      !hasCombinedCondition || hasEarlyReturn,
      `Counterexample: daily_checklist.module.js uses combined "if (snap.empty || ...)" condition. ` +
        `Combined condition present: ${hasCombinedCondition}, early return guard present: ${hasEarlyReturn}. ` +
        `Bug 2 confirmed – snap.empty branch shows warning instead of hiding it.`,
    );
  },
);

// ─── Bug 2b — checkMissedYesterday() warning text contains date string ────────
// Source must NOT use toLocaleDateString for warning message
// EXPECTED: FAIL (date-specific message IS used — confirms Bug 2b)

test(
  "Bug2b",
  "daily_checklist.module.js: warning message should be 'Yesterday you missed your medicines' not date-specific (bug: toLocaleDateString used)",
  () => {
    const hasDateSpecificMessage =
      checklistJs.includes("toLocaleDateString") &&
      checklistJs.includes("You missed medicines on");
    const hasRelativeMessage = checklistJs.includes(
      "Yesterday you missed your medicines",
    );

    assert(
      !hasDateSpecificMessage || hasRelativeMessage,
      `Counterexample: daily_checklist.module.js uses date-specific warning message with toLocaleDateString. ` +
        `Date-specific message present: ${hasDateSpecificMessage}, relative message present: ${hasRelativeMessage}. ` +
        `Bug 2b confirmed – warning shows date string instead of "Yesterday you missed your medicines".`,
    );
  },
);

// ─── Bug 3 — Uzbek validation message in addanalysis.module.js ───────────────
// Invalid hemoglobin path → message should NOT contain "Noto'g'ri"
// EXPECTED: FAIL (Uzbek string is present in source)

test(
  "Bug3",
  "addanalysis.module.js: invalid hemoglobin path → message should NOT contain Uzbek string \"Noto'g'ri\" (bug: Uzbek strings present)",
  () => {
    // Check that the source contains the Uzbek validation string
    const hasUzbekInvalid = addanalysisJs.includes(
      "Noto'g'ri qiymat kiritildi",
    );
    const hasUzbekHemoglobin = addanalysisJs.includes(
      "bolaning yoshi uchun norma",
    );
    const hasUzbekFerritin = addanalysisJs.includes(
      "dan yuqori bo'lishi kerak",
    );

    // The test asserts the CORRECT behavior (no Uzbek strings) — which the unfixed code violates
    assert(
      !hasUzbekInvalid && !hasUzbekHemoglobin && !hasUzbekFerritin,
      `Counterexample: addanalysis.module.js contains Uzbek validation strings. ` +
        `Found: ${hasUzbekInvalid ? "\"Noto'g'ri qiymat kiritildi\"" : ""} ` +
        `${hasUzbekHemoglobin ? '"bolaning yoshi uchun norma"' : ""} ` +
        `${hasUzbekFerritin ? '"dan yuqori bo\'lishi kerak"' : ""}. ` +
        `Bug 3 confirmed – validation messages are in Uzbek instead of English.`,
    );
  },
);

// ─── Bug 4 — Submit vitamin analysis → fetch called with /api/analysis/estimate ─
// EXPECTED: FAIL (fetch IS called with that URL — confirms the API call bug)

test(
  "Bug4",
  "addanalysis.module.js: vitamin analysis submission → fetch should NOT be called with '/api/analysis/estimate' (bug: API call present)",
  () => {
    // Check that the source contains the API call to /api/analysis/estimate
    const hasApiEstimateCall = addanalysisJs.includes("/api/analysis/estimate");
    const hasApiExecuteCall = addanalysisJs.includes("/api/analysis/execute");

    // The test asserts the CORRECT behavior (no API calls) — which the unfixed code violates
    assert(
      !hasApiEstimateCall && !hasApiExecuteCall,
      `Counterexample: addanalysis.module.js contains fetch calls to unavailable API endpoints. ` +
        `Found: ${hasApiEstimateCall ? '"/api/analysis/estimate"' : ""} ` +
        `${hasApiExecuteCall ? '"/api/analysis/execute"' : ""}. ` +
        `Bug 4 confirmed – analysis submission calls API instead of saving directly to Firestore.`,
    );
  },
);

// ─── Bug 5 — openArticleDetail() calls kbMenuItem.click() ────────────────────
// EXPECTED: FAIL (kbMenuItem.click IS called — confirms navigation bug)

test(
  "Bug5",
  "savedarticles.module.js: openArticleDetail() should NOT call kbMenuItem.click() (bug: navigates away to KB page)",
  () => {
    // Check that the source contains kbMenuItem.click() in openArticleDetail
    const hasKbMenuClick = savedarticlesJs.includes("kbMenuItem.click()");
    const hasKbMenuQuery = savedarticlesJs.includes(
      '[data-page="knowledgebase"]',
    );

    // The test asserts the CORRECT behavior (no navigation) — which the unfixed code violates
    assert(
      !hasKbMenuClick,
      `Counterexample: savedarticles.module.js openArticleDetail() calls kbMenuItem.click(). ` +
        `Found: kbMenuItem.click() call present (navigates to Knowledge Base page). ` +
        `Also found: querySelector('[data-page="knowledgebase"]') = ${hasKbMenuQuery}. ` +
        `Bug 5 confirmed – clicking "Read →" navigates away instead of showing inline modal.`,
    );
  },
);

// ─── Bug 6 — Pregnancy template missing #symptomsTextarea ────────────────────
// EXPECTED: FAIL (textarea IS missing — confirms Bug 6)

test(
  "Bug6",
  "dashboard.js pregnancy template: document.getElementById('symptomsTextarea') should exist (bug: textarea missing)",
  () => {
    // Check that the pregnancy template in dashboard.js contains the symptomsTextarea
    const hasTextarea =
      dashboardJs.includes('id="symptomsTextarea"') ||
      dashboardJs.includes("id='symptomsTextarea'");
    const hasSaveBtn =
      dashboardJs.includes('id="updateSymptomsBtn"') ||
      dashboardJs.includes("id='updateSymptomsBtn'");

    // The test asserts the CORRECT behavior (textarea present) — which the unfixed code violates
    assert(
      hasTextarea && hasSaveBtn,
      `Counterexample: dashboard.js pregnancy template does NOT contain symptomsTextarea or updateSymptomsBtn. ` +
        `symptomsTextarea present: ${hasTextarea}, updateSymptomsBtn present: ${hasSaveBtn}. ` +
        `Bug 6 confirmed – Symptoms card has no textarea or save button in the pregnancy template.`,
    );
  },
);

// ─── Bug 7 — Settings email input missing readonly-field class ────────────────
// EXPECTED: FAIL (class is absent — confirms Bug 7)

test(
  "Bug7",
  "dashboard.js settings template: email input should have class 'readonly-field' (bug: no visual indicator for readonly)",
  () => {
    // Check that the settings template email input has the readonly-field class
    const hasReadonlyFieldClass =
      dashboardJs.includes('class="readonly-field"') ||
      dashboardJs.includes("class='readonly-field'") ||
      // Could be combined with other classes
      /settingsEmail[^>]*readonly-field/.test(dashboardJs) ||
      /readonly-field[^>]*settingsEmail/.test(dashboardJs);

    // The test asserts the CORRECT behavior (class present) — which the unfixed code violates
    assert(
      hasReadonlyFieldClass,
      `Counterexample: dashboard.js settings template email input does NOT have class "readonly-field". ` +
        `The email field has readonly attribute but no visual styling class. ` +
        `Bug 7 confirmed – no visual indicator that the email field is non-editable.`,
    );
  },
);

// ─── Bug 8 — settings.module.js updateDoc throws for new users ───────────────
// Mock updateDoc to throw → assert "Failed to save profile" error shown
// EXPECTED: FAIL (error IS shown — confirms Bug 8)
// Note: Bug8 async version below is the authoritative test; this is a source-check

test(
  "Bug8",
  "settings.module.js: source uses updateDoc instead of setDoc(merge:true) (bug: updateDoc fails for new users)",
  () => {
    // Check that settings.module.js uses updateDoc (the buggy call)
    const settingsJs = fs.readFileSync(
      path.join(__dirname, "../js/settings.module.js"),
      "utf8",
    );
    const usesUpdateDoc = settingsJs.includes("updateDoc(doc(db");
    const usesSetDocMerge =
      settingsJs.includes("setDoc(") && settingsJs.includes("merge: true");

    // The correct behavior is setDoc with merge:true — unfixed code uses updateDoc
    assert(
      !usesUpdateDoc || usesSetDocMerge,
      `Counterexample: settings.module.js uses updateDoc() for saveProfileBtn handler. ` +
        `updateDoc present: ${usesUpdateDoc}, setDoc+merge present: ${usesSetDocMerge}. ` +
        `Bug 8 confirmed – updateDoc fails for new users who have no Firestore document.`,
    );
  },
);

// ─── Bug 9 — Settings template contains PediaMomBot link ─────────────────────
// EXPECTED: FAIL (link IS present — confirms Bug 9)

test(
  "Bug9",
  "dashboard.js settings template: a[href*='PediaMomBot'] should NOT exist (bug: non-existent bot link present)",
  () => {
    // Check that the settings template contains the PediaMomBot link
    const hasBotLink =
      dashboardJs.includes("PediaMomBot") ||
      dashboardJs.includes("t.me/PediaMomBot");

    // The test asserts the CORRECT behavior (no bot link) — which the unfixed code violates
    assert(
      !hasBotLink,
      `Counterexample: dashboard.js settings template contains a link to PediaMomBot. ` +
        `Found: "PediaMomBot" reference in settings template. ` +
        `Bug 9 confirmed – settings page shows a link to a non-existent Telegram bot, misleading users.`,
    );
  },
);

// ─── Run async tests and then print summary ───────────────────────────────────

async function runAllTests() {
  // Bug 8 async confirmation — source-based check
  await testAsync(
    "Bug8-async",
    "settings.module.js: setDoc with merge:true used (async confirmation)",
    async () => {
      const settingsJs = fs.readFileSync(
        path.join(__dirname, "../js/settings.module.js"),
        "utf8",
      );
      const usesSetDoc = settingsJs.includes("setDoc(");
      const usesMergeTrue = settingsJs.includes("merge: true");
      const usesUpdateDoc = settingsJs.includes("updateDoc(doc(db");

      assert(
        usesSetDoc && usesMergeTrue && !usesUpdateDoc,
        `Counterexample: settings.module.js still uses updateDoc instead of setDoc+merge. ` +
          `setDoc present: ${usesSetDoc}, merge:true present: ${usesMergeTrue}, updateDoc present: ${usesUpdateDoc}. ` +
          `Bug 8 confirmed – updateDoc fails for new users without a Firestore document.`,
      );
    },
  );

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log(
    "\n╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║     PediaMom Bug Condition Exploration Tests (9 Bugs)        ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\n",
  );

  results.forEach((r) => {
    const icon = r.status.startsWith("FAIL") ? "✗" : "✓";
    console.log(`  ${icon} [${r.id}] ${r.description}`);
    console.log(`       Status: ${r.status}`);
    if (r.counterexample) {
      console.log(`       Counterexample: ${r.counterexample}`);
    }
    console.log();
  });

  console.log("─────────────────────────────────────────────────────────────");
  console.log(
    `  Total: ${passed + failed}  |  FAIL (bugs confirmed): ${failed}  |  PASS (unexpected): ${passed}`,
  );
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  const expectedBugs = 10; // 9 sync + 1 async duplicate of Bug8
  if (passed === 0) {
    console.log(
      `✅ All ${failed} bug conditions confirmed on unfixed code. Proceed with fixes.\n`,
    );
  } else {
    console.log(
      `⚠️  ${passed} test(s) passed unexpectedly – those bugs may already be fixed or test logic needs review.\n`,
    );
  }

  // Exit with non-zero if any test passed unexpectedly
  process.exit(passed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
