/**
 * Monetization API Routes — Stripe Integration
 *
 * Pricing:
 *   Free:         10 credits/month
 *   Pack 100:     $3.99  (one-time)
 *   Pack 300:     $8.99  (one-time)
 *   Pack 800:     $19.99 (one-time)
 *   Subscription: $14.99/month = 500 credits
 */

"use strict";

const express = require("express");
const router = express.Router();
const {
  CREDIT_CONFIG,
  SUBSCRIPTION_CONFIG,
  FREEMIUM_CONFIG,
} = require("../config/monetization");
const { stripe } = require("../config/stripe");
const { supabase } = require("../config/supabase");

// Auth is handled globally in index.js

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserRow(userId) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

// ─── Status ───────────────────────────────────────────────────────────────────

router.get("/monetization/status", async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await getUserRow(userId);

    const credits = user?.credits || 0;
    const freeLimit = FREEMIUM_CONFIG.monthlyCredits || 10;
    const freeUsed = user?.free_credits_used || 0;
    const subscription = user?.stripe_subscription_id
      ? {
          id: user.stripe_subscription_id,
          status: user.subscription_status,
          tierName: "Monthly Plan",
          creditsPerMonth: 500,
          currentPeriodEnd: user.subscription_period_end,
        }
      : null;

    const plan = subscription
      ? "subscription"
      : credits > 0
        ? "credits"
        : "free";

    res.json({
      success: true,
      data: {
        freeTier: {
          used: freeUsed,
          limit: freeLimit,
          remaining: Math.max(0, freeLimit - freeUsed),
        },
        credits,
        subscription,
        plan,
      },
    });
  } catch (err) {
    console.error("GET /status error:", err);
    res.status(500).json({ success: false, error: "Failed to get status" });
  }
});

// ─── Credit Packages ──────────────────────────────────────────────────────────

router.get("/monetization/credits/packages", (req, res) => {
  res.json({
    success: true,
    data: CREDIT_CONFIG.defaultPackages.map((pkg) => ({
      ...pkg,
      priceFormatted: `$${(pkg.price / 100).toFixed(2)}`,
    })),
  });
});

router.get("/monetization/credits/balance", async (req, res) => {
  const user = await getUserRow(req.user.uid);
  res.json({ success: true, data: { balance: user?.credits || 0 } });
});

// ─── Create Stripe Checkout — One-time credit pack ────────────────────────────

router.post("/monetization/credits/checkout", async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = CREDIT_CONFIG.defaultPackages.find((p) => p.id === packageId);
    if (!pkg)
      return res.status(400).json({ success: false, error: "Invalid package" });

    const userId = req.user.uid;
    const user = await getUserRow(userId);

    // Demo mode: if Stripe not configured, add credits directly
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey === "sk_test_your_stripe_secret_key_here") {
      const currentCredits = user?.credits || 0;
      await supabase
        .from("users")
        .update({ credits: currentCredits + pkg.credits })
        .eq("id", userId);
      return res.json({
        success: true,
        demo: true,
        data: {
          checkoutUrl: null,
          creditsAdded: pkg.credits,
          newBalance: currentCredits + pkg.credits,
          message: `Demo mode: ${pkg.credits} credits added directly`,
        },
      });
    }

    // Ensure Stripe customer exists
    let customerId = user?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pkg.price,
            product_data: {
              name: `${pkg.name} — ${pkg.credits} Credits`,
              description: `PediaMom ${pkg.credits} AI analysis credits`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { userId, packageId, credits: String(pkg.credits) },
      success_url: `${frontendUrl}/auth/dashboard.html?payment=success&credits=${pkg.credits}`,
      cancel_url: `${frontendUrl}/auth/dashboard.html?payment=cancelled`,
    });
    res.json({
      success: true,
      data: { checkoutUrl: session.url, sessionId: session.id },
    });
  } catch (err) {
    console.error("POST /credits/checkout error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy purchase endpoint (demo fallback)
router.post("/monetization/credits/purchase", async (req, res) => {
  res.json({
    success: false,
    error: "Use /credits/checkout for real payments",
  });
});

// ─── Subscription Tiers ───────────────────────────────────────────────────────

router.get("/monetization/subscriptions/tiers", (req, res) => {
  res.json({
    success: true,
    data: SUBSCRIPTION_CONFIG.defaultTiers.map((tier) => ({
      ...tier,
      priceFormatted: `$${(tier.monthlyPrice / 100).toFixed(2)}/mo`,
      analysisLimitLabel: `${tier.creditsPerMonth} credits/mo`,
    })),
  });
});

// ─── Create Stripe Checkout — Subscription ────────────────────────────────────

router.post("/monetization/subscriptions/checkout", async (req, res) => {
  try {
    const { tierId } = req.body;
    const tier = SUBSCRIPTION_CONFIG.defaultTiers.find((t) => t.id === tierId);
    if (!tier)
      return res.status(400).json({ success: false, error: "Invalid tier" });

    const userId = req.user.uid;
    const user = await getUserRow(userId);

    // Demo mode
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey === "sk_test_your_stripe_secret_key_here") {
      await supabase
        .from("users")
        .update({
          credits: (user?.credits || 0) + tier.creditsPerMonth,
          subscription_status: "active",
        })
        .eq("id", userId);
      return res.json({
        success: true,
        demo: true,
        data: {
          checkoutUrl: null,
          message: `Demo mode: ${tier.creditsPerMonth} credits added, subscription activated`,
        },
      });
    }

    // Ensure Stripe customer exists
    let customerId = user?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    let priceId = tier.stripePriceId;
    if (!priceId) {
      const price = await stripe.prices.create({
        currency: "usd",
        unit_amount: tier.monthlyPrice,
        recurring: { interval: "month" },
        product_data: { name: tier.name },
      });
      priceId = price.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId,
        tierId,
        creditsPerMonth: String(tier.creditsPerMonth),
      },
      success_url: `${frontendUrl}/auth/dashboard.html?payment=success&plan=${tierId}`,
      cancel_url: `${frontendUrl}/auth/dashboard.html?payment=cancelled`,
    });

    res.json({
      success: true,
      data: { checkoutUrl: session.url, sessionId: session.id },
    });
  } catch (err) {
    console.error("POST /subscriptions/checkout error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy create endpoint
router.post("/monetization/subscriptions/create", async (req, res) => {
  res.json({
    success: false,
    error: "Use /subscriptions/checkout for real payments",
  });
});

// ─── Cancel Subscription ──────────────────────────────────────────────────────

router.delete("/monetization/subscriptions/cancel", async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await getUserRow(userId);
    const subId = user?.stripe_subscription_id;

    if (!subId)
      return res
        .status(400)
        .json({ success: false, error: "No active subscription" });

    await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    await supabase
      .from("users")
      .update({ subscription_status: "cancelling" })
      .eq("id", userId);

    res.json({
      success: true,
      data: { message: "Subscription will cancel at period end" },
    });
  } catch (err) {
    console.error("DELETE /subscriptions/cancel error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
