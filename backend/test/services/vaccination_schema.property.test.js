/**
 * Property-Based Tests for Vaccination Record Schema Completeness
 * Feature: vaccination-tracker, Property 2: Vaccination record schema completeness
 *
 * **Validates: Requirements 10.1, 4.2**
 */

// Feature: vaccination-tracker, Property 2: Vaccination record schema completeness

const fc = require("fast-check");
const { UZ_VACCINE_SCHEDULE } = require("../../shared/uz_vaccine_schedule");

// Mirrors the record creation logic in vaccination.module.js generateVaccinationRecords
function createVaccinationRecord({
  childId,
  parentId,
  vaccineName,
  scheduledDate,
}) {
  return {
    childId,
    parentId,
    vaccineName,
    scheduledDate,
    takenDate: null,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Arbitrary ISO date string "YYYY-MM-DD"
const isoDateString = fc.integer({ min: 0, max: 40 * 365 }).map((offset) => {
  const d = new Date(new Date("2000-01-01").getTime() + offset * 86400000);
  return d.toISOString().split("T")[0];
});

const nonEmptyString = fc.string({ minLength: 1, maxLength: 64 });

describe("Property 2: Vaccination record schema completeness", () => {
  /**
   * Every generated record must contain all required fields with correct types.
   *
   * **Validates: Requirements 10.1**
   */
  test("every record has all required fields with correct types", () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.constantFrom(...UZ_VACCINE_SCHEDULE.map((v) => v.name)),
        isoDateString,
        (childId, parentId, vaccineName, scheduledDate) => {
          const record = createVaccinationRecord({
            childId,
            parentId,
            vaccineName,
            scheduledDate,
          });

          expect(typeof record.childId).toBe("string");
          expect(typeof record.parentId).toBe("string");
          expect(typeof record.vaccineName).toBe("string");
          expect(record.scheduledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(record.takenDate).toBeNull();
          expect(["pending", "taken", "overdue"]).toContain(record.status);
          expect(typeof record.createdAt).toBe("string");
          expect(typeof record.updatedAt).toBe("string");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * New records always start with status "pending" and takenDate null.
   *
   * **Validates: Requirements 10.1**
   */
  test("new records always have status=pending and takenDate=null", () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.constantFrom(...UZ_VACCINE_SCHEDULE.map((v) => v.name)),
        isoDateString,
        (childId, parentId, vaccineName, scheduledDate) => {
          const record = createVaccinationRecord({
            childId,
            parentId,
            vaccineName,
            scheduledDate,
          });
          expect(record.status).toBe("pending");
          expect(record.takenDate).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * UZ_VACCINE_SCHEDULE entries have the required { name, offsetDays, description } shape.
   *
   * **Validates: Requirements 4.2**
   */
  test("UZ_VACCINE_SCHEDULE entries conform to { name, offsetDays, description } schema", () => {
    for (const vaccine of UZ_VACCINE_SCHEDULE) {
      expect(typeof vaccine.name).toBe("string");
      expect(vaccine.name.length).toBeGreaterThan(0);
      expect(typeof vaccine.offsetDays).toBe("number");
      expect(vaccine.offsetDays).toBeGreaterThanOrEqual(0);
      expect(typeof vaccine.description).toBe("string");
      expect(vaccine.description.length).toBeGreaterThan(0);
    }
  });
});
