/**
 * Stripe Configuration for AI Monetization System
 *
 * Initializes and configures Stripe SDK with environment variables
 */

const Stripe = require("stripe");

// Initialize Stripe with secret key and options
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  timeout: 10000,
  maxNetworkRetries: 3,
});

/**
 * Stripe configuration constants
 */
const STRIPE_CONFIG = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  defaultCurrency: process.env.DEFAULT_CURRENCY || "usd",
  apiVersion: "2023-10-16",
  timeout: 10000,
  maxNetworkRetries: 3,
};

/**
 * Configure Stripe client with additional options
 */

/**
 * Validate Stripe configuration on startup
 */
const validateStripeConfig = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  const pubKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!key || key === "sk_test_your_stripe_secret_key_here") {
    console.log("⚠️  Stripe not configured — running in demo mode");
    return;
  }

  if (!key.startsWith("sk_")) {
    throw new Error("Invalid Stripe secret key format");
  }

  if (pubKey && !pubKey.startsWith("pk_")) {
    throw new Error("Invalid Stripe publishable key format");
  }

  console.log("✅ Stripe configuration validated successfully");
};

/**
 * Get Stripe publishable key for frontend
 */
const getPublishableKey = () => {
  return process.env.STRIPE_PUBLISHABLE_KEY;
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (payload, signature) => {
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_CONFIG.webhookSecret,
    );
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

module.exports = {
  stripe,
  STRIPE_CONFIG,
  validateStripeConfig,
  getPublishableKey,
  verifyWebhookSignature,
};
