// billing.module.js — Stripe Checkout Integration
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";

const API_BASE = (window.__API_BASE_URL__ || "http://localhost:3001") + "/api";

const PACKAGES = [
  {
    id: "pack_100",
    name: "Starter",
    credits: 100,
    price: "$3.99",
    color: "#3b82f6",
    emoji: "⚡",
  },
  {
    id: "pack_300",
    name: "Value",
    credits: 300,
    price: "$8.99",
    color: "#8b5cf6",
    emoji: "🚀",
    popular: true,
  },
  {
    id: "pack_800",
    name: "Pro",
    credits: 800,
    price: "$19.99",
    color: "#059669",
    emoji: "💎",
  },
];

const TIERS = [
  {
    id: "monthly_500",
    name: "Monthly Plan",
    price: "$14.99/mo",
    credits: 500,
    features: [
      "500 kredit/oy",
      "Har oy yangilanadi",
      "Barcha tahlil turlari",
      "Telegram eslatmalar",
    ],
    color: "#7c3aed",
    popular: true,
  },
];

let currentUser = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initBillingModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  currentUser = session.user;
  await renderBilling();
}

// ─── API Helper ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
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

// ─── Load user data ───────────────────────────────────────────────────────────

async function getUserData() {
  if (!currentUser) return null;
  const { data } = await supabase
    .from("users")
    .select("credits, free_credits_used, subscription_status")
    .eq("id", currentUser.id)
    .single();
  return data;
}

// ─── Render ───────────────────────────────────────────────────────────────────

async function renderBilling() {
  const container = document.getElementById("billingPage");
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;">
    <div style="font-size:32px;margin-bottom:12px;">⏳</div>
    <div>Yuklanmoqda...</div>
  </div>`;

  const userData = await getUserData();
  const credits = userData?.credits || 0;
  const freeUsed = userData?.free_credits_used || 0;
  const freeLimit = 10;
  const freeRemaining = Math.max(0, freeLimit - freeUsed);
  const freePercent = Math.min(100, Math.round((freeUsed / freeLimit) * 100));

  container.innerHTML = buildHTML(
    credits,
    freeRemaining,
    freePercent,
    freeUsed,
    freeLimit,
  );
  attachEvents(container);
}

function buildHTML(credits, freeRemaining, freePercent, freeUsed, freeLimit) {
  return `
<div class="bl-page">

  <!-- Header Stats -->
  <div class="bl-header">
    <div class="bl-header-left">
      <div class="bl-header-title">💳 To'lov va Kreditlar</div>
      <div class="bl-header-sub">AI tahlil uchun kreditlar sotib oling</div>
    </div>
    <div class="bl-balance-card">
      <div class="bl-balance-icon">🪙</div>
      <div>
        <div class="bl-balance-num">${credits}</div>
        <div class="bl-balance-label">Mavjud kredit</div>
      </div>
    </div>
  </div>

  <!-- Free tier progress -->
  <div class="bl-free-card">
    <div class="bl-free-top">
      <span class="bl-free-title">🎁 Bepul kredit</span>
      <span class="bl-free-count">${freeRemaining}/${freeLimit} qoldi</span>
    </div>
    <div class="bl-progress-bar">
      <div class="bl-progress-fill ${freePercent >= 80 ? "bl-progress-warn" : ""}" style="width:${freePercent}%"></div>
    </div>
    <div class="bl-free-note">Har oy ${freeLimit} ta bepul kredit beriladi</div>
  </div>

  <!-- Tabs -->
  <div class="bl-tabs">
    <button class="bl-tab active" data-tab="credits">⚡ Kredit sotib olish</button>
    <button class="bl-tab" data-tab="subscription">📅 Obuna</button>
  </div>

  <!-- Credits Tab -->
  <div class="bl-tab-content active" data-tab="credits">
    <p class="bl-desc">Bir martalik to'lov — muddatsiz kredit</p>
    <div class="bl-packages">
      ${PACKAGES.map(
        (pkg) => `
        <div class="bl-pkg ${pkg.popular ? "bl-pkg-popular" : ""}" style="--pkg-color:${pkg.color}">
          ${pkg.popular ? '<div class="bl-pkg-badge">🔥 Eng mashhur</div>' : ""}
          <div class="bl-pkg-emoji">${pkg.emoji}</div>
          <div class="bl-pkg-name">${pkg.name}</div>
          <div class="bl-pkg-credits">${pkg.credits}<span>kredit</span></div>
          <div class="bl-pkg-price">${pkg.price}</div>
          <div class="bl-pkg-per">${((parseFloat(pkg.price.replace("$", "")) / pkg.credits) * 100).toFixed(1)}¢ / kredit</div>
          <button class="bl-buy-btn" data-pkg="${pkg.id}" data-credits="${pkg.credits}" data-name="${pkg.name}" data-price="${pkg.price}">
            Sotib olish
          </button>
        </div>
      `,
      ).join("")}
    </div>
    <div class="bl-info-row">
      <span>🩸 Qon tahlili = 5 kredit</span>
      <span>💊 Vitamin tahlili = 4 kredit</span>
    </div>
  </div>

  <!-- Subscription Tab -->
  <div class="bl-tab-content" data-tab="subscription">
    <p class="bl-desc">Oylik obuna — har oy kredit yangilanadi</p>
    <div class="bl-tiers">
      ${TIERS.map(
        (tier) => `
        <div class="bl-tier" style="--tier-color:${tier.color}">
          ${tier.popular ? '<div class="bl-tier-badge">⭐ Tavsiya etiladi</div>' : ""}
          <div class="bl-tier-name">${tier.name}</div>
          <div class="bl-tier-price">${tier.price}</div>
          <div class="bl-tier-credits">${tier.credits} kredit/oy</div>
          <ul class="bl-tier-features">
            ${tier.features.map((f) => `<li>✓ ${f}</li>`).join("")}
          </ul>
          <button class="bl-sub-btn" data-tier="${tier.id}" data-credits="${tier.credits}" data-name="${tier.name}">
            Obuna bo'lish
          </button>
        </div>
      `,
      ).join("")}
    </div>
  </div>

</div>`;
}

// ─── Events ───────────────────────────────────────────────────────────────────

function attachEvents(container) {
  // Tabs
  container.querySelectorAll(".bl-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      container
        .querySelectorAll(".bl-tab")
        .forEach((b) => b.classList.remove("active"));
      container
        .querySelectorAll(".bl-tab-content")
        .forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      container
        .querySelector(`.bl-tab-content[data-tab="${btn.dataset.tab}"]`)
        ?.classList.add("active");
    });
  });

  // Buy buttons
  container.querySelectorAll(".bl-buy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showConfirmModal({
        title: "Kredit sotib olish",
        emoji: "🪙",
        rows: [
          ["Paket", btn.dataset.name],
          ["Kredit", btn.dataset.credits],
          ["Narx", btn.dataset.price],
        ],
        note: "Stripe to'lov sahifasiga yo'naltirilasiz",
        confirmText: "💳 Stripe bilan to'lash",
        onConfirm: async () => {
          await handleBuyStripe(
            btn.dataset.pkg,
            btn.dataset.name,
            btn.dataset.credits,
          );
        },
      });
    });
  });

  // Subscribe buttons
  container.querySelectorAll(".bl-sub-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showConfirmModal({
        title: "Obuna bo'lish",
        emoji: "📅",
        rows: [
          ["Reja", btn.dataset.name],
          ["Kredit", `${btn.dataset.credits}/oy`],
        ],
        note: "Stripe to'lov sahifasiga yo'naltirilasiz",
        confirmText: "💳 Obuna bo'lish",
        onConfirm: async () => {
          await handleSubscribeStripe(btn.dataset.tier, btn.dataset.name);
        },
      });
    });
  });
}

// ─── Stripe Checkout Handlers ────────────────────────────────────────────────

async function handleBuyStripe(packageId, name, credits) {
  try {
    const res = await apiFetch("/monetization/credits/checkout", {
      method: "POST",
      body: JSON.stringify({ packageId }),
    });

    console.log("[billing] checkout response:", res);

    if (res.success && res.data?.checkoutUrl) {
      window.location.href = res.data.checkoutUrl;
    } else if (res.success && res.demo) {
      toast(`✅ Demo: ${credits} kredit qo'shildi!`, "success");
      setTimeout(() => renderBilling(), 1000);
    } else {
      const errMsg = res.error?.message || res.error || "Xatolik yuz berdi";
      toast("❌ " + errMsg, "error");
    }
  } catch (e) {
    console.error("[billing] fetch error:", e);
    toast(
      "❌ Server bilan bog'lanib bo'lmadi. Serverni ishga tushiring.",
      "error",
    );
  }
}

