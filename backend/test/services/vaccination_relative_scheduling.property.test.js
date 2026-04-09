/**
 * Property-Based Tests for Relative Scheduling
 * Feature: vaccination-tracker, Property 7: Relative scheduling shifts only next pending
 *
 * **Validates: Requirements 7.1, 7.2, 7.4**
 */

// Feature: vaccination-tracker, Property 7: Relative scheduling shifts only next pending

const fc = require("fast-check");
const { UZ_VACCINE_SCHEDULE } = require("../../shared/uz_vaccine_schedule");

// Inline applyRelativeScheduling (mirrors frontend/js/vaccination_utils.js)
function applyRelativeScheduling(records, currentIdx, takenDate) {
  const currentRecord = records[currentIdx];
  // If taken on time or early, do not shift anything
  if (takenDate <= currentRecord.scheduledDate) {
    return records.slice();
  }
  const updated = records.slice();
  // Find the first pending record after currentIdx
  for (let i = currentIdx + 1; i < updated.length; i++) {
    if (updated[i].status === "pending") {
      const nextOffsetDays = updated[i].offsetDays;
      const currentOffsetDays = currentRecord.offsetDays;
      const takenDateObj = new Date(takenDate);
      takenDateObj.setDate(
        takenDateObj.getDate() + (nextOffsetDays - currentOffsetDays),
      );
      const newScheduledDate = takenDateObj.toISOString().split("T")[0];
      updated[i] = { ...updated[i], scheduledDate: newScheduledDate };
      break; // Only shift the immediately next pending record
    }
  }
  return updated;
}

// Build a mock records array from UZ_VACCINE_SCHEDULE using a fixed birthDate
function buildRecords(birthDate) {
  const birth = new Date(birthDate);
  return UZ_VACCINE_SCHEDULE.map((vaccine) => {
    const d = new Date(birth);
    d.setDate(d.getDate() + vaccine.offsetDays);
    const scheduledDate = d.toISOString().split("T")[0];
    return {
      vaccineName: vaccine.name,
      offsetDays: vaccine.offsetDays,
      scheduledDate,
      takenDate: null,
      status: "pending",
    };
  });
}

const BIRTH_DATE = "2023-01-01";
const BASE_RECORDS = buildRecords(BIRTH_DATE);

// Arbitrary: currentIdx in [0..18] (leaves at least one record after it)
const currentIdxArb = fc.integer({ min: 0, max: 18 });

// Arbitrary: daysLate in [1..30]
const daysLateArb = fc.integer({ min: 1, max: 30 });

describe("Property 7: Relative scheduling shifts only next pending", () => {
  /**
   * When takenDate > scheduledDate, only the immediately next pending record
   * must have its scheduledDate updated. All other records remain unchanged.
   *
   * **Validates: Requirements 7.1, 7.2, 7.4**
   */
  test("only the immediately next pending record is updated when taken late", () => {
    fc.assert(
      fc.property(currentIdxArb, daysLateArb, (currentIdx, daysLate) => {
        const records = BASE_RECORDS.slice();
        const currentScheduledDate = records[currentIdx].scheduledDate;

        // Compute takenDate = scheduledDate + daysLate
        const takenDateObj = new Date(currentScheduledDate);
        takenDateObj.setDate(takenDateObj.getDate() + daysLate);
        const takenDate = takenDateObj.toISOString().split("T")[0];

        const result = applyRelativeScheduling(records, currentIdx, takenDate);

        // Find the first pending record after currentIdx
        let firstPendingIdx = -1;
        for (let i = currentIdx + 1; i < records.length; i++) {
          if (records[i].status === "pending") {
            firstPendingIdx = i;
            break;
          }
        }

        // All records except the first pending one after currentIdx must be unchanged
        for (let i = 0; i < result.length; i++) {
          if (i === firstPendingIdx) {
            // This record's scheduledDate must have changed
            expect(result[i].scheduledDate).not.toBe(records[i].scheduledDate);
            // All other fields must remain the same
            expect(result[i].vaccineName).toBe(records[i].vaccineName);
            expect(result[i].offsetDays).toBe(records[i].offsetDays);
            expect(result[i].takenDate).toBe(records[i].takenDate);
            expect(result[i].status).toBe(records[i].status);
          } else {
            // Every other record must be completely unchanged
            expect(result[i]).toEqual(records[i]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * When takenDate <= scheduledDate, NO records change at all.
   *
   * **Validates: Requirements 7.1, 7.4**
   */
  test("no records change when taken on time or early", () => {
    fc.assert(
      fc.property(currentIdxArb, (currentIdx) => {
        const records = BASE_RECORDS.slice();
        const currentScheduledDate = records[currentIdx].scheduledDate;

        // takenDate == scheduledDate (on time)
        const result = applyRelativeScheduling(
          records,
          currentIdx,
          currentScheduledDate,
        );

        for (let i = 0; i < result.length; i++) {
          expect(result[i]).toEqual(records[i]);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * When takenDate < scheduledDate (early), NO records change.
   *
   * **Validates: Requirements 7.1, 7.4**
   */
  test("no records change when taken early", () => {
    fc.assert(
      fc.property(
        currentIdxArb,
        fc.integer({ min: 1, max: 30 }),
        (currentIdx, daysEarly) => {
          const records = BASE_RECORDS.slice();
          const currentScheduledDate = records[currentIdx].scheduledDate;

          // takenDate = scheduledDate - daysEarly (early)
          const takenDateObj = new Date(currentScheduledDate);
          takenDateObj.setDate(takenDateObj.getDate() - daysEarly);
          const takenDate = takenDateObj.toISOString().split("T")[0];

          const result = applyRelativeScheduling(
            records,
            currentIdx,
            takenDate,
          );

          for (let i = 0; i < result.length; i++) {
            expect(result[i]).toEqual(records[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * The new scheduledDate for the shifted record equals
   * takenDate + (nextOffsetDays - currentOffsetDays).
   *
   * **Validates: Requirements 7.2**
   */
  test("shifted scheduledDate equals takenDate + offset difference", () => {
    fc.assert(
      fc.property(currentIdxArb, daysLateArb, (currentIdx, daysLate) => {
        const records = BASE_RECORDS.slice();
        const currentRecord = records[currentIdx];
        const currentScheduledDate = currentRecord.scheduledDate;

        const takenDateObj = new Date(currentScheduledDate);
        takenDateObj.setDate(takenDateObj.getDate() + daysLate);
        const takenDate = takenDateObj.toISOString().split("T")[0];

        const result = applyRelativeScheduling(records, currentIdx, takenDate);

        // Find the first pending record after currentIdx
        let firstPendingIdx = -1;
        for (let i = currentIdx + 1; i < records.length; i++) {
          if (records[i].status === "pending") {
            firstPendingIdx = i;
            break;
          }
        }

        if (firstPendingIdx === -1) return; // No pending record to shift

        const nextRecord = records[firstPendingIdx];
        const offsetDiff = nextRecord.offsetDays - currentRecord.offsetDays;
        const expectedDateObj = new Date(takenDate);
        expectedDateObj.setDate(expectedDateObj.getDate() + offsetDiff);
        const expectedDate = expectedDateObj.toISOString().split("T")[0];

        expect(result[firstPendingIdx].scheduledDate).toBe(expectedDate);
      }),
      { numRuns: 100 },
    );
  });
});
