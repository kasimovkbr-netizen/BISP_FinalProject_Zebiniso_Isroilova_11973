// Feature: supabase-migration
// Property tests: P16, P17

const fc = require("fast-check");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds the realtime filter string for a given table and user ID.
 * @param {string} ownerColumn - 'parent_id' or 'user_id'
 * @param {string} userId
 * @returns {string}
 */
function buildRealtimeFilter(ownerColumn, userId) {
  return `${ownerColumn}=eq.${userId}`;
}

/**
 * Simulates a Supabase channel with subscribe/removeChannel behavior.
 */
function createMockChannel(channelName) {
  let subscribed = false;
  let callbacks = [];
  let removed = false;

  return {
    channelName,
    on(event, config, callback) {
      callbacks.push(callback);
      return this;
    },
    subscribe() {
      subscribed = true;
      return this;
    },
    isSubscribed: () => subscribed,
    isRemoved: () => removed,
    triggerEvent(payload) {
      if (!removed) callbacks.forEach((cb) => cb(payload));
    },
    remove() {
      removed = true;
      subscribed = false;
      callbacks = [];
    },
  };
}

function createMockSupabase() {
  const channels = new Map();

  return {
    channel(name) {
      const ch = createMockChannel(name);
      channels.set(name, ch);
      return ch;
    },
    removeChannel(channel) {
      channel.remove();
      channels.delete(channel.channelName);
    },
    getChannel(name) {
      return channels.get(name);
    },
  };
}

// ─── P16: Realtime filter string is correctly constructed ─────────────────────

test("P16: realtime filter for parent_id tables is correctly constructed", () => {
  fc.assert(
    fc.property(fc.uuid(), (userId) => {
      const filter = buildRealtimeFilter("parent_id", userId);
      expect(filter).toBe(`parent_id=eq.${userId}`);
      expect(filter).toContain("parent_id=eq.");
      expect(filter).toContain(userId);
    }),
    { numRuns: 100 },
  );
});

test("P16b: realtime filter for user_id tables is correctly constructed", () => {
  fc.assert(
    fc.property(fc.uuid(), (userId) => {
      const filter = buildRealtimeFilter("user_id", userId);
      expect(filter).toBe(`user_id=eq.${userId}`);
      expect(filter).toContain("user_id=eq.");
      expect(filter).toContain(userId);
    }),
    { numRuns: 100 },
  );
});

test("P16c: filter string format matches RLS policy column exactly", () => {
  const tables = [
    { table: "children", column: "parent_id" },
    { table: "medicine_list", column: "parent_id" },
    { table: "vaccination_records", column: "parent_id" },
    { table: "water_intake", column: "user_id" },
    { table: "appointments", column: "user_id" },
    { table: "mother_health", column: "user_id" },
  ];

  fc.assert(
    fc.property(
      fc.uuid(),
      fc.constantFrom(...tables),
      (userId, tableConfig) => {
        const filter = buildRealtimeFilter(tableConfig.column, userId);
        // Filter must start with the correct column name
        expect(filter.startsWith(tableConfig.column + "=eq.")).toBe(true);
        // Filter must end with the userId
        expect(filter.endsWith(userId)).toBe(true);
      },
    ),
    { numRuns: 100 },
  );
});

// ─── P17: Channel cleanup on module destroy ───────────────────────────────────

test("P17: removeChannel stops event callbacks from firing", () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.array(fc.record({ type: fc.string(), payload: fc.string() }), {
        minLength: 1,
        maxLength: 5,
      }),
      (channelName, events) => {
        const mockSupabase = createMockSupabase();
        let callbackCount = 0;

        const channel = mockSupabase
          .channel(channelName)
          .on("postgres_changes", {}, () => {
            callbackCount++;
          })
          .subscribe();

        // Trigger some events before removal
        events.forEach((e) => channel.triggerEvent(e));
        const countBeforeRemoval = callbackCount;

        // Remove channel
        mockSupabase.removeChannel(channel);

        // Trigger events after removal — callbacks should NOT fire
        events.forEach((e) => channel.triggerEvent(e));

        expect(callbackCount).toBe(countBeforeRemoval);
        expect(channel.isRemoved()).toBe(true);
        expect(channel.isSubscribed()).toBe(false);
      },
    ),
    { numRuns: 100 },
  );
});

test("P17b: channel is marked as removed after removeChannel", () => {
  fc.assert(
    fc.property(fc.string({ minLength: 1, maxLength: 20 }), (channelName) => {
      const mockSupabase = createMockSupabase();
      const channel = mockSupabase.channel(channelName).subscribe();

      expect(channel.isSubscribed()).toBe(true);
      expect(channel.isRemoved()).toBe(false);

      mockSupabase.removeChannel(channel);

      expect(channel.isRemoved()).toBe(true);
      expect(channel.isSubscribed()).toBe(false);
    }),
    { numRuns: 100 },
  );
});
