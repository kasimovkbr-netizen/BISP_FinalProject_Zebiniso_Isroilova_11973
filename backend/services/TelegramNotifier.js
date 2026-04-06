/**
 * TelegramNotifier — sends messages via Telegram Bot API.
 *
 * Token resolution priority:
 *  1. process.env.TELEGRAM_BOT_TOKEN  (Firebase Secret Manager / local .env)
 *  2. firebase-functions v1 config()  (legacy fallback)
 *
 * Set secret for production:
 *   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
 *
 * Set for local emulator:
 *   export TELEGRAM_BOT_TOKEN="your_token"   # or use .env
 */

"use strict";

const https = require("https");

// ─── Token Resolution ─────────────────────────────────────────────────────────

/**
 * Resolves the Telegram bot token.
 * Prefers process.env (works with both Secret Manager and local .env).
 * Falls back to firebase-functions v1 config for legacy deployments.
 * @returns {string}
 */
function getBotToken() {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    return process.env.TELEGRAM_BOT_TOKEN;
  }
  // Legacy v1 config fallback
  try {
    const token = require("firebase-functions").config().telegram?.bot_token;
    if (token) return token;
  } catch (_) {
    /* not in Functions v1 context */
  }
  return "";
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Send a Telegram message to a chat.
 * @param {string|number} chatId  - Telegram chat ID
 * @param {string}        text    - Message text (HTML parse mode)
 * @returns {Promise<void>}
 * @throws {Error} on missing token, non-2xx response, or network failure
 */
async function sendMessage(chatId, text) {
  const token = getBotToken();
  if (!token) throw new Error("Telegram bot token is not configured");

  const body = JSON.stringify({
    chat_id: String(chatId),
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${token}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Telegram API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = { sendMessage, getBotToken };
