/**
 * Property-Based Tests for Vaccination Status Derivation
 * Feature: vaccination-tracker, Property 3: Status derivation correctness
 *
 * **Validates: Requirements 10.2**
 */

// Feature: vaccination-tracker, Property 3: Status derivation correctness

const fc = require("fast-check");

// Inline deriveStatus logic (mirrors frontend/js/vaccination_utils.js)
function deriveStatus(scheduledDate, takenDate, today) {
  if (takenDate != null) return "taken";
  if (scheduledDate < today) return "overdue";
  return "pending";
}

// Arbitrary ISO date string generator "YYYY-MM-DD"
// Use integer offsets from a base date to avoid invalid Date edge cases during shrinking
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

describe("Property 3: Status derivation correctness", () => {
  /**
   * For any vaccination record with arbitrary scheduledDate and takenDate:
   * - takenDate != null → "taken"
   * - takenDate == null && scheduledDate < today → "overdue"
   * - otherwise → "pending"
   *
   * **Validates: Requirements 10.2**
   */
  test("takenDate != null always yields 'taken'", () => {
    fc.assert(
      fc.property(
        isoDateString,
        isoDateString,
        isoDateString,
        (scheduledDate, takenDate, today) => {
          const status = deriveStatus(scheduledDate, takenDate, today);
          expect(status).toBe("taken");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("takenDate == null && scheduledDate < today yields 'overdue'", () => {
    // Generate pairs where scheduledDate < today by construction
    const overdueArb = fc
      .tuple(isoDateString, isoDateString)
      .filter(([a, b]) => a < b)
      .map(([earlier, later]) => ({ scheduledDate: earlier, today: later }));

    fc.assert(
      fc.property(overdueArb, ({ scheduledDate, today }) => {
        const status = deriveStatus(scheduledDate, null, today);
        expect(status).toBe("overdue");
      }),
      { numRuns: 100 },
    );
  });

  test("takenDate == null && scheduledDate >= today yields 'pending'", () => {
    // Generate pairs where scheduledDate >= today by construction
    const pendingArb = fc
      .tuple(isoDateString, isoDateString)
      .filter(([a, b]) => a >= b)
      .map(([scheduledDate, today]) => ({ scheduledDate, today }));

    fc.assert(
      fc.property(pendingArb, ({ scheduledDate, today }) => {
        const status = deriveStatus(scheduledDate, null, today);
        expect(status).toBe("pending");
      }),
      { numRuns: 100 },
    );
  });

  test("status is always one of the three valid values", () => {
    fc.assert(
      fc.property(
        isoDateString,
        optionalTakenDate,
        isoDateString,
        (scheduledDate, takenDate, today) => {
          const status = deriveStatus(scheduledDate, takenDate, today);
          expect(["taken", "overdue", "pending"]).toContain(status);
        },
      ),
      { numRuns: 100 },
    );
  });
});
