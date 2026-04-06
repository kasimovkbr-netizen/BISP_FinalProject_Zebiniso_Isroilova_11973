/**
 * PediaMom — Scheduled Notification Functions (Firebase Functions v2)
 *
 * Reminders:
 *  - Medicine & supplement doses  → every 1 hour
 *  - Water intake                 → every 1 hour
 *  - Vaccine schedule             → daily at 08:00 UTC+5 (03:00 UTC)
 *  - Doctor appointments          → daily at 08:00 UTC+5 (03:00 UTC)
 *  - New knowledge-base articles  → every 30 minutes
 *
 * Deploy:
 *   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
 *   firebase deploy --only functions
 */

"use strict";

const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { sendMessage } = require("../services/TelegramNotifier");

// Initialize only once (index.js may already call this)
if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

// Secret injected via Firebase Secret Manager
const SECRETS = ["TELEGRAM_BOT_TOKEN"];

// ─── Timezone constant ────────────────────────────────────────────────────────

const TZ_OFFSET_HOURS = 5; // UTC+5 (Tashkent)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Current hour in Tashkent time (UTC+5).
 * @returns {number} 0–23
 */
function tashkentHour() {
  return (new Date().getUTCHours() + TZ_OFFSET_HOURS) % 24;
}

/**
 * Returns scheduled dose hours for a given timesPerDay.
 * Distributes evenly across the 08:00–20:00 window.
 * @param {number} timesPerDay
 * @returns {number[]}
 */
function getScheduledHours(timesPerDay) {
  switch (timesPerDay) {
    case 1:
      return [8];
    case 2:
      return [8, 20];
    case 3:
      return [8, 13, 20];
    default:
      if (timesPerDay >= 4) {
        const hours = [];
        const step = 12 / (timesPerDay - 1);
        for (let i = 0; i < timesPerDay; i++) {
          hours.push(Math.round(8 + step * i));
        }
        return hours;
      }
      console.warn(`getScheduledHours: unexpected timesPerDay=${timesPerDay}`);
      return [8];
  }
}

/**
 * Glasses of water per hour = floor((liters × 4) / activeHours).
 * @param {number} dailyLiters
 * @param {number} startHour
 * @param {number} endHour
 * @returns {number}
 */
function calculateGlassesPerHour(dailyLiters, startHour, endHour) {
  const activeHours = endHour - startHour;
  if (activeHours <= 0) return 0;
  return Math.floor((dailyLiters * 4) / activeHours);
}