async function handleSubscribeStripe(tierId, name) {
  try {
    const res = await apiFetch("/monetization/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify({ tierId }),
    });

    console.log("[billing] subscribe response:", res);

    if (res.success && res.data?.checkoutUrl) {
      window.location.href = res.data.checkoutUrl;
    } else if (res.success && res.demo) {
      toast(`✅ Demo: Obuna faollashtirildi!`, "success");
      setTimeout(() => renderBilling(), 1000);
    } else {
      const errMsg = res.error?.message || res.error || "Xatolik yuz berdi";
      toast("❌ " + errMsg, "error");
    }
  } catch (e) {
    console.error("[billing] fetch error:", e);
    toast(
      "❌ Server bilan bog'lanib bo'lmadi. Serverni ishga tushiring.",
      "error",
    );
  }
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function showConfirmModal({
  title,
  emoji,
  rows,
  note,
  confirmText,
  onConfirm,
}) {
  document.getElementById("blModal")?.remove();

  const modal = document.createElement("div");
  modal.id = "blModal";
  modal.className = "bl-modal-overlay";
  modal.innerHTML = `
    <div class="bl-modal">
      <div class="bl-modal-emoji">${emoji}</div>
      <h3 class="bl-modal-title">${title}</h3>
      <div class="bl-modal-rows">
        ${rows
          .map(
            ([k, v]) => `
          <div class="bl-modal-row">
            <span>${k}</span><strong>${v}</strong>
          </div>
        `,
          )
          .join("")}
      </div>
      ${note ? `<div class="bl-modal-note">ℹ️ ${note}</div>` : ""}
      <div class="bl-modal-actions">
        <button class="bl-modal-confirm" id="blConfirm">${confirmText}</button>
        <button class="bl-modal-cancel" id="blCancel">Bekor qilish</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#blCancel").onclick = () => modal.remove();
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#blConfirm").onclick = async () => {
    const btn = modal.querySelector("#blConfirm");
    const cancelBtn = modal.querySelector("#blCancel");
    btn.disabled = true;
    cancelBtn.disabled = true;
    btn.textContent = "⏳ Yuklanmoqda...";
    await onConfirm();
    modal.remove();
  };
}
