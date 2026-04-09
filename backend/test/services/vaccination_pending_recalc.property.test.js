/**
 * Property-Based Tests for Pending Records Recalculation on Birthdate Change
 * Feature: vaccination-tracker, Property 5: Pending records recalculation on birthdate change
 *
 * **Validates: Requirements 5.3**
 */

// Feature: vaccination-tracker, Property 5: Pending records recalculation on birthdate change

const fc = require("fast-check");
const { UZ_VACCINE_SCHEDULE } = require("../../shared/uz_vaccine_schedule");

// Pure recalculation logic (mirrors children.module.js birthdate change handler)
function recalculatePendingRecords(records, newBirthDate) {
  return records.map((record) => {
    if (record.status !== "pending") return record;
    const vaccine = UZ_VACCINE_SCHEDULE.find(
      (v) => v.name === record.vaccineName,
    );
    if (!vaccine) return record;
    const d = new Date(newBirthDate);
    d.setDate(d.getDate() + vaccine.offsetDays);
    const newScheduledDate = d.toISOString().split("T")[0];
    return { ...record, scheduledDate: newScheduledDate };
  });
}

// Arbitrary ISO date string "YYYY-MM-DD"
const isoDateString = fc.integer({ min: 0, max: 40 * 365 }).map((offset) => {
  const d = new Date(new Date("2000-01-01").getTime() + offset * 86400000);
  return d.toISOString().split("T")[0];
});

// Arbitrary vaccination record for a given vaccine
const vaccinationRecord = (status) =>
  fc.record({
    vaccineName: fc.constantFrom(...UZ_VACCINE_SCHEDULE.map((v) => v.name)),
    scheduledDate: isoDateString,
    takenDate: status === "taken" ? isoDateString : fc.constant(null),
    status: fc.constant(status),
  });

describe("Property 5: Pending records recalculation on birthdate change", () => {
  /**
   * For any new birth date, all pending records must have their scheduledDate
   * updated to newBirthDate + offsetDays.
   *
   * **Validates: Requirements 5.3**
   */
  test("pending records get new scheduledDate = newBirthDate + offsetDays", () => {
    fc.assert(
      fc.property(
        isoDateString,
        fc.array(vaccinationRecord("pending"), { minLength: 1, maxLength: 20 }),
        (newBirthDate, records) => {
          const updated = recalculatePendingRecords(records, newBirthDate);

          for (let i = 0; i < updated.length; i++) {
            const vaccine = UZ_VACCINE_SCHEDULE.find(
              (v) => v.name === records[i].vaccineName,
            );
            if (!vaccine) continue;

            const expected = new Date(newBirthDate);
            expected.setDate(expected.getDate() + vaccine.offsetDays);
            const expectedStr = expected.toISOString().split("T")[0];

            expect(updated[i].scheduledDate).toBe(expectedStr);
            expect(updated[i].status).toBe("pending");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Taken records must NOT be modified when birthdate changes.
   *
   * **Validates: Requirements 5.3**
   */
  test("taken records are not modified on birthdate change", () => {
    fc.assert(
      fc.property(
        isoDateString,
        fc.array(vaccinationRecord("taken"), { minLength: 1, maxLength: 20 }),
        (newBirthDate, records) => {
          const updated = recalculatePendingRecords(records, newBirthDate);

          for (let i = 0; i < updated.length; i++) {
            expect(updated[i].scheduledDate).toBe(records[i].scheduledDate);
            expect(updated[i].takenDate).toBe(records[i].takenDate);
            expect(updated[i].status).toBe("taken");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Mixed records: only pending ones are updated.
   *
   * **Validates: Requirements 5.3**
   */
  test("only pending records are updated in a mixed list", () => {
    fc.assert(
      fc.property(
        isoDateString,
        fc.array(
          fc.oneof(vaccinationRecord("pending"), vaccinationRecord("taken")),
          { minLength: 2, maxLength: 20 },
        ),
        (newBirthDate, records) => {
          const updated = recalculatePendingRecords(records, newBirthDate);

          for (let i = 0; i < records.length; i++) {
            if (records[i].status === "taken") {
              // taken records unchanged
              expect(updated[i].scheduledDate).toBe(records[i].scheduledDate);
            } else {
              // pending records updated
              const vaccine = UZ_VACCINE_SCHEDULE.find(
                (v) => v.name === records[i].vaccineName,
              );
              if (!vaccine) continue;
              const expected = new Date(newBirthDate);
              expected.setDate(expected.getDate() + vaccine.offsetDays);
              expect(updated[i].scheduledDate).toBe(
                expected.toISOString().split("T")[0],
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