/**
 * Fetch user's Telegram chat ID from Firestore.
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getTelegramChatId(userId) {
  if (!userId) return null;
  try {
    const snap = await db.collection("users").doc(userId).get();
    return snap.exists ? snap.data().telegramChatId || null : null;
  } catch (err) {
    console.error(`getTelegramChatId(${userId}):`, err.message);
    return null;
  }
}

/**
 * Add calendar months to a date.
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Format a Date as "Month Day, Year".
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Vaccine Schedule ─────────────────────────────────────────────────────────

const VACCINE_SCHEDULE = [
  { ageMonths: 0, vaccines: ["BCG", "HepB"] },
  { ageMonths: 2, vaccines: ["DTP", "Hib", "IPV", "HepB", "PCV"] },
  { ageMonths: 3, vaccines: ["DTP", "Hib", "IPV"] },
  { ageMonths: 4, vaccines: ["DTP", "Hib", "IPV", "PCV"] },
  { ageMonths: 6, vaccines: ["DTP", "Hib", "HepB", "OPV"] },
  { ageMonths: 12, vaccines: ["MMR", "Varicella", "PCV"] },
  { ageMonths: 18, vaccines: ["DTP booster", "OPV"] },
  { ageMonths: 72, vaccines: ["DTP", "OPV", "MMR"] },
];

// ─── Hourly Reminders ─────────────────────────────────────────────────────────

exports.hourlyReminders = onSchedule(
  { schedule: "every 1 hours", secrets: SECRETS },
  async () => {
    const currentHour = tashkentHour();

    // ── Medicine ──────────────────────────────────────────────────────────
    try {
      const snap = await db.collection("medicine_list").get();
      for (const doc of snap.docs) {
        const med = doc.data();
        if (!getScheduledHours(med.timesPerDay || 1).includes(currentHour))
          continue;

        const chatId = await getTelegramChatId(med.parentId);
        if (!chatId) continue;

        let childName = "your child";
        try {
          const childSnap = await db
            .collection("children")
            .doc(med.childId)
            .get();
          if (childSnap.exists) childName = childSnap.data().name || childName;
        } catch (_) {}

        await sendMessage(
          chatId,
          `💊 Time to give <b>${childName}</b> their <b>${med.medicineName}</b> (${med.dosage})`,
        ).catch((e) =>
          console.error(`Medicine reminder [${doc.id}]:`, e.message),
        );
      }
    } catch (e) {
      console.error("Medicine reminders error:", e);
    }

    // ── Supplements ───────────────────────────────────────────────────────
    try {
      const snap = await db.collection("supplements_list").get();
      for (const doc of snap.docs) {
        const supp = doc.data();
        if (!getScheduledHours(supp.timesPerDay || 1).includes(currentHour))
          continue;

        const chatId = await getTelegramChatId(supp.userId || supp.parentId);
        if (!chatId) continue;

        await sendMessage(
          chatId,
          `🌿 Time to take your <b>${supp.name || supp.supplementName}</b> (${supp.dosage})`,
        ).catch((e) =>
          console.error(`Supplement reminder [${doc.id}]:`, e.message),
        );
      }
    } catch (e) {
      console.error("Supplement reminders error:", e);
    }

    // ── Water intake ──────────────────────────────────────────────────────
    try {
      const snap = await db.collection("water_intake").get();
      for (const doc of snap.docs) {
        const w = doc.data();
        if (currentHour < w.startHour || currentHour > w.endHour) continue;

        const chatId = await getTelegramChatId(w.userId);
        if (!chatId) continue;

        const glasses = calculateGlassesPerHour(
          w.dailyLiters,
          w.startHour,
          w.endHour,
        );
        await sendMessage(
          chatId,
          `💧 Time to drink water! Aim for <b>${glasses}</b> glass${glasses !== 1 ? "es" : ""} this hour to reach your <b>${w.dailyLiters}L</b> daily goal`,
        ).catch((e) => console.error(`Water reminder [${doc.id}]:`, e.message));
      }
    } catch (e) {
      console.error("Water reminders error:", e);
    }
  },
);

// ─── Daily Reminders ──────────────────────────────────────────────────────────

// Runs at 03:00 UTC = 08:00 Tashkent (UTC+5)
exports.dailyReminders = onSchedule(
  { schedule: "every day 03:00", secrets: SECRETS },
  async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const in2Days = new Date(today);
    in2Days.setDate(in2Days.getDate() + 2);
    const in2DaysStr = in2Days.toISOString().split("T")[0];

    // ── Vaccine reminders ─────────────────────────────────────────────────
    try {
      const snap = await db.collection("children").get();
      for (const doc of snap.docs) {
        const child = doc.data();
        if (!child.birthDate) continue;

        const chatId = await getTelegramChatId(child.parentId);
        if (!chatId) continue;

        const birthDate = new Date(child.birthDate);

        for (const milestone of VACCINE_SCHEDULE) {
          const dueDate = addMonths(birthDate, milestone.ageMonths);
          const dueDateStr = dueDate.toISOString().split("T")[0];

          for (const vaccine of milestone.vaccines) {
            let msg = null;
            if (dueDateStr === todayStr) {
              msg = `💉 <b>${child.name}</b> is due for <b>${vaccine}</b> vaccination today!`;
            } else if (dueDateStr === in2DaysStr) {
              msg = `💉 <b>${child.name}</b>'s <b>${vaccine}</b> vaccination is in 2 days`;
            }
            if (msg) {
              await sendMessage(chatId, msg).catch((e) =>
                console.error(
                  `Vaccine reminder [${doc.id}/${vaccine}]:`,
                  e.message,
                ),
              );
            }
          }
        }
      }
    } catch (e) {
      console.error("Vaccine reminders error:", e);
    }

    // ── Appointment reminders ─────────────────────────────────────────────
    try {
      const snap = await db.collection("appointments").get();
      for (const doc of snap.docs) {
        const appt = doc.data();
        if (!appt.appointmentDate) continue;

        const chatId = await getTelegramChatId(appt.userId);
        if (!chatId) continue;

        let msg = null;
        if (appt.appointmentDate === todayStr) {
          msg = `🏥 Today is your doctor appointment day!`;
        } else if (appt.appointmentDate === in2DaysStr) {
          msg = `🏥 Your doctor appointment is in 2 days (${formatDate(in2Days)})`;
        }
        if (msg) {
          await sendMessage(chatId, msg).catch((e) =>
            console.error(`Appointment reminder [${doc.id}]:`, e.message),
          );
        }
      }
    } catch (e) {
      console.error("Appointment reminders error:", e);
    }
  },
);

// ─── Article Notifications ────────────────────────────────────────────────────

exports.articleNotifications = onSchedule(
  { schedule: "every 30 minutes", secrets: SECRETS },
  async () => {
    try {
      // Fetch only unnotified articles (index: notified ASC)
      const snap = await db
        .collection("knowledge_base")
        .where("notified", "==", false)
        .get();

      // Also include docs missing the notified field entirely
      const allSnap = await db.collection("knowledge_base").get();
      const missingField = allSnap.docs.filter(
        (d) => d.data().notified === undefined,
      );

      const toProcess = [...snap.docs, ...missingField];
      if (toProcess.length === 0) return;

      // Deduplicate by doc ID
      const unique = [...new Map(toProcess.map((d) => [d.id, d])).values()];

      // Fetch all users with a Telegram chat ID
      const usersSnap = await db
        .collection("users")
        .where("telegramChatId", "!=", "")
        .get();

      const chatIds = usersSnap.docs
        .map((d) => d.data().telegramChatId)
        .filter(Boolean);

      if (chatIds.length === 0) return;

      for (const articleDoc of unique) {
        const article = articleDoc.data();

        for (const chatId of chatIds) {
          await sendMessage(
            chatId,
            `📚 New article: <b>${article.title}</b> in <i>${article.category}</i>`,
          ).catch((e) =>
            console.error(
              `Article notify [${articleDoc.id}] → ${chatId}:`,
              e.message,
            ),
          );
        }

        await db
          .collection("knowledge_base")
          .doc(articleDoc.id)
          .update({ notified: true })
          .catch((e) =>
            console.error(`Mark notified [${articleDoc.id}]:`, e.message),
          );
      }
    } catch (e) {
      console.error("Article notifications error:", e);
    }
  },
);

// ─── Exports (helpers exposed for unit testing) ───────────────────────────────

module.exports = Object.assign(module.exports, {
  getScheduledHours,
  calculateGlassesPerHour,
  tashkentHour,
  VACCINE_SCHEDULE,
});
