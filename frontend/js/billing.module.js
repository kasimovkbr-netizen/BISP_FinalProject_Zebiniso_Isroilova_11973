/**
 * PediaMom — Billing & Subscription Module
 * Handles credits, subscriptions, and freemium status display
 */

import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { toast } from "./toast.js";

const API_BASE = "http://localhost:5001/api";

let _token = null;

async function getToken() {
  const user = auth.currentUser;
  if (!user) return null;
  _token = await user.getIdToken();
  return _token;
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initBillingModule() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    await loadStatus();
  });
}

// ─── Load Status ──────────────────────────────────────────────────────────────

async function loadStatus() {
  const container = document.getElementById("billingPage");
  if (!container) return;

  container.innerHTML = `<div class="billing-loading">Loading...</div>`;

  try {
    const [statusRes, packagesRes, tiersRes] = await Promise.all([
      apiFetch("/monetization/status"),
      apiFetch("/monetization/credits/packages"),
      apiFetch("/monetization/subscriptions/tiers"),
    ]);

    if (!statusRes.success) throw new Error("Failed to load status");

    renderBilling(
      container,
      statusRes.data,
      packagesRes.data || [],
      tiersRes.data || [],
    );
  } catch (err) {
    console.error("Billing load error:", err);
    container.innerHTML = renderOfflineMode();
    attachOfflineListeners(container);
  }
}

// ─── Offline / Demo Mode ──────────────────────────────────────────────────────

