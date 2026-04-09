/**
 * Telegram Bot Routes
 *
 * POST /api/telegram/webhook  — Telegram webhook (bot updates)
 * POST /api/telegram/test     — Test: send message to current user's chat ID
 * GET  /api/telegram/setup    — Setup webhook URL with Telegram
 */

"use strict";

const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");
const bot = require("../services/TelegramBot");
const { getBotToken } = require("../services/TelegramNotifier");
const { supabase } = require("../config/supabase");

// ─── Webhook (no auth — called by Telegram) ───────────────────────────────────

router.post("/telegram/webhook", express.json(), async (req, res) => {
  try {
    await bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("[telegram webhook]", err.message);
    res.sendStatus(200);
  }
});

// ─── Test: send message to current user ──────────────────────────────────────

router.post("/telegram/test", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { data: user } = await supabase
      .from("users")
      .select("telegram_chat_id")
      .eq("id", userId)
      .single();

    const chatId = user?.telegram_chat_id;
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error:
          "Telegram Chat ID not set. Go to Settings → Telegram Notifications.",
      });
    }

    await bot.sendMessage(
      chatId,
      "✅ PediaMom Telegram bildirishnomalari ishlayapti! 🎉",
    );
    res.json({ success: true, message: "Test message sent!" });
  } catch (err) {
    console.error("[telegram test]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Setup webhook with Telegram ─────────────────────────────────────────────

router.get("/telegram/setup", async (req, res) => {
  try {
    const token = getBotToken();
    if (!token)
      return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN not set" });

    const webhookUrl = req.query.url || process.env.WEBHOOK_BASE_URL;
    if (!webhookUrl) {
      return res.status(400).json({
        error:
          "Provide ?url=https://your-domain.com or set WEBHOOK_BASE_URL in .env",
      });
    }

    const fullUrl = `${webhookUrl}/api/telegram/webhook`;
    const apiUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(fullUrl)}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    res.json({
      success: data.ok,
      result: data.description,
      webhookUrl: fullUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
