/**
 * Property-Based Tests for Vaccination Scheduler
 * Feature: vaccination-tracker
 * Property 11: Scheduler notification deduplication
 * Property 12: Scheduler error isolation
 *
 * **Validates: Requirements 8.6, 8.7**
 */

// Feature: vaccination-tracker, Property 11: Scheduler notification deduplication
// Feature: vaccination-tracker, Property 12: Scheduler error isolation

const fc = require("fast-check");

// ─── Pure scheduler helpers (mirrors notifications.js logic) ─────────────────

/**
 * Builds a deduplication key for a notification.
 */
function dedupeKey(parentId, vaccineName, todayStr) {
  return `${parentId}:${vaccineName}:${todayStr}`;
}

/**
 * Runs the notification loop over records, skipping duplicates.
 * Returns the list of sent notifications and any errors encountered.
 *
 * @param {Array} records
 * @param {string} todayStr
 * @param {Function} sendFn - async (chatId, msg) => void, may throw
 * @param {Function} getChatId - (parentId) => string|null
 * @returns {{ sent: string[], errors: string[] }}
 */
async function runScheduler(records, todayStr, sendFn, getChatId) {
  const notifiedDates = {};
  const sent = [];
  const errors = [];

  for (const record of records) {
    const { child_id, parent_id, vaccine_name, scheduled_date } = record;
    const key = dedupeKey(parent_id, vaccine_name, todayStr);
    if (notifiedDates[key]) continue;

    const chatId = getChatId(parent_id);
    if (!chatId) continue;

    const daysLate = Math.round(
      (new Date(todayStr) - new Date(scheduled_date)) / 86400000,
    );

    let msg = null;
    if (scheduled_date === todayStr) {
      msg = `💉 Bugun ${child_id}ga ${vaccine_name} vaksinasini olish vaqti keldi!`;
    } else if (daysLate > 0) {
      msg = `⚠️ ${child_id}ning ${vaccine_name} vaksinasi ${daysLate} kun kechikmoqda.`;
    }

    if (msg) {
      try {
        await sendFn(chatId, msg);
        notifiedDates[key] = true;
        sent.push(key);
      } catch (e) {
        errors.push(`${key}: ${e.message}`);
      }
    }
  }

  return { sent, errors };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const isoDateString = fc.integer({ min: 0, max: 10 * 365 }).map((offset) => {
  const d = new Date(new Date("2020-01-01").getTime() + offset * 86400000);
  return d.toISOString().split("T")[0];
});

const nonEmptyString = fc.string({ minLength: 1, maxLength: 20 });

const vaccinationRecord = fc.record({
  child_id: nonEmptyString,
  parent_id: nonEmptyString,
  vaccine_name: nonEmptyString,
  scheduled_date: isoDateString,
  status: fc.constantFrom("pending", "overdue"),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Property 11: Scheduler notification deduplication", () => {
  /**
   * Duplicate records (same parentId + vaccineName) must only produce one notification.
   *
   * **Validates: Requirements 8.7**
   */
  test("duplicate records produce only one notification per parent+vaccine+day", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyString,
        nonEmptyString,
        isoDateString,
        async (parentId, vaccineName, todayStr) => {
          // Two identical records
          const records = [
            {
              child_id: "child1",
              parent_id: parentId,
              vaccine_name: vaccineName,
              scheduled_date: todayStr,
              status: "pending",
            },
            {
              child_id: "child1",
              parent_id: parentId,
              vaccine_name: vaccineName,
              scheduled_date: todayStr,
              status: "pending",
            },
          ];

          const sendFn = jest.fn().mockResolvedValue(undefined);
          const getChatId = () => "123456";

          const { sent } = await runScheduler(
            records,
            todayStr,
            sendFn,
            getChatId,
          );

          // Only one notification should be sent
          expect(sent.length).toBe(1);
          expect(sendFn).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Records with no chatId are silently skipped.
   *
   * **Validates: Requirements 8.5**
   */
  test("records with no chatId are skipped without error", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(vaccinationRecord, { minLength: 1, maxLength: 10 }),
        isoDateString,
        async (records, todayStr) => {
          const sendFn = jest.fn();
          const getChatId = () => null; // no chatId for anyone

          const { sent, errors } = await runScheduler(
            records,
            todayStr,
            sendFn,
            getChatId,
          );

          expect(sent.length).toBe(0);
          expect(errors.length).toBe(0);
          expect(sendFn).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("Property 12: Scheduler error isolation", () => {
  /**
   * If sendMessage throws for one record, the scheduler continues processing others.
   *
   * **Validates: Requirements 8.6**
   */
  test("error in one notification does not stop processing of remaining records", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(vaccinationRecord, { minLength: 3, maxLength: 10 }),
        isoDateString,
        async (records, todayStr) => {
          // Make all records due today with unique parent+vaccine combos
          const uniqueRecords = records.map((r, i) => ({
            ...r,
            parent_id: `parent_${i}`,
            vaccine_name: `vaccine_${i}`,
            scheduled_date: todayStr,
          }));

          let callCount = 0;
          const sendFn = jest.fn().mockImplementation(async () => {
            callCount++;
            // Throw on the first call only
            if (callCount === 1) throw new Error("Telegram API error");
          });
          const getChatId = () => "123456";

          const { sent, errors } = await runScheduler(
            uniqueRecords,
            todayStr,
            sendFn,
            getChatId,
          );

          // First one errored, rest should have been sent
          expect(errors.length).toBe(1);
          expect(sent.length).toBe(uniqueRecords.length - 1);
        },
      ),
      { numRuns: 30 },
    );
  });

  /**
   * Errors are logged (captured) and do not propagate out of the scheduler.
   *
   * **Validates: Requirements 8.6**
   */
  test("scheduler does not throw even when all sends fail", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(vaccinationRecord, { minLength: 1, maxLength: 5 }),
        isoDateString,
        async (records, todayStr) => {
          const uniqueRecords = records.map((r, i) => ({
            ...r,
            parent_id: `parent_${i}`,
            vaccine_name: `vaccine_${i}`,
            scheduled_date: todayStr,
          }));

          const sendFn = jest
            .fn()
            .mockRejectedValue(new Error("Network failure"));
          const getChatId = () => "123456";

          // Should not throw
          await expect(
            runScheduler(uniqueRecords, todayStr, sendFn, getChatId),
          ).resolves.toBeDefined();
        },
      ),
      { numRuns: 30 },
    );
  });
});
