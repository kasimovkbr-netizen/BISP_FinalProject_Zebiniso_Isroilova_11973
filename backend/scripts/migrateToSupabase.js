// migrateToSupabase.js
// Requirements: 8.1–8.11
// Migrates all Firestore collections to Supabase PostgreSQL.
// Run: node backend/scripts/migrateToSupabase.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const admin = require("firebase-admin");
const { supabase } = require("../config/supabase");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    try {
      serviceAccount = require("../config/serviceAccount.json");
    } catch {
      // serviceAccount.json not present — will fail at runtime if needed
      serviceAccount = null;
    }
  }
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

const db = admin.firestore();

/* ======================
   FIELD MAPS (camelCase → snake_case)
====================== */

const COMMON_MAP = {
  createdAt: "created_at",
  updatedAt: "updated_at",
};

const FIELD_MAPS = {
  users: {
    displayName: "display_name",
    telegramChatId: "telegram_chat_id",
    ...COMMON_MAP,
  },
  children: {
    parentId: "parent_id",
    ageUnit: "age_unit",
    birthDate: "birth_date",
    ...COMMON_MAP,
  },
  medicine_list: {
    parentId: "parent_id",
    childId: "child_id",
    timesPerDay: "times_per_day",
    ...COMMON_MAP,
  },
  medicine_logs: {
    parentId: "parent_id",
    childId: "child_id",
    medicineId: "medicine_id",
    timeSlot: "time_slot",
    ...COMMON_MAP,
  },
  vaccination_records: {
    parentId: "parent_id",
    childId: "child_id",
    vaccineName: "vaccine_name",
    scheduledDate: "scheduled_date",
    takenDate: "taken_date",
    ...COMMON_MAP,
  },
  knowledge_base: {
    ...COMMON_MAP,
  },
  saved_articles: {
    userId: "user_id",
    articleId: "article_id",
    ...COMMON_MAP,
  },
  medical_analyses: {
    parentId: "parent_id",
    childId: "child_id",
    ...COMMON_MAP,
  },
};

// Firestore collection → Supabase table mapping
const COLLECTION_TABLE_MAP = {
  users: "users",
  children: "children",
  medicines: "medicine_list",
  medicineLogs: "medicine_logs",
  vaccination_records: "vaccination_records",
  knowledge_base: "knowledge_base",
  saved_articles: "saved_articles",
  analyses: "medical_analyses",
};

/* ======================
   TRANSFORM HELPERS
====================== */

/**
 * Transforms a Firestore document's fields using a field map.
 * camelCase keys → snake_case keys. Values are preserved unchanged.
 * @param {object} doc - Firestore document data
 * @param {object} fieldMap - { camelCaseKey: 'snake_case_key' }
 * @returns {object}
 */
function transformFields(doc, fieldMap) {
  const result = {};
  for (const [key, value] of Object.entries(doc)) {
    const mappedKey = fieldMap[key] || key;
    // Convert Firestore Timestamps to ISO strings
    if (value && typeof value.toDate === "function") {
      result[mappedKey] = value.toDate().toISOString();
    } else {
      result[mappedKey] = value;
    }
  }
  return result;
}

/* ======================
   MIGRATE COLLECTION
====================== */

/**
 * Migrates a single Firestore collection to a Supabase table.
 * @param {string} collectionName - Firestore collection name
 * @param {string} tableName - Supabase table name
 * @param {object} fieldMap - field name mapping
 * @returns {Promise<{ migrated: number, skipped: number, failed: number }>}
 */
async function migrateCollection(collectionName, tableName, fieldMap) {
  const stats = { migrated: 0, skipped: 0, failed: 0 };

  console.log(`\n📦 Migrating ${collectionName} → ${tableName}...`);

  let snapshot;
  try {
    snapshot = await db.collection(collectionName).get();
  } catch (err) {
    console.error(
      `  ❌ Failed to read collection ${collectionName}:`,
      err.message,
    );
    return stats;
  }

  if (snapshot.empty) {
    console.log(`  ℹ️  Collection ${collectionName} is empty, skipping.`);
    return stats;
  }

  for (const docSnap of snapshot.docs) {
    const firestoreId = docSnap.id;

    try {
      // Check for existing record by firestore_id (idempotency)
      const { data: existing } = await supabase
        .from(tableName)
        .select("id")
        .eq("firestore_id", firestoreId)
        .single();

      if (existing) {
        stats.skipped++;
        continue;
      }

      const rawData = docSnap.data();
      const transformed = transformFields(rawData, fieldMap);
      transformed.firestore_id = firestoreId;

      const { error } = await supabase.from(tableName).insert(transformed);

      if (error) {
        console.error(`  ⚠️  Failed to insert ${firestoreId}:`, error.message);
        stats.failed++;
      } else {
        stats.migrated++;
      }
    } catch (err) {
      console.error(`  ⚠️  Error processing ${firestoreId}:`, err.message);
      stats.failed++;
    }
  }

  console.log(
    `  ✅ ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`,
  );
  return stats;
}

/* ======================
   MAIN
====================== */

async function main() {
  console.log("🚀 Starting Firestore → Supabase migration...\n");

  const summary = {};

  for (const [collection, table] of Object.entries(COLLECTION_TABLE_MAP)) {
    const fieldMap = FIELD_MAPS[table] || FIELD_MAPS[collection] || {};
    summary[table] = await migrateCollection(collection, table, fieldMap);
  }

  console.log("\n📊 Migration Summary:");
  console.log("─".repeat(50));
  let totalMigrated = 0,
    totalSkipped = 0,
    totalFailed = 0;

  for (const [table, stats] of Object.entries(summary)) {
    console.log(
      `  ${table}: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`,
    );
    totalMigrated += stats.migrated;
    totalSkipped += stats.skipped;
    totalFailed += stats.failed;
  }

  console.log("─".repeat(50));
  console.log(
    `  TOTAL: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalFailed} failed`,
  );
  console.log("\n✅ Migration complete.");

  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal migration error:", err);
    process.exit(1);
  });
}

module.exports = { transformFields, migrateCollection };
