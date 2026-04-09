/**
 * Property-Based Tests for On-Time Vaccination
 * Feature: vaccination-tracker, Property 8: On-time vaccination does not shift schedule
 *
 * **Validates: Requirements 7.3**
 */

// Feature: vaccination-tracker, Property 8: On-time vaccination does not shift schedule

const fc = require("fast-check");
const { UZ_VACCINE_SCHEDULE } = require("../../shared/uz_vaccine_schedule");

// Inline applyRelativeScheduling (mirrors frontend/js/vaccination_utils.js)
function applyRelativeScheduling(records, currentIdx, takenDate) {
  const currentRecord = records[currentIdx];
  if (takenDate <= currentRecord.scheduledDate) {
    return records.slice();
  }
  const updated = records.slice();
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
      break;
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

// Arbitrary: any valid index into the schedule
const currentIdxArb = fc.integer({ min: 0, max: BASE_RECORDS.length - 1 });

describe("Property 8: On-time vaccination does not shift schedule", () => {
  /**
   * When takenDate == scheduledDate (exactly on time), NO subsequent
   * vaccination record's scheduledDate must change.
   *
   * **Validates: Requirements 7.3**
   */
  test("takenDate == scheduledDate (exactly on time) → no records change", () => {
    fc.assert(
      fc.property(currentIdxArb, (currentIdx) => {
        const records = BASE_RECORDS.slice();
        const takenDate = records[currentIdx].scheduledDate;

        const result = applyRelativeScheduling(records, currentIdx, takenDate);

        for (let i = 0; i < result.length; i++) {
          expect(result[i]).toEqual(records[i]);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * When takenDate < scheduledDate (early), NO subsequent vaccination
   * record's scheduledDate must change.
   *
   * **Validates: Requirements 7.3**
   */
  test("takenDate < scheduledDate (early) → no records change", () => {
    fc.assert(
      fc.property(
        currentIdxArb,
        fc.integer({ min: 1, max: 30 }),
        (currentIdx, daysEarly) => {
          const records = BASE_RECORDS.slice();
          const scheduledDate = records[currentIdx].scheduledDate;

          const takenDateObj = new Date(scheduledDate);
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
   * General: for any takenDate <= scheduledDate, all records remain unchanged.
   *
   * **Validates: Requirements 7.3**
   */
  test("for any takenDate <= scheduledDate, all records unchanged", () => {
    fc.assert(
      fc.property(
        currentIdxArb,
        fc.integer({ min: 0, max: 30 }),
        (currentIdx, daysOffset) => {
          const records = BASE_RECORDS.slice();
          const scheduledDate = records[currentIdx].scheduledDate;

          // takenDate = scheduledDate - daysOffset (0 means on time, >0 means early)
          const takenDateObj = new Date(scheduledDate);
          takenDateObj.setDate(takenDateObj.getDate() - daysOffset);
          const takenDate = takenDateObj.toISOString().split("T")[0];

          // Verify takenDate <= scheduledDate
          expect(takenDate <= scheduledDate).toBe(true);

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
});
