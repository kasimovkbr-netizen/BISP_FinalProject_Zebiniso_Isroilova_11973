/**
 * Stripe Webhook Handler
 *
 * Events handled:
 *   checkout.session.completed  → credit pack purchase OR subscription start
 *   invoice.payment_succeeded   → monthly subscription renewal (add credits)
 *   customer.subscription.deleted → subscription cancelled
 */

"use strict";

const express = require("express");
const router = express.Router();
const { stripe, verifyWebhookSignature } = require("../config/stripe");
const { supabase } = require("../config/supabase");

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function addCredits(userId, amount) {
  const { data: user } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();
  const current = user?.credits || 0;
  await supabase
    .from("users")
    .update({ credits: current + amount })
    .eq("id", userId);
  console.log(
    `[webhook] +${amount} credits → user ${userId} (total: ${current + amount})`,
  );
}

// ─── Stripe Webhook ───────────────────────────────────────────────────────────

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    let event;
    try {
      event = verifyWebhookSignature(req.body, signature);
    } catch (err) {
      console.error("[webhook] Signature verification failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    console.log(`[webhook] ${event.type} — ${event.id}`);

    try {
      switch (event.type) {
        // ── One-time credit pack purchase ──────────────────────────────────
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session.payment_status !== "paid") break;

          const { userId, packageId, credits, tierId, creditsPerMonth } =
            session.metadata || {};

          if (packageId && credits) {
            // One-time pack
            await addCredits(userId, parseInt(credits));
          } else if (tierId && creditsPerMonth) {
            // Subscription first payment — add initial credits + save sub ID
            const subscriptionId = session.subscription;
            const sub = subscriptionId
              ? await stripe.subscriptions.retrieve(subscriptionId)
              : null;

            await supabase
              .from("users")
              .update({
                stripe_subscription_id: subscriptionId || null,
                subscription_status: "active",
                subscription_period_end: sub
                  ? new Date(sub.current_period_end * 1000).toISOString()
                  : null,
              })
              .eq("id", userId);

            await addCredits(userId, parseInt(creditsPerMonth));
          }
          break;
        }

        // ── Monthly subscription renewal ───────────────────────────────────
        case "invoice.payment_succeeded": {
          const invoice = event.data.object;
          // Only handle subscription renewals (not the first invoice, handled above)
          if (invoice.billing_reason !== "subscription_cycle") break;

          const customerId = invoice.customer;
          const { data: user } = await supabase
            .from("users")
            .select("id, stripe_subscription_id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (!user) break;

          // Add 500 credits for monthly renewal
          await addCredits(user.id, 500);

          // Update period end
          if (invoice.subscription) {
            const sub = await stripe.subscriptions.retrieve(
              invoice.subscription,
            );
            await supabase
              .from("users")
              .update({
                subscription_period_end: new Date(
                  sub.current_period_end * 1000,
                ).toISOString(),
                subscription_status: "active",
              })
              .eq("id", user.id);
          }
          break;
        }

        // ── Subscription cancelled ─────────────────────────────────────────
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("stripe_customer_id", sub.customer)
            .single();

          if (user) {
            await supabase
              .from("users")
              .update({
                stripe_subscription_id: null,
                subscription_status: null,
                subscription_period_end: null,
              })
              .eq("id", user.id);
            console.log(`[webhook] Subscription cancelled for user ${user.id}`);
          }
          break;
        }

        default:
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("[webhook] Processing error:", err.message);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  },
);

// Health check
router.get("/health", (req, res) => {
  res.json({ success: true, timestamp: new Date().toISOString() });
});

module.exports = router;
