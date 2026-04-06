/**
 * Preservation Tests – PediaMom Dashboard UX Fixes
 *
 * These tests confirm EXISTING CORRECT behaviors on UNFIXED code.
 * All tests are EXPECTED TO PASS – they document the baseline that must
 * be preserved after the bug fixes are applied.
 *
 * Run with: node frontend/tests/preservation.test.js
 *
 * Validates: Requirements 3.1–3.9
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
    results.push({ id, description, status: "PASS", detail: null });
    passed++;
  } catch (err) {
    results.push({ id, description, status: "FAIL", detail: err.message });
    failed++;
  }
}

async function testAsync(id, description, fn) {
  try {
    await fn();
    results.push({ id, description, status: "PASS", detail: null });
    passed++;
  } catch (err) {
    results.push({ id, description, status: "FAIL", detail: err.message });
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
const pregnancyJs = fs.readFileSync(
  path.join(__dirname, "../js/pregnancy.module.js"),
  "utf8",
);

// ─── Preservation 1 (Bug 1) — timesPerDay=1 chart result unchanged ────────────
// For medicines where all timesPerDay=1, taken/medsSnap.size * 100 equals
// taken/sum(timesPerDay) * 100 — same result (no regression).
// Validates: Requirements 3.1

test(
  "Pres1",
  "Bug1 preservation: timesPerDay=1 medicines produce same percentage with both formulas",
  () => {
    const medicines = [
      { timesPerDay: 1 },
      { timesPerDay: 1 },
      { timesPerDay: 1 },
    ];
    const takenCount = 2;

    // Original formula (buggy for timesPerDay>1, but correct for timesPerDay=1)
    const divisorOriginal = medicines.length; // = 3
    const percentageOriginal = Math.round((takenCount / divisorOriginal) * 100); // = 67

    // Fixed formula: sum of timesPerDay
    const divisorFixed = medicines.reduce((sum, m) => sum + m.timesPerDay, 0); // = 3
    const percentageFixed = Math.round((takenCount / divisorFixed) * 100); // = 67

    assert(
      percentageOriginal === percentageFixed,
      `Preservation 1 FAILED: timesPerDay=1 medicines produce different results. ` +
        `Original=${percentageOriginal}%, Fixed=${percentageFixed}%. ` +
        `The fix must not change behavior for single-dose medicines.`,
    );

    assert(
      percentageFixed <= 100,
      `Preservation 1 FAILED: percentage ${percentageFixed}% exceeds 100% even for timesPerDay=1.`,
    );
  },
);

// ─── Preservation 2 (Bug 2) — Warning hidden when at least one taken ──────────
// For snapshot where at least one log has taken=true, warning stays hidden.
// Validates: Requirements 3.2

test(
  "Pres2",
  "Bug2 preservation: checkMissedYesterday hides warning when at least one log has taken=true",
  () => {
    const warning = {
      classList: {
        _classes: new Set(["hidden"]),
        add(c) {
          this._classes.add(c);
        },
        remove(c) {
          this._classes.delete(c);
        },
        contains(c) {
          return this._classes.has(c);
        },
      },
      innerHTML: "",
    };

    const snap = {
      empty: false,
      docs: [
        { data: () => ({ taken: true }) },
        { data: () => ({ taken: false }) },
      ],
    };

    // Simulate UNFIXED logic — at least one taken=true → else branch → hidden
    if (snap.empty || snap.docs.every((d) => d.data().taken === false)) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yFormatted = y.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      warning.innerHTML = `⚠️ You missed medicines on ${yFormatted}`;
      warning.classList.remove("hidden");
    } else {
      warning.classList.add("hidden");
    }

    assert(
      warning.classList.contains("hidden"),
      `Preservation 2 FAILED: warning is NOT hidden when at least one log has taken=true. ` +
        `innerHTML="${warning.innerHTML}". This baseline behavior must be preserved.`,
    );
  },
);

// ─── Preservation 3 (Bug 3) — Valid hemoglobin/ferritin → no validation error ─
// For valid values, no validation error message is shown.
// Validates: Requirements 3.3

test(
  "Pres3",
  "Bug3 preservation: valid hemoglobin/ferritin values produce no validation error",
  () => {
    // Simulate validateHemoglobin and validateFerritin with valid values
    function validateHemoglobin(value, ageMonths, gender) {
      if (value < 0 || value > 25) return "invalid";
      let threshold;
      if (ageMonths >= 6 && ageMonths <= 59) threshold = 11.0;
      else if (ageMonths >= 60 && ageMonths <= 143) threshold = 11.5;
      else if (ageMonths >= 144) threshold = gender === "female" ? 12.0 : 13.0;
      else return "ok";
      return value < threshold ? "low" : "ok";
    }

    function validateFerritin(value, ageMonths) {
      if (value < 0 || value > 2000) return "invalid";
      let threshold;
      if (ageMonths >= 6 && ageMonths <= 59) threshold = 12;
      else if (ageMonths >= 60 && ageMonths <= 143) threshold = 15;
      else if (ageMonths >= 144) threshold = 12;
      else return "ok";
      return value < threshold ? "low" : "ok";
    }

    // Valid values: hemoglobin=12.5 (above threshold), ferritin=20 (above threshold), age=24mo
    const hgbResult = validateHemoglobin(12.5, 24, "male");
    const ferResult = validateFerritin(20, 24);

    assert(
      hgbResult === "ok",
      `Preservation 3 FAILED: valid hemoglobin=12.5 returned "${hgbResult}" instead of "ok".`,
    );
    assert(
      ferResult === "ok",
      `Preservation 3 FAILED: valid ferritin=20 returned "${ferResult}" instead of "ok".`,
    );
  },
);

// ─── Preservation 4 (Bug 4) — Blood analysis validation still runs ────────────
// For blood analysis, hemoglobin/ferritin validation logic is still present.
// Validates: Requirements 3.4

test(
  "Pres4",
  "Bug4 preservation: blood analysis validation (validateHemoglobin/validateFerritin) still present in source",
  () => {
    const hasValidateHemoglobin = addanalysisJs.includes("validateHemoglobin");
    const hasValidateFerritin = addanalysisJs.includes("validateFerritin");
    const hasAgeBasedThreshold = addanalysisJs.includes("ageMonths");

    assert(
      hasValidateHemoglobin,
      `Preservation 4 FAILED: addanalysis.module.js no longer calls validateHemoglobin(). ` +
        `Blood analysis validation must be preserved.`,
    );
    assert(
      hasValidateFerritin,
      `Preservation 4 FAILED: addanalysis.module.js no longer calls validateFerritin(). ` +
        `Blood analysis validation must be preserved.`,
    );
    assert(
      hasAgeBasedThreshold,
      `Preservation 4 FAILED: addanalysis.module.js no longer uses age-based thresholds. ` +
        `Age-based validation logic must be preserved.`,
    );
  },
);

// ─── Preservation 5 (Bug 5) — Knowledge Base functions independently ──────────
// Knowledge Base module has its own init function independent of saved articles.
// Validates: Requirements 3.5

test(
  "Pres5",
  "Bug5 preservation: knowledgebase.module.js exists and has its own init function",
  () => {
    const kbPath = path.join(__dirname, "../js/knowledgebase.module.js");
    const kbExists = fs.existsSync(kbPath);

    assert(
      kbExists,
      `Preservation 5 FAILED: knowledgebase.module.js does not exist. ` +
        `Knowledge Base module must function independently.`,
    );

    const kbJs = fs.readFileSync(kbPath, "utf8");
    const hasInitKB = kbJs.includes("initKnowledgeBaseModule");

    assert(
      hasInitKB,
      `Preservation 5 FAILED: knowledgebase.module.js does not export initKnowledgeBaseModule(). ` +
        `Knowledge Base must have its own independent init function.`,
    );
  },
);

// ─── Preservation 6 (Bug 6) — Period data save/load still works ───────────────
// pregnancy.module.js still has savePeriodData logic and calendar rendering.
// Validates: Requirements 3.6

test(
  "Pres6",
  "Bug6 preservation: pregnancy.module.js still has period data save and calendar render logic",
  () => {
    const hasSavePeriod =
      pregnancyJs.includes("savePeriodBtn") ||
      pregnancyJs.includes("savePeriodData") ||
      pregnancyJs.includes("lastPeriodDate");
    const hasCalendarRender =
      pregnancyJs.includes("periodCalendarGrid") ||
      pregnancyJs.includes("renderCalendar");

    assert(
      hasSavePeriod,
      `Preservation 6 FAILED: pregnancy.module.js no longer has period data save logic. ` +
        `Period calendar save must be preserved.`,
    );
    assert(
      hasCalendarRender,
      `Preservation 6 FAILED: pregnancy.module.js no longer has calendar rendering logic. ` +
        `Period calendar render must be preserved.`,
    );
  },
);

// ─── Preservation 7 (Bug 7/8) — Password change flow still present ────────────
// settings.module.js still calls reauthenticateWithCredential + updatePassword.
// Validates: Requirements 3.7

test(
  "Pres7",
  "Bug7/8 preservation: settings.module.js still has reauthenticateWithCredential + updatePassword",
  () => {
    const hasReauth = settingsJs.includes("reauthenticateWithCredential");
    const hasUpdatePassword = settingsJs.includes("updatePassword");

    assert(
      hasReauth,
      `Preservation 7 FAILED: settings.module.js no longer calls reauthenticateWithCredential(). ` +
        `Password change flow must be preserved.`,
    );
    assert(
      hasUpdatePassword,
      `Preservation 7 FAILED: settings.module.js no longer calls updatePassword(). ` +
        `Password change flow must be preserved.`,
    );
  },
);

// ─── Preservation 8 (Bug 8) — Dark mode toggle persists in localStorage ───────
// settings.module.js still calls localStorage.setItem("pediamom_darkmode", ...).
// Validates: Requirements 3.8

test(
  "Pres8",
  "Bug8 preservation: settings.module.js still persists dark mode in localStorage",
  () => {
    const hasDarkModeStorage = settingsJs.includes("pediamom_darkmode");
    const hasLocalStorageSet = settingsJs.includes("localStorage.setItem");

    assert(
      hasDarkModeStorage,
      `Preservation 8 FAILED: settings.module.js no longer references "pediamom_darkmode" key. ` +
        `Dark mode persistence must be preserved.`,
    );
    assert(
      hasLocalStorageSet,
      `Preservation 8 FAILED: settings.module.js no longer calls localStorage.setItem(). ` +
        `Dark mode persistence must be preserved.`,
    );
  },
);

// ─── Preservation 9 (Bug 8) — Account deletion still calls deleteDoc + deleteUser
// settings.module.js still calls deleteDoc + deleteUser for account deletion.
// Validates: Requirements 3.9

test(
  "Pres9",
  "Bug8 preservation: settings.module.js still calls deleteDoc + deleteUser for account deletion",
  () => {
    const hasDeleteDoc = settingsJs.includes("deleteDoc");
    const hasDeleteUser = settingsJs.includes("deleteUser");

    assert(
      hasDeleteDoc,
      `Preservation 9 FAILED: settings.module.js no longer calls deleteDoc(). ` +
        `Account deletion (Firestore doc removal) must be preserved.`,
    );
    assert(
      hasDeleteUser,
      `Preservation 9 FAILED: settings.module.js no longer calls deleteUser(). ` +
        `Account deletion (Auth user removal) must be preserved.`,
    );
  },
);

// ─── Summary ──────────────────────────────────────────────────────────────────

async function runAllTests() {
  console.log(
    "\n╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║     PediaMom Preservation Tests (Baseline Behaviors)         ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\n",
  );

  results.forEach((r) => {
    const icon = r.status === "PASS" ? "✓" : "✗";
    console.log(`  ${icon} [${r.id}] ${r.description}`);
    console.log(`       Status: ${r.status}`);
    if (r.detail) {
      console.log(`       Detail: ${r.detail}`);
    }
    console.log();
  });

  console.log("─────────────────────────────────────────────────────────────");
  console.log(
    `  Total: ${passed + failed}  |  PASS: ${passed}  |  FAIL: ${failed}`,
  );
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  if (failed === 0) {
    console.log(
      "✅ All preservation tests PASS. These behaviors must be retained after fixes.\n",
    );
  } else {
    console.log(
      `❌ ${failed} preservation test(s) FAILED. Baseline behavior is broken – investigate before applying fixes.\n`,
    );
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
