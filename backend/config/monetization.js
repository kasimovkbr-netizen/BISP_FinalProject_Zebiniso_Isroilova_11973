/**
 * AI Monetization System Configuration
 *
 * Central configuration for pricing, limits, and system settings
 */

/**
 * Credit System Configuration
 */
const CREDIT_CONFIG = {
  // One-time credit packages
  defaultPackages: [
    {
      id: "pack_100",
      name: "Starter Pack",
      credits: 100,
      price: 399, // $3.99 in cents
      bonusCredits: 0,
      popular: false,
      stripePriceId: process.env.STRIPE_PRICE_PACK_100 || null,
    },
    {
      id: "pack_300",
      name: "Value Pack",
      credits: 300,
      price: 899, // $8.99 in cents
      bonusCredits: 0,
      popular: true,
      stripePriceId: process.env.STRIPE_PRICE_PACK_300 || null,
    },
    {
      id: "pack_800",
      name: "Pro Pack",
      credits: 800,
      price: 1999, // $19.99 in cents
      bonusCredits: 0,
      popular: false,
      stripePriceId: process.env.STRIPE_PRICE_PACK_800 || null,
    },
  ],

  // Analysis type costs (in credits)
  analysisCosts: {
    blood: 5,
    urine: 3,
    vitamin: 4,
    growth: 2,
    nutrition: 3,
    default: 5,
  },
};

/**
 * Subscription Tier Configuration
 */
const SUBSCRIPTION_CONFIG = {
  defaultTiers: [
    {
      id: "monthly_500",
      name: "Monthly Plan",
      monthlyPrice: 1499, // $14.99 in cents
      creditsPerMonth: 500,
      features: [
        "500 credits per month",
        "Credits renew monthly",
        "All analysis types",
        "Priority support",
      ],
      popular: true,
      stripePriceId: process.env.STRIPE_PRICE_SUBSCRIPTION || null,
    },
  ],
};

/**
 * Freemium Configuration
 */
const FREEMIUM_CONFIG = {
  // Free tier: 10 credits per month
  monthlyCredits: parseInt(process.env.FREE_MONTHLY_CREDITS) || 10,
  monthlyAnalysisLimit: parseInt(process.env.FREE_ANALYSIS_LIMIT) || 10,

  // Reset schedule (monthly on the 1st)
  resetDay: 1,

  // Upgrade prompts
  upgradePrompts: {
    threshold: 0.8, // Show upgrade prompt when 80% of limit is reached
    cooldown: 24 * 60 * 60 * 1000, // 24 hours between prompts
  },
};

/**
 * Payment Configuration
 */
const PAYMENT_CONFIG = {
  // Supported currencies
  supportedCurrencies: ["usd", "eur", "gbp"],

  // Default currency
  defaultCurrency: process.env.DEFAULT_CURRENCY || "usd",

  // Payment processing
  paymentTimeout: 30000, // 30 seconds

  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000, // 1 second

  // Minimum amounts (in cents)
  minimumAmounts: {
    usd: 50, // $0.50
    eur: 50, // €0.50
    gbp: 50, // £0.50
  },
};

/**
 * Usage Tracking Configuration
 */
const USAGE_CONFIG = {
  // Analytics retention
  retentionPeriod: 365, // days

  // Batch processing
  batchSize: 100,

  // Notification thresholds
  warningThresholds: {
    credits: 10, // Warn when credits fall below 10
    subscription: 0.9, // Warn when 90% of subscription limit is reached
  },

  // Report generation
  reportFormats: ["json", "csv"],
  maxReportPeriod: 365, // days
};

/**
 * Security Configuration
 */
const SECURITY_CONFIG = {
  // Rate limiting
  rateLimits: {
    payment: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 payment attempts per window
    },
    analysis: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 analysis requests per minute
    },
  },

  // Audit logging
  auditEvents: [
    "payment_created",
    "payment_succeeded",
    "payment_failed",
    "subscription_created",
    "subscription_cancelled",
    "credits_purchased",
    "credits_deducted",
    "analysis_executed",
  ],
};

/**
 * OpenAI Integration Configuration
 */
const OPENAI_CONFIG = {
  // Cost tracking
  tokenCostPerThousand: {
    "gpt-3.5-turbo": 0.002, // $0.002 per 1K tokens
    "gpt-4": 0.03, // $0.03 per 1K tokens
    "gpt-4-turbo": 0.01, // $0.01 per 1K tokens
  },

  // Model selection for cost optimization
  defaultModel: "gpt-3.5-turbo",

  // Caching configuration
  cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 1000, // Maximum cached results
};

module.exports = {
  CREDIT_CONFIG,
  SUBSCRIPTION_CONFIG,
  FREEMIUM_CONFIG,
  PAYMENT_CONFIG,
  USAGE_CONFIG,
  SECURITY_CONFIG,
  OPENAI_CONFIG,
};
