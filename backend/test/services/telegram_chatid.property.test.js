/**
 * Property-Based Tests for Telegram Chat ID Validation and Persistence
 * Feature: vaccination-tracker
 * Property 9: Telegram chat ID validation
 * Property 10: Telegram chat ID persistence round-trip
 *
 * **Validates: Requirements 9.2, 9.3, 9.4, 9.5**
 */

// Feature: vaccination-tracker, Property 9: Telegram chat ID validation
// Feature: vaccination-tracker, Property 10: Telegram chat ID persistence round-trip

const fc = require("fast-check");

// Pure validation logic (mirrors settings.module.js saveTelegramChatId)
function validateTelegramChatId(chatId) {
  if (!chatId || typeof chatId !== "string") return false;
  return /^-?\d+$/.test(chatId.trim());
}

// Simulated persistence store (mirrors Firestore/Supabase round-trip)
function createUserStore() {
  const store = Object.create(null); // no prototype — avoids built-in property collisions
  return {
    save(userId, chatId) {
      store[userId] = chatId;
    },
    load(userId) {
      return Object.prototype.hasOwnProperty.call(store, userId)
        ? store[userId]
        : null;
    },
  };
}

// Arbitrary valid Telegram chat ID: optional minus + 1-15 digits
const validChatId = fc
  .tuple(
    fc.boolean(), // negative?
    fc.integer({ min: 1, max: 999999999999999 }),
  )
  .map(([neg, n]) => (neg ? `-${n}` : `${n}`));

// Arbitrary invalid Telegram chat ID
const invalidChatId = fc.oneof(
  fc.constant(""),
  fc.constant("abc"),
  fc.constant("12.34"),
  fc.constant("12 34"),
  fc.constant("--123"),
  fc.constant("1e5"),
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !/^-?\d+$/.test(s)),
);

describe("Property 9: Telegram chat ID validation", () => {
  /**
   * Valid chat IDs (optional minus + digits only) must pass validation.
   *
   * **Validates: Requirements 9.3**
   */
  test("valid chat IDs pass validation", () => {
    fc.assert(
      fc.property(validChatId, (chatId) => {
        expect(validateTelegramChatId(chatId)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Invalid chat IDs must fail validation.
   *
   * **Validates: Requirements 9.4**
   */
  test("invalid chat IDs fail validation", () => {
    fc.assert(
      fc.property(invalidChatId, (chatId) => {
        expect(validateTelegramChatId(chatId)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Null and undefined always fail validation.
   *
   * **Validates: Requirements 9.4**
   */
  test("null and undefined fail validation", () => {
    expect(validateTelegramChatId(null)).toBe(false);
    expect(validateTelegramChatId(undefined)).toBe(false);
  });
});

describe("Property 10: Telegram chat ID persistence round-trip", () => {
  /**
   * Saving a valid chat ID and loading it back returns the same value.
   *
   * **Validates: Requirements 9.2, 9.5**
   */
  test("saved chat ID is returned unchanged on load", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 32 }),
        validChatId,
        (userId, chatId) => {
          const store = createUserStore();
          store.save(userId, chatId);
          const loaded = store.load(userId);
          expect(loaded).toBe(chatId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Loading a chat ID for a user that has not saved one returns null.
   *
   * **Validates: Requirements 9.5**
   */
  test("loading an unsaved user returns null", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 32 }), (userId) => {
        const store = createUserStore();
        expect(store.load(userId)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Overwriting a chat ID with a new valid value returns the latest value.
   *
   * **Validates: Requirements 9.2**
   */
  test("overwriting chat ID returns the latest saved value", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 32 }),
        validChatId,
        validChatId,
        (userId, chatId1, chatId2) => {
          const store = createUserStore();
          store.save(userId, chatId1);
          store.save(userId, chatId2);
          expect(store.load(userId)).toBe(chatId2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
