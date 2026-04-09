/**
 * Telegram Bot Polling
 *
 * Polls Telegram API for updates every 2 seconds.
 * Works on localhost without needing a public URL.
 * Use this instead of webhook for local development.
 *
 * Commands:
 *   /start   — Welcome + show Chat ID
 *   /chatid  — Show Chat ID
 *   /status  — Show linked account status
 *   /help    — List commands
 */

"use strict";

const { sendMessage, getBotToken } = require("./TelegramNotifier");
const { supabase } = require("../config/supabase");

let offset = 0;
let pollingInterval = null;

// ─── Low-level Telegram API call ─────────────────────────────────────────────

function telegramRequest(method, params = {}) {
  const token = getBotToken();
  if (!token) return Promise.reject(new Error("No bot token"));

  const url = `https://api.telegram.org/bot${token}/${method}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: controller.signal,
  })
    .then((res) => res.json())
    .catch((err) => {
      if (err.name === "AbortError") return { ok: false, result: [] };
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

// ─── Find user by Telegram chat ID ───────────────────────────────────────────

async function findUserByChatId(chatId) {
  try {
    const { data } = await supabase
      .from("users")
      .select("id, display_name")
      .eq("telegram_chat_id", String(chatId))
      .single();
    return data || null;
  } catch {
    return null;
  }
}

// ─── Process incoming update ──────────────────────────────────────────────────

async function processUpdate(update) {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat?.id;
  const text = (message.text || "").trim();
  const firstName = message.from?.first_name || "foydalanuvchi";

  try {
    if (text.startsWith("/start")) {
      const user = await findUserByChatId(chatId);
      if (user) {
        await sendMessage(
          chatId,
          `👋 Salom, <b>${user.display_name || firstName}</b>!\n\n` +
            `✅ Sizning hisobingiz PediaMom ga ulangan.\n\n` +
            `Barcha bildirishnomalar shu yerga keladi:\n` +
            `💊 Dori eslatmalari\n` +
            `💉 Emlash eslatmalari\n` +
            `🏥 Shifokor uchrashuvlari\n` +
            `📚 Yangi maqolalar\n\n` +
            `/help — barcha buyruqlar`,
        );
      } else {
        await sendMessage(
          chatId,
          `👋 Salom, <b>${firstName}</b>!\n\n` +
            `🍼 <b>PediaMom</b> botiga xush kelibsiz!\n\n` +
            `📱 Bildirishnomalar olish uchun:\n` +
            `1. PediaMom ilovasiga kiring\n` +
            `2. <b>Settings → Telegram Notifications</b> ga o'ting\n` +
            `3. Quyidagi Chat ID ni kiriting:\n\n` +
            `<code>${chatId}</code>\n\n` +
            `✅ Tayyor! Dori, emlash va boshqa eslatmalar shu yerga keladi.`,
        );
      }
    } else if (text.startsWith("/chatid")) {
      await sendMessage(
        chatId,
        `🆔 Sizning Chat ID:\n\n<code>${chatId}</code>\n\nBu ID ni PediaMom → Settings → Telegram Notifications ga kiriting.`,
      );
    } else if (text.startsWith("/status")) {
      const user = await findUserByChatId(chatId);
      if (user) {
        await sendMessage(
          chatId,
          `✅ <b>Ulangan hisob:</b> ${user.display_name || "Foydalanuvchi"}\n\n` +
            `Barcha bildirishnomalar yoqilgan.`,
        );
      } else {
        await sendMessage(
          chatId,
          `❌ Bu Chat ID hech qanday PediaMom hisobiga ulanmagan.\n\n` +
            `Ulanish uchun: Settings → Telegram Notifications → <code>${chatId}</code>`,
        );
      }
    } else if (text.startsWith("/help")) {
      await sendMessage(
        chatId,
        `📋 <b>Buyruqlar:</b>\n\n` +
          `/start — Botni ishga tushirish\n` +
          `/chatid — Chat ID ni ko'rish\n` +
          `/status — Hisob holati\n` +
          `/help — Yordam\n\n` +
          `🍼 <b>PediaMom</b> — bolalar sog'ligi uchun yordamchi`,
      );
    } else {
      // Any other message — show chat ID
      await sendMessage(
        chatId,
        `🆔 Sizning Chat ID: <code>${chatId}</code>\n\n` +
          `Bu ID ni PediaMom Settings → Telegram Notifications ga kiriting.\n\n` +
          `/help — barcha buyruqlar`,
      );
    }
  } catch (err) {
    console.error("[TelegramPoller] processUpdate error:", err.message);
  }
}

// ─── Polling loop ─────────────────────────────────────────────────────────────

async function poll() {
  try {
    const result = await telegramRequest("getUpdates", {
      offset,
      timeout: 0, // short polling — non-blocking
      allowed_updates: ["message"],
    });

    if (result.ok && result.result?.length > 0) {
      for (const update of result.result) {
        await processUpdate(update);
        offset = update.update_id + 1;
      }
    }
  } catch (err) {
    if (!err.message?.includes("ECONNRESET")) {
      console.error("[TelegramPoller] poll error:", err.message);
    }
  }
}

function startPolling() {
  if (pollingInterval) return;
  console.log("🤖 Telegram bot polling started");

  // Clear any existing webhook so polling works
  telegramRequest("deleteWebhook").catch(() => {});

  // Poll every 2 seconds
  pollingInterval = setInterval(poll, 2000);
  poll(); // immediate first poll
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("🤖 Telegram bot polling stopped");
  }
}

module.exports = { startPolling, stopPolling };
