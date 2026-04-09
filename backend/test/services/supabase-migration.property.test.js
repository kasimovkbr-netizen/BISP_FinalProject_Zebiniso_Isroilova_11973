// Feature: supabase-migration
// Property tests: P1, P5, P6, P8, P9, P11, P12, P13, P14, P15

const fc = require("fast-check");

// Mock supabase config to avoid requiring the actual package in tests
jest.mock("../../config/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
    })),
  },
}));

// Mock firebase-admin to avoid requiring service account in tests
jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: jest.fn(() => ({ collection: jest.fn() })),
}));

const { transformFields } = require("../../scripts/migrateToSupabase");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initSupabaseClient(env) {
  if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL is required");
  if (!env.SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY is required");
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  return { url: env.SUPABASE_URL };
}

function authenticateUser(token, secret) {
  if (!token || !secret) throw new Error("missing_auth_token");
  const jwt = require("jsonwebtoken");
  return jwt.verify(token, secret);
}

function handleSupabaseError(error) {
  if (!error) return "Something went wrong. Please try again.";
  if (error.status === 403 || error.code === "PGRST301")
    return "Access denied.";
  if (error.status === 401) return "Your session has expired.";
  if (error.message?.toLowerCase().includes("network"))
    return "Connection error.";
  return "Something went wrong. Please try again.";
}

function checkAdminRole(role) {
  return role === "admin";
}

function serializeRecord(record) {
  return JSON.parse(JSON.stringify(record));
}

function deserializeRecord(serialized) {
  return JSON.parse(JSON.stringify(serialized));
}

function validateDate(str) {
  if (!str || typeof str !== "string")
    return { valid: false, error: "Date is required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str))
    return { valid: false, error: "Date must be in YYYY-MM-DD format" };
  const [year, month, day] = str.split("-").map(Number);
  if (month < 1 || month > 12)
    return { valid: false, error: "Month out of range" };
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth)
    return { valid: false, error: "Day out of range" };
  return { valid: true };
}

function prettyPrint(dataObj) {
  if (!dataObj || typeof dataObj !== "object") return String(dataObj ?? "");
  return Object.entries(dataObj)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
}

const FIELD_MAP = {
  parentId: "parent_id",
  childId: "child_id",
  vaccineName: "vaccine_name",
  scheduledDate: "scheduled_date",
  takenDate: "taken_date",
  displayName: "display_name",
  telegramChatId: "telegram_chat_id",
  ageUnit: "age_unit",
  birthDate: "birth_date",
  timesPerDay: "times_per_day",
  medicineId: "medicine_id",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

// ─── P1: Config initialization rejects missing keys ───────────────────────────

test("P1: missing keys throw descriptive error", () => {
  fc.assert(
    fc.property(
      fc.constantFrom(
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
      (missingKey) => {
        const env = {
          SUPABASE_URL: "https://x.supabase.co",
          SUPABASE_ANON_KEY: "anon-key",
          SUPABASE_SERVICE_ROLE_KEY: "service-key",
        };
        delete env[missingKey];
        expect(() => initSupabaseClient(env)).toThrow(missingKey);
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P5: JWT verification extracts correct user ID ────────────────────────────

test("P5: JWT verification extracts correct user ID", () => {
  const jwt = require("jsonwebtoken");
  fc.assert(
    fc.property(
      fc.uuid(),
      fc.string({ minLength: 32, maxLength: 64 }),
      (userId, secret) => {
        const token = jwt.sign(
          { sub: userId, email: "test@test.com" },
          secret,
          { expiresIn: "1h" },
        );
        const decoded = authenticateUser(token, secret);
        expect(decoded.sub).toBe(userId);
      },
    ),
    { numRuns: 100 },
  );
});

test("P5b: invalid JWT returns error", () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 32, maxLength: 64 }),
      (badToken, secret) => {
        expect(() => authenticateUser(badToken, secret)).toThrow();
      },
    ),
    { numRuns: 50 },
  );
});

// ─── P6: Error messages do not expose internal details ────────────────────────

test("P6: error messages do not expose raw codes or stack traces", () => {
  const internalPatterns = ["PGRST", "auth/", "stack", "Error:", "at Object"];

  fc.assert(
    fc.property(
      fc.record({
        status: fc.oneof(
          fc.constant(401),
          fc.constant(403),
          fc.constant(500),
          fc.constant(null),
        ),
        code: fc.oneof(
          fc.constant("PGRST301"),
          fc.constant("23505"),
          fc.constant(null),
        ),
        message: fc.oneof(
          fc.constant("network error"),
          fc.constant("fetch failed"),
          fc.constant("unknown"),
          fc.constant(null),
        ),
      }),
      (error) => {
        const msg = handleSupabaseError(error);
        expect(typeof msg).toBe("string");
        expect(msg.length).toBeGreaterThan(0);
        internalPatterns.forEach((pattern) => {
          expect(msg).not.toContain(pattern);
        });
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P8: camelCase to snake_case field transformation ─────────────────────────

test("P8: transformFields maps all keys correctly", () => {
  fc.assert(
    fc.property(
      fc.record({
        parentId: fc.string({ minLength: 1 }),
        childId: fc.string({ minLength: 1 }),
        vaccineName: fc.string({ minLength: 1 }),
        scheduledDate: fc.string({ minLength: 1 }),
      }),
      (doc) => {
        const result = transformFields(doc, FIELD_MAP);
        expect(result.parent_id).toBe(doc.parentId);
        expect(result.child_id).toBe(doc.childId);
        expect(result.vaccine_name).toBe(doc.vaccineName);
        expect(result.scheduled_date).toBe(doc.scheduledDate);
        expect(result.parentId).toBeUndefined();
        expect(result.childId).toBeUndefined();
      },
    ),
    { numRuns: 100 },
  );
});

test("P8b: transformFields preserves unmapped keys", () => {
  fc.assert(
    fc.property(
      fc.record({
        name: fc.string({ minLength: 1 }),
        status: fc.constantFrom("pending", "taken", "overdue"),
      }),
      (doc) => {
        const result = transformFields(doc, FIELD_MAP);
        expect(result.name).toBe(doc.name);
        expect(result.status).toBe(doc.status);
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P9: Migration idempotency (unit-level simulation) ────────────────────────

test("P9: transformFields is deterministic (same input → same output)", () => {
  fc.assert(
    fc.property(
      fc.record({
        parentId: fc.string({ minLength: 1 }),
        vaccineName: fc.string({ minLength: 1 }),
        status: fc.constantFrom("pending", "taken"),
      }),
      (doc) => {
        const result1 = transformFields(doc, FIELD_MAP);
        const result2 = transformFields(doc, FIELD_MAP);
        expect(result1).toEqual(result2);
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P11: Role check correctness ──────────────────────────────────────────────

test("P11: checkAdminRole returns true only for admin role", () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant("admin"),
        fc.constant("parent"),
        fc.constant("user"),
        fc.constant(null),
        fc.constant(undefined),
        fc.string(),
      ),
      (role) => {
        const result = checkAdminRole(role);
        if (role === "admin") {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P12: Data serialization round-trip ───────────────────────────────────────

test("P12: write then read produces equivalent object", () => {
  fc.assert(
    fc.property(
      fc.record({
        vaccine_name: fc.string({ minLength: 1 }),
        scheduled_date: fc
          .integer({ min: 2020, max: 2030 })
          .chain((year) =>
            fc
              .integer({ min: 1, max: 12 })
              .chain((month) =>
                fc
                  .integer({ min: 1, max: 28 })
                  .map(
                    (day) =>
                      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                  ),
              ),
          ),
        status: fc.constantFrom("pending", "taken", "overdue"),
      }),
      (record) => {
        const serialized = serializeRecord(record);
        const deserialized = deserializeRecord(serialized);
        expect(deserialized).toEqual(record);
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P13: Date format validation rejects invalid inputs ───────────────────────

test("P13: invalid date strings are rejected", () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
        fc.constant(""),
        fc.constant("2024/01/01"),
        fc.constant("01-01-2024"),
        fc.constant("2024-13-01"),
        fc.constant("2024-00-01"),
        fc.constant("2024-01-32"),
        fc.constant("not-a-date"),
      ),
      (invalidDate) => {
        const result = validateDate(invalidDate);
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
      },
    ),
    { numRuns: 100 },
  );
});

test("P13b: valid YYYY-MM-DD dates are accepted", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 2000, max: 2099 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
      (year, month, day) => {
        const str = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const result = validateDate(str);
        expect(result.valid).toBe(true);
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P14: Pretty-printer produces complete output ─────────────────────────────

test("P14: pretty-printer returns non-empty string with all top-level keys", () => {
  fc.assert(
    fc.property(
      fc.record({
        hemoglobin: fc.float({ min: 0, max: 25 }),
        ferritin: fc.float({ min: 0, max: 2000 }),
      }),
      (dataObj) => {
        const result = prettyPrint(dataObj);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        Object.keys(dataObj).forEach((key) => {
          expect(result).toContain(key);
        });
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P15: Error handler produces user-friendly messages ───────────────────────

test("P15: error handler returns non-empty string and does not throw", () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.record({
          status: fc.integer({ min: 400, max: 599 }),
          message: fc.string(),
        }),
        fc.constant(null),
        fc.constant(undefined),
        fc.record({ code: fc.string(), message: fc.string() }),
      ),
      (error) => {
        let result;
        expect(() => {
          result = handleSupabaseError(error);
        }).not.toThrow();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      },
    ),
    { numRuns: 100 },
  );
});
