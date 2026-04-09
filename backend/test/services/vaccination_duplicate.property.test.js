/**
 * Property-Based Tests for Duplicate Prevention (Idempotency)
 * Feature: vaccination-tracker, Property 4: Duplicate prevention (idempotency)
 *
 * **Validates: Requirements 5.4**
 */

// Feature: vaccination-tracker, Property 4: Duplicate prevention (idempotency)

const fc = require("fast-check");
const { UZ_VACCINE_SCHEDULE } = require("../../shared/uz_vaccine_schedule");

// ---------------------------------------------------------------------------
// Pure functions modelling the idempotent record generation logic
// (mirrors generateVaccinationRecords in frontend/js/vaccination.module.js)
// ---------------------------------------------------------------------------

function computeScheduledDate(birthDate, offsetDays) {
  const date = new Date(birthDate);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

/**
 * Simulates the idempotent record generation logic.
 * existingRecords: array of { vaccineName } already in DB
 * vaccines: array of { name, offsetDays }
 * Returns: array of new records to add (only those not already existing)
 */
function getRecordsToCreate(
  existingRecords,
  vaccines,
  childId,
  parentId,
  birthDate,
) {
  const existingNames = new Set(existingRecords.map((r) => r.vaccineName));
  return vaccines
    .filter((v) => !existingNames.has(v.name))
    .map((v) => ({
      childId,
      parentId,
      vaccineName: v.name,
      scheduledDate: computeScheduledDate(birthDate, v.offsetDays),
      status: "pending",
      takenDate: null,
    }));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const childIdArb = fc.string({ minLength: 1, maxLength: 20 });
const parentIdArb = fc.string({ minLength: 1, maxLength: 20 });

// Valid birth dates: 2015-01-01 to 2024-12-31
const birthDateArb = fc
  .integer({
    min: new Date("2015-01-01").getTime(),
    max: new Date("2024-12-31").getTime(),
  })
  .map((ms) => new Date(ms).toISOString().split("T")[0]);

// Arbitrary subset of vaccine names (0..20 items)
const vaccineSubsetArb = fc
  .shuffledSubarray(UZ_VACCINE_SCHEDULE.map((v) => v.name))
  .map((names) => names.map((name) => ({ vaccineName: name })));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 4: Duplicate prevention (idempotency)", () => {
  /**
   * Running generation on an empty DB creates exactly 20 records (one per vaccine).
   *
   * **Validates: Requirements 5.4**
   */
  test("generation on empty DB creates exactly 20 records", () => {
    fc.assert(
      fc.property(
        childIdArb,
        parentIdArb,
        birthDateArb,
        (childId, parentId, birthDate) => {
          const newRecords = getRecordsToCreate(
            [],
            UZ_VACCINE_SCHEDULE,
            childId,
            parentId,
            birthDate,
          );
          expect(newRecords).toHaveLength(UZ_VACCINE_SCHEDULE.length);
          expect(newRecords).toHaveLength(20);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Running generation again on an already-populated DB creates 0 new records (idempotent).
   *
   * **Validates: Requirements 5.4**
   */
  test("generation on fully-populated DB creates 0 new records", () => {
    fc.assert(
      fc.property(
        childIdArb,
        parentIdArb,
        birthDateArb,
        (childId, parentId, birthDate) => {
          // First pass: generate all records
          const firstPass = getRecordsToCreate(
            [],
            UZ_VACCINE_SCHEDULE,
            childId,
            parentId,
            birthDate,
          );
          // Second pass: all vaccines already exist
          const secondPass = getRecordsToCreate(
            firstPass,
            UZ_VACCINE_SCHEDULE,
            childId,
            parentId,
            birthDate,
          );
          expect(secondPass).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Running generation N times always results in exactly 20 unique records total.
   *
   * **Validates: Requirements 5.4**
   */
  test("running generation N times yields exactly 20 unique records total", () => {
    fc.assert(
      fc.property(
        childIdArb,
        parentIdArb,
        birthDateArb,
        fc.integer({ min: 1, max: 10 }),
        (childId, parentId, birthDate, n) => {
          let db = [];
          for (let i = 0; i < n; i++) {
            const toCreate = getRecordsToCreate(
              db,
              UZ_VACCINE_SCHEDULE,
              childId,
              parentId,
              birthDate,
            );
            db = db.concat(toCreate);
          }
          // Unique vaccine names in DB
          const uniqueNames = new Set(db.map((r) => r.vaccineName));
          expect(uniqueNames.size).toBe(20);
          expect(db).toHaveLength(20);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * For any subset of existing records, generation only creates the missing ones.
   *
   * **Validates: Requirements 5.4**
   */
  test("generation only creates records for vaccines not already in DB", () => {
    fc.assert(
      fc.property(
        childIdArb,
        parentIdArb,
        birthDateArb,
        vaccineSubsetArb,
        (childId, parentId, birthDate, existingRecords) => {
          const existingNames = new Set(
            existingRecords.map((r) => r.vaccineName),
          );
          const newRecords = getRecordsToCreate(
            existingRecords,
            UZ_VACCINE_SCHEDULE,
            childId,
            parentId,
            birthDate,
          );

          // No new record should duplicate an existing vaccine name
          for (const record of newRecords) {
            expect(existingNames.has(record.vaccineName)).toBe(false);
          }

          // The count of new records equals the number of missing vaccines
          const missingCount = UZ_VACCINE_SCHEDULE.filter(
            (v) => !existingNames.has(v.name),
          ).length;
          expect(newRecords).toHaveLength(missingCount);

          // Together, existing + new covers all 20 vaccines exactly once
          const allNames = [
            ...existingRecords.map((r) => r.vaccineName),
            ...newRecords.map((r) => r.vaccineName),
          ];
          const allUnique = new Set(allNames);
          expect(allUnique.size).toBe(20);
        },
      ),
      { numRuns: 100 },
    );
  });
});