function renderOfflineMode() {
  const packages = [
    {
      id: "basic_50",
      name: "Basic",
      credits: 50,
      bonusCredits: 0,
      price: 500,
      priceFormatted: "$5.00",
      popular: false,
    },
    {
      id: "standard_100",
      name: "Standard",
      credits: 100,
      bonusCredits: 10,
      price: 900,
      priceFormatted: "$9.00",
      popular: true,
    },
    {
      id: "premium_250",
      name: "Premium",
      credits: 250,
      bonusCredits: 50,
      price: 2000,
      priceFormatted: "$20.00",
      popular: false,
    },
    {
      id: "enterprise_500",
      name: "Enterprise",
      credits: 500,
      bonusCredits: 150,
      price: 3500,
      priceFormatted: "$35.00",
      popular: false,
    },
  ];
  const tiers = [
    {
      id: "basic",
      name: "Basic Plan",
      monthlyPrice: 999,
      priceFormatted: "$9.99/mo",
      analysisLimit: 20,
      analysisLimitLabel: "20/mo",
      features: [
        "20 AI analyses/month",
        "Basic health insights",
        "Email support",
      ],
      popular: false,
    },
    {
      id: "professional",
      name: "Professional",
      monthlyPrice: 1999,
      priceFormatted: "$19.99/mo",
      analysisLimit: 50,
      analysisLimitLabel: "50/mo",
      features: [
        "50 AI analyses/month",
        "Advanced insights",
        "Priority support",
        "Export reports",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      monthlyPrice: 4999,
      priceFormatted: "$49.99/mo",
      analysisLimit: -1,
      analysisLimitLabel: "Unlimited",
      features: [
        "Unlimited analyses",
        "Premium insights",
        "Dedicated support",
        "Custom reports",
        "API access",
      ],
      popular: false,
    },
  ];
  const status = {
    freeTier: { used: 0, limit: 5, remaining: 5 },
    credits: 0,
    subscription: null,
    plan: "free",
  };
  return buildBillingHTML(status, packages, tiers);
}

function attachOfflineListeners(container) {
  attachListeners(container, null);
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderBilling(container, status, packages, tiers) {
  container.innerHTML = buildBillingHTML(status, packages, tiers);
  attachListeners(container, status);
}

function buildBillingHTML(status, packages, tiers) {
  const { freeTier, credits, subscription, plan } = status;
  const freePercent = Math.round((freeTier.used / freeTier.limit) * 100);

  return `
<div class="billing-page">

  <!-- Current Plan Banner -->
  <div class="billing-plan-banner billing-plan-${plan}">
    <div class="billing-plan-info">
      <span class="billing-plan-badge">${planLabel(plan, subscription)}</span>
      <h2>Your Plan</h2>
      <p>${planDescription(plan, freeTier, credits, subscription)}</p>
    </div>
    <div class="billing-plan-stats">
      ${
        plan === "free"
          ? `
        <div class="billing-stat">
          <span class="billing-stat-value">${freeTier.remaining}</span>
          <span class="billing-stat-label">Free analyses left</span>
        </div>
        <div class="billing-progress-wrap">
          <div class="billing-progress-bar">
            <div class="billing-progress-fill ${freePercent >= 80 ? "billing-progress-warn" : ""}"
                 style="width:${freePercent}%"></div>
          </div>
          <span class="billing-progress-text">${freeTier.used}/${freeTier.limit} used this month</span>
        </div>
      `
          : plan === "credits"
            ? `
        <div class="billing-stat">
          <span class="billing-stat-value">${credits}</span>
          <span class="billing-stat-label">Credits remaining</span>
        </div>
      `
            : `
        <div class="billing-stat">
          <span class="billing-stat-value">${subscription?.analysisLimit === -1 ? "∞" : subscription?.analysisLimit}</span>
          <span class="billing-stat-label">Analyses/month</span>
        </div>
      `
      }
    </div>
  </div>

  <!-- Tabs -->
  <div class="billing-tabs">
    <button class="billing-tab active" data-tab="credits">💳 Buy Credits</button>
    <button class="billing-tab" data-tab="subscription">📅 Subscription</button>
  </div>

  <!-- Credits Tab -->
  <div class="billing-tab-content active" data-tab="credits">
    <p class="billing-section-desc">Buy credits once, use anytime. No expiry.</p>
    <div class="billing-packages-grid">
      ${packages
        .map(
          (pkg) => `
        <div class="billing-package-card ${pkg.popular ? "billing-package-popular" : ""}">
          ${pkg.popular ? '<span class="billing-popular-badge">Most Popular</span>' : ""}
          <h3>${pkg.name}</h3>
          <div class="billing-package-credits">
            <span class="billing-credits-num">${pkg.credits + (pkg.bonusCredits || 0)}</span>
            <span class="billing-credits-label">credits</span>
          </div>
          ${pkg.bonusCredits > 0 ? `<p class="billing-bonus">+${pkg.bonusCredits} bonus credits</p>` : ""}
          <div class="billing-package-price">${pkg.priceFormatted || "$" + (pkg.price / 100).toFixed(2)}</div>
          <p class="billing-per-credit">$${(pkg.price / 100 / (pkg.credits + (pkg.bonusCredits || 0))).toFixed(3)} per credit</p>
          <button class="billing-buy-btn" data-package="${pkg.id}" data-name="${pkg.name}" data-credits="${pkg.credits + (pkg.bonusCredits || 0)}" data-price="${pkg.priceFormatted || "$" + (pkg.price / 100).toFixed(2)}">
            Buy Now
          </button>
        </div>
      `,
        )
        .join("")}
    </div>
    <p class="billing-note">💡 Blood analysis = 5 credits · Vitamin analysis = 4 credits</p>
  </div>

  <!-- Subscription Tab -->
  <div class="billing-tab-content" data-tab="subscription">
    <p class="billing-section-desc">Monthly plan with fixed number of analyses.</p>
    ${
      subscription
        ? `
      <div class="billing-active-sub">
        <span class="billing-active-badge">✅ Active</span>
        <strong>${subscription.tierName}</strong>
        <span>${subscription.analysisLimit === -1 ? "Unlimited" : subscription.analysisLimit} analyses/month</span>
        <button class="billing-cancel-btn" id="cancelSubBtn">Cancel Subscription</button>
      </div>
    `
        : ""
    }
    <div class="billing-tiers-grid">
      ${tiers
        .map(
          (tier) => `
        <div class="billing-tier-card ${tier.popular ? "billing-tier-popular" : ""} ${subscription?.tierId === tier.id ? "billing-tier-active" : ""}">
          ${tier.popular ? '<span class="billing-popular-badge">Recommended</span>' : ""}
          <h3>${tier.name}</h3>
          <div class="billing-tier-price">${tier.priceFormatted || "$" + (tier.monthlyPrice / 100).toFixed(2) + "/mo"}</div>
          <div class="billing-tier-limit">${tier.analysisLimitLabel || (tier.analysisLimit === -1 ? "Unlimited" : tier.analysisLimit + "/mo")} analyses</div>
          <ul class="billing-features">
            ${tier.features.map((f) => `<li>✓ ${f}</li>`).join("")}
          </ul>
          <button class="billing-subscribe-btn ${subscription?.tierId === tier.id ? "billing-current-btn" : ""}"
                  data-tier="${tier.id}" data-name="${tier.name}"
                  data-price="${tier.priceFormatted || "$" + (tier.monthlyPrice / 100).toFixed(2) + "/mo"}"
                  ${subscription?.tierId === tier.id ? "disabled" : ""}>
            ${subscription?.tierId === tier.id ? "Current Plan" : "Subscribe"}
          </button>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>

</div>`;
}

function planLabel(plan, subscription) {
  if (plan === "subscription") return subscription?.tierName || "Subscription";
  if (plan === "credits") return "Credits";
  return "Free Plan";
}

function planDescription(plan, freeTier, credits, subscription) {
  if (plan === "subscription")
    return `Active subscription — ${subscription?.analysisLimit === -1 ? "unlimited" : subscription?.analysisLimit} analyses per month`;
  if (plan === "credits") return `You have ${credits} credits available`;
  return `${freeTier.remaining} of ${freeTier.limit} free analyses remaining this month`;
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

function attachListeners(container, status) {
  // Tabs
  container.querySelectorAll(".billing-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      container
        .querySelectorAll(".billing-tab")
        .forEach((b) => b.classList.remove("active"));
      container
        .querySelectorAll(".billing-tab-content")
        .forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      container
        .querySelector(`.billing-tab-content[data-tab="${btn.dataset.tab}"]`)
        ?.classList.add("active");
    });
  });

  // Buy credits
  container.querySelectorAll(".billing-buy-btn").forEach((btn) => {
    btn.addEventListener("click", () => showPurchaseConfirm(btn.dataset));
  });

  // Subscribe
  container
    .querySelectorAll(".billing-subscribe-btn:not([disabled])")
    .forEach((btn) => {
      btn.addEventListener("click", () => showSubscribeConfirm(btn.dataset));
    });

  // Cancel subscription
  container
    .querySelector("#cancelSubBtn")
    ?.addEventListener("click", cancelSubscription);
}

// ─── Purchase Confirm Modal ───────────────────────────────────────────────────

function showPurchaseConfirm({ package: pkgId, name, credits, price }) {
  showBillingModal({
    title: "💳 Confirm Purchase",
    body: `
            <div class="billing-confirm-details">
                <div class="billing-confirm-row"><span>Package</span><strong>${name}</strong></div>
                <div class="billing-confirm-row"><span>Credits</span><strong>${credits}</strong></div>
                <div class="billing-confirm-row billing-confirm-total"><span>Total</span><strong>${price}</strong></div>
            </div>
            <p class="billing-confirm-note">⚠️ Demo mode: no real payment will be charged.</p>
        `,
    confirmText: "Confirm Purchase",
    confirmClass: "billing-modal-confirm",
    onConfirm: async () => {
      try {
        const res = await apiFetch("/monetization/credits/purchase", {
          method: "POST",
          body: JSON.stringify({ packageId: pkgId }),
        });
        if (res.success) {
          toast(`✅ ${credits} credits added to your account!`, "success");
          await loadStatus();
        } else {
          toast(res.error || "Purchase failed", "error");
        }
      } catch {
        toast("Server unavailable. Try again later.", "error");
      }
    },
  });
}

function showSubscribeConfirm({ tier, name, price }) {
  showBillingModal({
    title: "📅 Confirm Subscription",
    body: `
            <div class="billing-confirm-details">
                <div class="billing-confirm-row"><span>Plan</span><strong>${name}</strong></div>
                <div class="billing-confirm-row billing-confirm-total"><span>Price</span><strong>${price}</strong></div>
            </div>
            <p class="billing-confirm-note">⚠️ Demo mode: no real payment will be charged.</p>
        `,
    confirmText: "Activate Plan",
    confirmClass: "billing-modal-confirm",
    onConfirm: async () => {
      try {
        const res = await apiFetch("/monetization/subscriptions/create", {
          method: "POST",
          body: JSON.stringify({ tierId: tier }),
        });
        if (res.success) {
          toast(`✅ ${name} activated!`, "success");
          await loadStatus();
        } else {
          toast(res.error || "Subscription failed", "error");
        }
      } catch {
        toast("Server unavailable. Try again later.", "error");
      }
    },
  });
}

async function cancelSubscription() {
  showBillingModal({
    title: "⚠️ Cancel Subscription",
    body: `<p style="color:#64748b">Are you sure you want to cancel your subscription? You will lose access at the end of the billing period.</p>`,
    confirmText: "Yes, Cancel",
    confirmClass: "billing-modal-danger",
    onConfirm: async () => {
      try {
        const res = await apiFetch("/monetization/subscriptions/cancel", {
          method: "DELETE",
        });
        if (res.success) {
          toast("Subscription cancelled.", "info");
          await loadStatus();
        } else {
          toast(res.error || "Cancellation failed", "error");
        }
      } catch {
        toast("Server unavailable.", "error");
      }
    },
  });
}

// ─── Generic Modal ────────────────────────────────────────────────────────────

function showBillingModal({
  title,
  body,
  confirmText,
  confirmClass,
  onConfirm,
}) {
  document.getElementById("billingModal")?.remove();

  const modal = document.createElement("div");
  modal.id = "billingModal";
  modal.className = "pm-modal";
  modal.innerHTML = `
        <div class="pm-modal-box billing-modal-box">
            <h3 class="billing-modal-title">${title}</h3>
            <div class="billing-modal-body">${body}</div>
            <div class="pm-modal-actions">
                <button class="${confirmClass}" id="billingConfirmBtn">${confirmText}</button>
                <button id="billingCancelBtn">Cancel</button>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  modal.querySelector("#billingCancelBtn").onclick = () => modal.remove();
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  modal.querySelector("#billingConfirmBtn").onclick = async () => {
    modal.remove();
    await onConfirm();
  };
}
