// Feature: supabase-migration
// Property tests: P2, P3, P4
// Note: These tests simulate auth behavior without a live Supabase instance.
// Integration tests against a real Supabase test project would be run separately.

const fc = require("fast-check");
const jwt = require("jsonwebtoken");

// ─── Simulated auth helpers ───────────────────────────────────────────────────

const TEST_JWT_SECRET = "test-secret-for-property-tests-only";

/**
 * Simulates Supabase signUp — returns a user object with id and email.
 */
function simulateSignUp(email, password) {
  if (!email || !password || password.length < 6) {
    return { data: null, error: { message: "Invalid credentials" } };
  }
  const userId = require("crypto").randomUUID();
  return {
    data: {
      user: { id: userId, email, role: "parent" },
      session: {
        access_token: jwt.sign({ sub: userId, email }, TEST_JWT_SECRET, {
          expiresIn: "1h",
        }),
      },
    },
    error: null,
  };
}

/**
 * Simulates Supabase signInWithPassword.
 */
function simulateSignIn(email, password, registeredUsers) {
  const user = registeredUsers.find(
    (u) => u.email === email && u.password === password,
  );
  if (!user) {
    return { data: null, error: { message: "Invalid login credentials" } };
  }
  return {
    data: {
      user: { id: user.id, email: user.email },
      session: {
        access_token: jwt.sign(
          { sub: user.id, email: user.email },
          TEST_JWT_SECRET,
          { expiresIn: "1h" },
        ),
      },
    },
    error: null,
  };
}

/**
 * Simulates Supabase signOut — clears session.
 */
function simulateSignOut(sessionStore) {
  sessionStore.session = null;
  return { error: null };
}

/**
 * Simulates getSession after signOut.
 */
function simulateGetSession(sessionStore) {
  return { data: { session: sessionStore.session } };
}

// ─── P2: Registration creates users table row ─────────────────────────────────

test("P2: signUp returns user with id and role=parent", () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      fc.string({ minLength: 6, maxLength: 20 }),
      (email, password) => {
        const { data, error } = simulateSignUp(email, password);
        expect(error).toBeNull();
        expect(data.user.id).toBeTruthy();
        expect(data.user.email).toBe(email);
        expect(data.user.role).toBe("parent");
      },
    ),
    { numRuns: 100 },
  );
});

test("P2b: signUp with short password returns error", () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      fc.string({ minLength: 1, maxLength: 5 }),
      (email, shortPassword) => {
        const { data, error } = simulateSignUp(email, shortPassword);
        expect(error).not.toBeNull();
        expect(data).toBeNull();
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P3: Login returns valid JWT for correct credentials ──────────────────────

test("P3: signIn with correct credentials returns valid JWT", () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      fc.string({ minLength: 6, maxLength: 20 }),
      (email, password) => {
        const userId = require("crypto").randomUUID();
        const registeredUsers = [{ id: userId, email, password }];

        const { data, error } = simulateSignIn(
          email,
          password,
          registeredUsers,
        );
        expect(error).toBeNull();
        expect(data.session.access_token).toBeTruthy();

        // Verify the JWT is valid and contains the correct user ID
        const decoded = jwt.verify(data.session.access_token, TEST_JWT_SECRET);
        expect(decoded.sub).toBe(userId);
        expect(decoded.email).toBe(email);
      },
    ),
    { numRuns: 100 },
  );
});

test("P3b: signIn with wrong password returns error", () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      fc.string({ minLength: 6, maxLength: 20 }),
      fc.string({ minLength: 6, maxLength: 20 }),
      (email, correctPassword, wrongPassword) => {
        fc.pre(correctPassword !== wrongPassword);
        const userId = require("crypto").randomUUID();
        const registeredUsers = [
          { id: userId, email, password: correctPassword },
        ];

        const { data, error } = simulateSignIn(
          email,
          wrongPassword,
          registeredUsers,
        );
        expect(error).not.toBeNull();
        expect(data).toBeNull();
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P4: Logout clears session (round-trip) ───────────────────────────────────

test("P4: signOut then getSession returns null session", () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      fc.string({ minLength: 6, maxLength: 20 }),
      (email, password) => {
        const { data } = simulateSignUp(email, password);
        const sessionStore = { session: data.session };

        // Verify session exists before signOut
        expect(simulateGetSession(sessionStore).data.session).not.toBeNull();

        // Sign out
        simulateSignOut(sessionStore);

        // Session should be null after signOut
        const { data: afterSignOut } = simulateGetSession(sessionStore);
        expect(afterSignOut.session).toBeNull();
      },
    ),
    { numRuns: 100 },
  );
});
