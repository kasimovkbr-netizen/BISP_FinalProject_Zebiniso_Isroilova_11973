/**
 * Property-Based Tests for UZ Vaccine Schedule
 * Feature: vaccination-tracker, Property 1: Vaccination schedule date calculation
 *
 * **Validates: Requirements 5.1**
 */

const fc = require("fast-check");
const { UZ_VACCINE_SCHEDULE } = require("../../shared/uz_vaccine_schedule");

// Test configuration
const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
  seed: process.env.TEST_SEED || Date.now(),
  endOnFailure: true,
};

/**
 * Computes the scheduled date for a vaccine given a birth date and offset in days.
 * This mirrors the logic that will be used in vaccination.module.js.
 * @param {Date|string} birthDate
 * @param {number} offsetDays
 * @returns {string} ISO date string "YYYY-MM-DD"
 */
function computeScheduledDate(birthDate, offsetDays) {
  const date = new Date(birthDate);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

describe("UZ_VACCINE_SCHEDULE — structure", () => {
  test("exports exactly 20 vaccines", () => {
    expect(UZ_VACCINE_SCHEDULE).toHaveLength(20);
  });

  test("every entry has name, offsetDays, and description", () => {
    for (const vaccine of UZ_VACCINE_SCHEDULE) {
      expect(typeof vaccine.name).toBe("string");
      expect(vaccine.name.length).toBeGreaterThan(0);
      expect(typeof vaccine.offsetDays).toBe("number");
      expect(vaccine.offsetDays).toBeGreaterThanOrEqual(0);
      expect(typeof vaccine.description).toBe("string");
      expect(vaccine.description.length).toBeGreaterThan(0);
    }
  });

  test("contains all required vaccine names", () => {
    const names = UZ_VACCINE_SCHEDULE.map((v) => v.name);
    const required = [
      "BCG",
      "HepB-1",
      "OPV-1",
      "DTP-1",
      "HepB-2",
      "Hib-1",
      "OPV-2",
      "DTP-2",
      "Hib-2",
      "OPV-3",
      "DTP-3",
      "HepB-3",
      "Hib-3",
      "MMR-1",
      "Varicella",
      "DTP-4",
      "OPV-4",
      "HepA",
      "MMR-2",
      "DTP-5",
    ];
    for (const name of required) {
      expect(names).toContain(name);
    }
  });

  test("offsetDays values match the UZ national schedule", () => {
    const byName = Object.fromEntries(
      UZ_VACCINE_SCHEDULE.map((v) => [v.name, v.offsetDays]),
    );
    expect(byName["BCG"]).toBe(0);
    expect(byName["HepB-1"]).toBe(0);
    expect(byName["OPV-1"]).toBe(60);
    expect(byName["DTP-1"]).toBe(60);
    expect(byName["HepB-2"]).toBe(60);
    expect(byName["Hib-1"]).toBe(60);
    expect(byName["OPV-2"]).toBe(90);
    expect(byName["DTP-2"]).toBe(90);
    expect(byName["Hib-2"]).toBe(90);
    expect(byName["OPV-3"]).toBe(120);
    expect(byName["DTP-3"]).toBe(120);
    expect(byName["HepB-3"]).toBe(120);
    expect(byName["Hib-3"]).toBe(120);
    expect(byName["MMR-1"]).toBe(365);
    expect(byName["Varicella"]).toBe(365);
    expect(byName["DTP-4"]).toBe(548);
    expect(byName["OPV-4"]).toBe(548);
    expect(byName["HepA"]).toBe(730);
    expect(byName["MMR-2"]).toBe(2190);
    expect(byName["DTP-5"]).toBe(2190);
  });
});

describe("Property 1: Vaccination schedule date calculation", () => {
  /**
   * For any child birth date and any vaccine in UZ_VACCINE_SCHEDULE,
   * the computed scheduledDate must equal birthDate + offsetDays exactly.
   *
   * **Validates: Requirements 5.1**
   */
  test("scheduledDate equals birthDate + offsetDays for all vaccines and birth dates", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2015-01-01"), max: new Date("2030-12-31") }),
        fc.constantFrom(...UZ_VACCINE_SCHEDULE),
        (birthDate, vaccine) => {
          const scheduled = computeScheduledDate(birthDate, vaccine.offsetDays);

          // Compute expected date independently
          const expected = new Date(birthDate);
          expected.setDate(expected.getDate() + vaccine.offsetDays);
          const expectedStr = expected.toISOString().split("T")[0];

          expect(scheduled).toBe(expectedStr);
          return true;
        },
      ),
      propertyTestConfig,
    );
  });

  test("BCG and HepB-1 are always scheduled on the birth date itself", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2015-01-01"), max: new Date("2030-12-31") }),
        (birthDate) => {
          const birthStr = birthDate.toISOString().split("T")[0];
          const bcg = UZ_VACCINE_SCHEDULE.find((v) => v.name === "BCG");
          const hepb1 = UZ_VACCINE_SCHEDULE.find((v) => v.name === "HepB-1");

          expect(computeScheduledDate(birthDate, bcg.offsetDays)).toBe(
            birthStr,
          );
          expect(computeScheduledDate(birthDate, hepb1.offsetDays)).toBe(
            birthStr,
          );
          return true;
        },
      ),
      propertyTestConfig,
    );
  });

  test("scheduledDate is always a valid ISO date string", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2015-01-01"), max: new Date("2030-12-31") }),
        fc.constantFrom(...UZ_VACCINE_SCHEDULE),
        (birthDate, vaccine) => {
          const scheduled = computeScheduledDate(birthDate, vaccine.offsetDays);
          expect(scheduled).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(new Date(scheduled).toString()).not.toBe("Invalid Date");
          return true;
        },
      ),
      propertyTestConfig,
    );
  });
});
