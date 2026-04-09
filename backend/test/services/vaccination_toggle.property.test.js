/**
 * Property-Based Tests for Vaccination Checkbox Toggle Round-Trip
 * Feature: vaccination-tracker, Property 6: Checkbox toggle round-trip
 *
 * **Validates: Requirements 6.5, 6.6**
 */

// Feature: vaccination-tracker, Property 6: Checkbox toggle round-trip

const fc = require("fast-check");

// Pure toggle logic (mirrors frontend/js/vaccination.module.js toggleVaccine)
function checkVaccine(record, takenDate) {
  return { ...record, takenDate, status: "taken" };
}

function uncheckVaccine(record) {
  return { ...record, takenDate: null, status: "pending" };
}

// Arbitrary ISO date string generator "YYYY-MM-DD"
const BASE_DATE = new Date("2000-01-01").getTime();
const MAX_OFFSET_DAYS = 40 * 365; // ~40 years

const isoDateString = fc
  .integer({ min: 0, max: MAX_OFFSET_DAYS })
  .map((offsetDays) => {
    const d = new Date(BASE_DATE + offsetDays * 86400000);
    return d.toISOString().split("T")[0];
  });

// Optional takenDate: null or an ISO date string
const optionalTakenDate = fc.option(isoDateString, { nil: null });

// Arbitrary vaccination record
const vaccinationRecord = fc.record({
  vaccineName: fc.string({ minLength: 1, maxLength: 50 }),
  scheduledDate: isoDateString,
  takenDate: optionalTakenDate,
  status: fc.constantFrom("pending", "taken", "overdue"),
});

describe("Property 6: Checkbox toggle round-trip", () => {
  /**
   * For any record and any takenDate:
   * uncheckVaccine(checkVaccine(record, takenDate)) must equal
   * { ...record, takenDate: null, status: "pending" }
   *
   * **Validates: Requirements 6.5, 6.6**
   */
  test("check then uncheck restores status to 'pending' and takenDate to null", () => {
    fc.assert(
      fc.property(vaccinationRecord, isoDateString, (record, takenDate) => {
        const checked = checkVaccine(record, takenDate);
        const unchecked = uncheckVaccine(checked);

        expect(unchecked.status).toBe("pending");
        expect(unchecked.takenDate).toBeNull();
        // All other fields are preserved
        expect(unchecked.vaccineName).toBe(record.vaccineName);
        expect(unchecked.scheduledDate).toBe(record.scheduledDate);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Uncheck is idempotent: unchecking an already-pending record keeps it pending.
   *
   * **Validates: Requirements 6.6**
   */
  test("uncheck is idempotent (already pending stays pending)", () => {
    const pendingRecord = vaccinationRecord.map((r) => ({
      ...r,
      takenDate: null,
      status: "pending",
    }));

    fc.assert(
      fc.property(pendingRecord, (record) => {
        const result = uncheckVaccine(record);
        expect(result.status).toBe("pending");
        expect(result.takenDate).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Check sets takenDate to the provided date and status to "taken".
   *
   * **Validates: Requirements 6.5**
   */
  test("check sets takenDate to the provided date and status to 'taken'", () => {
    fc.assert(
      fc.property(vaccinationRecord, isoDateString, (record, takenDate) => {
        const result = checkVaccine(record, takenDate);
        expect(result.status).toBe("taken");
        expect(result.takenDate).toBe(takenDate);
      }),
      { numRuns: 100 },
    );
  });
});
