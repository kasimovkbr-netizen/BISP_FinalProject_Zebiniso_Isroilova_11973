"use strict";

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

async function sendMessage(chatId, text) {
  const token = getBotToken();
  if (!token) throw new Error("Telegram bot token is not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: String(chatId),
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        `Telegram API ${res.status}: ${data.description || "error"}`,
      );
    }
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendMessage, getBotToken };
