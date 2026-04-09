// Run Telegram bot polling as a separate process
// Usage: node services/runPoller.js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { startPolling } = require("./TelegramPoller");
startPolling();
console.log("🤖 Telegram poller running standalone");
