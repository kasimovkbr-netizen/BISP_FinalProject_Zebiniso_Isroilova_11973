/**
 * PediaMom — Scheduled Notification Functions
 *
 * Reminders:
 *  - Medicine & supplement doses  → every 1 hour
 *  - Water intake                 → every 1 hour
 *  - Vaccine schedule             → daily at 08:00 UTC+5 (03:00 UTC)
 *  - Doctor appointments          → daily at 08:00 UTC+5 (03:00 UTC)
 *  - New knowledge-base articles  → every 30 minutes
 *
 * Data source: Supabase PostgreSQL (replaces Firestore)
 */

"use strict";

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { supabase } = require("../config/supabase");
const { sendMessage } = require("../services/TelegramNotifier");

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
 * Fetch user's Telegram chat ID from Supabase users table.
 * Req 9.5: query users table using supabase.from('users').select('telegram_chat_id').eq('id', userId)
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getTelegramChatId(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("telegram_chat_id")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return data.telegram_chat_id || null;
  } catch (err) {
    console.error(`getTelegramChatId(${userId}):`, err.message);
    return null;
  }
}

/**
 * Compute the number of days between two ISO date strings (YYYY-MM-DD).
 * Returns a positive number when dateStr2 > dateStr1, negative otherwise.
 * @param {string} dateStr1 - earlier date (e.g. scheduledDate)
 * @param {string} dateStr2 - later date (e.g. today)
 * @returns {number}
 */
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  d1.setUTCHours(0, 0, 0, 0);
  d2.setUTCHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
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

    // ── Medicine (Req 9.2) ────────────────────────────────────────────────
    try {
      const { data: medicines, error } = await supabase
        .from("medicine_list")
        .select("*");
      if (error) throw error;

      for (const med of medicines || []) {
        if (!getScheduledHours(med.times_per_day || 1).includes(currentHour))
          continue;

        const chatId = await getTelegramChatId(med.parent_id);
        if (!chatId) continue;

        let childName = "your child";
        if (med.child_id) {
          const { data: child } = await supabase
            .from("children")
            .select("name")
            .eq("id", med.child_id)
            .single();
          if (child) childName = child.name || childName;
        }

        await sendMessage(
          chatId,
          `💊 Time to give <b>${childName}</b> their <b>${med.name}</b> (${med.dosage})`,
        ).catch((e) =>
          console.error(`Medicine reminder [${med.id}]:`, e.message),
        );
      }
    } catch (e) {
      console.error("Medicine reminders error:", e);
    }

    // ── Water intake ──────────────────────────────────────────────────────
    try {
      const { data: waterRecords, error } = await supabase
        .from("water_intake")
        .select("*");
      if (error) throw error;

      for (const w of waterRecords || []) {
        if (currentHour < w.start_hour || currentHour > w.end_hour) continue;

        const chatId = await getTelegramChatId(w.user_id);
        if (!chatId) continue;

        const glasses = calculateGlassesPerHour(
          w.daily_liters,
          w.start_hour,
          w.end_hour,
        );
        await sendMessage(
          chatId,
          `💧 Time to drink water! Aim for <b>${glasses}</b> glass${glasses !== 1 ? "es" : ""} this hour to reach your <b>${w.daily_liters}L</b> daily goal`,
        ).catch((e) => console.error(`Water reminder [${w.id}]:`, e.message));
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

    // ── Vaccine reminders (Req 9.3) ───────────────────────────────────────
    try {
      // Deduplication map: parentId + ":" + vaccineName + ":" + todayStr → true
      const notifiedDates = {};

      const { data: pendingRecords, error } = await supabase
        .from("vaccination_records")
        .select("*")
        .in("status", ["pending", "overdue"]);
      if (error) throw error;

      for (const record of pendingRecords || []) {
        const { child_id, parent_id, vaccine_name, scheduled_date } = record;

        // Deduplication check
        const dedupeKey = `${parent_id}:${vaccine_name}:${todayStr}`;
        if (notifiedDates[dedupeKey]) continue;

        // Fetch child name
        let childName = "Farzand";
        if (child_id) {
          const { data: child } = await supabase
            .from("children")
            .select("name")
            .eq("id", child_id)
            .single();
          if (child) childName = child.name || childName;
        }

        // Fetch Telegram chat ID
        const chatId = await getTelegramChatId(parent_id);
        if (!chatId) continue;

        // Compute daysLate
        const daysLate = daysBetween(scheduled_date, todayStr);

        let msg = null;
        if (scheduled_date === todayStr) {
          msg = `💉 Bugun ${childName}ga ${vaccine_name} vaksinasini olish vaqti keldi!`;
        } else if (daysLate > 0) {
          msg = `⚠️ ${childName}ning ${vaccine_name} vaksinasi ${daysLate} kun kechikmoqda. Iltimos, shifokorga murojaat qiling.`;
        }

        if (msg) {
          try {
            await sendMessage(chatId, msg);
            notifiedDates[dedupeKey] = true;
          } catch (e) {
            console.error(
              `Vaccine reminder [${record.id}/${vaccine_name}]:`,
              e.message,
            );
          }
        }
      }
    } catch (e) {
      console.error("Vaccine reminders error:", e);
    }

    // ── Period reminders ──────────────────────────────────────────────────
    try {
      const { data: motherHealthRows } = await supabase
        .from("mother_health")
        .select("user_id, last_period_date, cycle_length");

      for (const row of motherHealthRows || []) {
        if (!row.last_period_date || !row.cycle_length) continue;

        const chatId = await getTelegramChatId(row.user_id);
        if (!chatId) continue;

        const last = new Date(row.last_period_date);
        const cycleLength = row.cycle_length || 28;
        const nextPeriod = new Date(last);
        nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
        const nextStr = nextPeriod.toISOString().split("T")[0];

        const daysUntil = daysBetween(todayStr, nextStr);
        const ovulationDay = new Date(last);
        ovulationDay.setDate(ovulationDay.getDate() + (cycleLength - 14));
        const ovulationStr = ovulationDay.toISOString().split("T")[0];

        let msg = null;
        if (daysUntil === 2) {
          msg = `🔴 Period 2 kundan keyin boshlanishi mumkin (${nextStr})`;
        } else if (daysUntil === 0) {
          msg = `🔴 Bugun hayz boshlanishi kutilmoqda. Tayyorgarlik ko'ring!`;
        } else if (daysUntil < 0 && Math.abs(daysUntil) <= 5) {
          msg = `⚠️ Cycle unusually delayed — ${Math.abs(daysUntil)} kun kechikmoqda`;
        } else if (ovulationStr === todayStr) {
          msg = `💙 Ovulyatsiya window boshlandi. Fertile days: bugun va keyingi 5 kun.`;
        }

        if (msg) {
          await sendMessage(chatId, msg).catch((e) =>
            console.error(`Period reminder [${row.user_id}]:`, e.message),
          );
        }
      }
    } catch (e) {
      console.error("Period reminders error:", e);
    }

    // ── Appointment reminders (Req 9.3) ───────────────────────────────────
    try {
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("*");
      if (error) throw error;

      for (const appt of appointments || []) {
        if (!appt.appointment_date) continue;

        const chatId = await getTelegramChatId(appt.user_id);
        if (!chatId) continue;

        let msg = null;
        if (appt.appointment_date === todayStr) {
          msg = `🏥 Today is your doctor appointment day!`;
        } else if (appt.appointment_date === in2DaysStr) {
          msg = `🏥 Your doctor appointment is in 2 days (${formatDate(in2Days)})`;
        }
        if (msg) {
          await sendMessage(chatId, msg).catch((e) =>
            console.error(`Appointment reminder [${appt.id}]:`, e.message),
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
      // Fetch unnotified articles (Req 9.4)
      const { data: unnotified, error: unnotifiedError } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("notified", false);
      if (unnotifiedError) throw unnotifiedError;

      // Also include docs missing the notified field (null)
      const { data: nullNotified, error: nullError } = await supabase
        .from("knowledge_base")
        .select("*")
        .is("notified", null);
      if (nullError) throw nullError;

      const toProcess = [...(unnotified || []), ...(nullNotified || [])];
      if (toProcess.length === 0) return;

      // Deduplicate by id
      const unique = [...new Map(toProcess.map((a) => [a.id, a])).values()];

      // Fetch all users with a Telegram chat ID (Req 9.5)
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("telegram_chat_id")
        .not("telegram_chat_id", "is", null)
        .neq("telegram_chat_id", "");
      if (usersError) throw usersError;

      const chatIds = (users || [])
        .map((u) => u.telegram_chat_id)
        .filter(Boolean);

      if (chatIds.length === 0) return;

      for (const article of unique) {
        for (const chatId of chatIds) {
          await sendMessage(
            chatId,
            `📚 New article: <b>${article.title}</b> in <i>${article.category}</i>`,
          ).catch((e) =>
            console.error(
              `Article notify [${article.id}] → ${chatId}:`,
              e.message,
            ),
          );
        }

        await supabase
          .from("knowledge_base")
          .update({ notified: true })
          .eq("id", article.id)
          .then(({ error }) => {
            if (error)
              console.error(`Mark notified [${article.id}]:`, error.message);
          });
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
  daysBetween,
  VACCINE_SCHEDULE,
});
