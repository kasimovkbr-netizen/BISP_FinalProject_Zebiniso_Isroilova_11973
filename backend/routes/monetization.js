/**
 * Monetization API Routes
 * Credits, Subscriptions, Freemium status
 */

"use strict";

const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  CREDIT_CONFIG,
  SUBSCRIPTION_CONFIG,
  FREEMIUM_CONFIG,
} = require("../config/monetization");
const { db } = require("../config/firebase");
const admin = require("firebase-admin");

// All routes require auth
router.use(verifyToken);

// ─── Freemium Status ──────────────────────────────────────────────────────────

/**
 * GET /api/monetization/status
 * Returns user's current plan, credits, free usage
 */
router.get("/status", async (req, res) => {
  try {
    const userId = req.user.uid;

    // Free usage this month
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const freeRef = db.collection("free_usage").doc(`${userId}_${monthKey}`);
    const freeSnap = await freeRef.get();
    const usedFree = freeSnap.exists ? freeSnap.data().count || 0 : 0;
    const freeLimit = FREEMIUM_CONFIG.monthlyAnalysisLimit;

    // Credit balance
    const profileSnap = await db
      .collection("user_payment_profiles")
      .doc(userId)
      .get();
    const credits = profileSnap.exists
      ? profileSnap.data().creditBalance || 0
      : 0;

    // Active subscription
    const subSnap = await db
      .collection("subscriptions")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    const subscription = subSnap.empty
      ? null
      : { id: subSnap.docs[0].id, ...subSnap.docs[0].data() };

    res.json({
      success: true,
      data: {
        freeTier: {
          used: usedFree,
          limit: freeLimit,
          remaining: Math.max(0, freeLimit - usedFree),
          resetDate: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1,
          ).toISOString(),
        },
        credits,
        subscription,
        plan: subscription ? "subscription" : credits > 0 ? "credits" : "free",
      },
    });
  } catch (err) {
    console.error("GET /status error:", err);
    res.status(500).json({ success: false, error: "Failed to get status" });
  }
});

// ─── Credit Packages ──────────────────────────────────────────────────────────

/**
 * GET /api/monetization/credits/packages
 */
router.get("/credits/packages", (req, res) => {
  res.json({
    success: true,
    data: CREDIT_CONFIG.defaultPackages.map((pkg) => ({
      ...pkg,
      totalCredits: pkg.credits + pkg.bonusCredits,
      priceFormatted: `$${(pkg.price / 100).toFixed(2)}`,
    })),
  });
});

/**
 * GET /api/monetization/credits/balance
 */
router.get("/credits/balance", async (req, res) => {
  try {
    const snap = await db
      .collection("user_payment_profiles")
      .doc(req.user.uid)
      .get();
    const balance = snap.exists ? snap.data().creditBalance || 0 : 0;
    res.json({ success: true, data: { balance } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to get balance" });
  }
});

/**
 * POST /api/monetization/credits/purchase
 * Body: { packageId }
 * Demo mode: directly adds credits (no real Stripe in demo)
 */
router.post("/credits/purchase", async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.uid;

    const pkg = CREDIT_CONFIG.defaultPackages.find((p) => p.id === packageId);
    if (!pkg) {
      return res.status(400).json({ success: false, error: "Invalid package" });
    }

    const totalCredits = pkg.credits + pkg.bonusCredits;
    const profileRef = db.collection("user_payment_profiles").doc(userId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(profileRef);
      const current = snap.exists ? snap.data().creditBalance || 0 : 0;
      tx.set(
        profileRef,
        {
          userId,
          creditBalance: current + totalCredits,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    // Record transaction
    await db.collection("transactions").add({
      userId,
      type: "credit_purchase",
      packageId,
      creditsAdded: totalCredits,
      amount: pkg.price,
      status: "succeeded",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      data: { creditsAdded: totalCredits, package: pkg.name },
    });
  } catch (err) {
    console.error("POST /credits/purchase error:", err);
    res.status(500).json({ success: false, error: "Purchase failed" });
  }
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

/**
 * GET /api/monetization/subscriptions/tiers
 */
router.get("/subscriptions/tiers", (req, res) => {
  res.json({
    success: true,
    data: SUBSCRIPTION_CONFIG.defaultTiers.map((tier) => ({
      ...tier,
      priceFormatted: `$${(tier.monthlyPrice / 100).toFixed(2)}/mo`,
      analysisLimitLabel:
        tier.analysisLimit === -1 ? "Unlimited" : `${tier.analysisLimit}/mo`,
    })),
  });
});

/**
 * POST /api/monetization/subscriptions/create
 * Body: { tierId }
 * Demo mode: directly activates subscription
 */
router.post("/subscriptions/create", async (req, res) => {
  try {
    const { tierId } = req.body;
    const userId = req.user.uid;

    const tier = SUBSCRIPTION_CONFIG.defaultTiers.find((t) => t.id === tierId);
    if (!tier) {
      return res.status(400).json({ success: false, error: "Invalid tier" });
    }

    // Cancel existing active subscriptions
    const existing = await db
      .collection("subscriptions")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get();

    const batch = db.batch();
    existing.docs.forEach((d) => batch.update(d.ref, { status: "cancelled" }));

    // Create new subscription
    const subRef = db.collection("subscriptions").doc();
    const now = new Date();
    const nextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
    );

    batch.set(subRef, {
      userId,
      tierId,
      tierName: tier.name,
      monthlyPrice: tier.monthlyPrice,
      analysisLimit: tier.analysisLimit,
      status: "active",
      currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(nextMonth),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    res.json({
      success: true,
      data: { subscriptionId: subRef.id, tier: tier.name },
    });
  } catch (err) {
    console.error("POST /subscriptions/create error:", err);
    res.status(500).json({ success: false, error: "Subscription failed" });
  }
});

/**
 * DELETE /api/monetization/subscriptions/cancel
 */
router.delete("/subscriptions/cancel", async (req, res) => {
  try {
    const userId = req.user.uid;
    const snap = await db
      .collection("subscriptions")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get();

    if (snap.empty) {
      return res
        .status(404)
        .json({ success: false, error: "No active subscription" });
    }

    const batch = db.batch();
    snap.docs.forEach((d) =>
      batch.update(d.ref, {
        status: "cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await batch.commit();

    res.json({ success: true, data: { message: "Subscription cancelled" } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Cancellation failed" });
  }
});

module.exports = router;
