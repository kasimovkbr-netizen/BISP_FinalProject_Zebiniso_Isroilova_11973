// notifications.module.js
// Tables: notifications, app_feedback
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";

let userId = null;
let channel = null;

export async function initNotificationsModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  userId = session.user.id;
  renderShell();
  await loadNotifications();
  subscribeRealtime();
}

export function destroyNotificationsModule() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  userId = null;
}

function renderShell() {
  const page = document.querySelector(".notifications-page");
  if (!page) return;
  page.innerHTML = `
    <div class="adm-header">
      <div class="adm-title">🔔 Bildirishnomalar</div>
      <div style="display:flex;gap:8px;">
        <button class="adm-btn-primary" id="markAllRead">✅ Hammasini o'qildi</button>
      </div>
    </div>
    <div id="notifList"></div>
    <div class="adm-section" style="margin-top:24px;">
      <div class="adm-section-title">💬 Fikr-mulohaza yuborish</div>
      <form id="feedbackForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Reyting</label>
            <select id="fbRating">
              <option value="5">⭐⭐⭐⭐⭐ Ajoyib</option>
              <option value="4">⭐⭐⭐⭐ Yaxshi</option>
              <option value="3">⭐⭐⭐ O'rtacha</option>
              <option value="2">⭐⭐ Yomon</option>
              <option value="1">⭐ Juda yomon</option>
            </select>
          </div>
          <div><label>Kategoriya</label>
            <select id="fbCategory">
              <option value="general">Umumiy</option>
              <option value="bug">Xato</option>
              <option value="feature">Taklif</option>
              <option value="design">Dizayn</option>
            </select>
          </div>
        </div>
        <textarea id="fbMessage" placeholder="Fikringizni yozing..." rows="3"></textarea>
        <button type="submit" class="adm-btn-primary">📤 Yuborish</button>
      </form>
    </div>
  `;
  document
    .getElementById("markAllRead")
    ?.addEventListener("click", markAllRead);
  document
    .getElementById("feedbackForm")
    ?.addEventListener("submit", submitFeedback);
}

async function loadNotifications() {
  const el = document.getElementById("notifList");
  if (!el) return;
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Bildirishnoma yo'q</div>`;
    return;
  }
  el.innerHTML = data
    .map(
      (n) => `
    <div class="notif-item ${n.read ? "" : "notif-unread"}" data-id="${n.id}">
      <div class="notif-icon">${getNotifIcon(n.type)}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title || n.type}</div>
        <div class="notif-msg">${n.message || ""}</div>
        <div class="notif-time">${new Date(n.created_at).toLocaleString("uz-UZ")}</div>
      </div>
      ${!n.read ? `<button class="adm-btn-sm blue notif-read-btn" data-id="${n.id}">O'qildi</button>` : ""}
    </div>
  `,
    )
    .join("");
  el.querySelectorAll(".notif-read-btn").forEach((btn) => {
    btn.addEventListener("click", () => markRead(btn.dataset.id));
  });
}

function getNotifIcon(type) {
  const icons = {
    medicine: "💊",
    vaccine: "💉",
    appointment: "🏥",
    article: "📚",
    credit: "🪙",
    system: "⚙️",
  };
  return icons[type] || "🔔";
}

async function markRead(id) {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
  document.querySelector(`[data-id="${id}"]`)?.classList.remove("notif-unread");
  document.querySelector(`[data-id="${id}"] .notif-read-btn`)?.remove();
}

async function markAllRead() {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  toast("✅ Hammasi o'qildi", "success");
  await loadNotifications();
}

async function submitFeedback(e) {
  e.preventDefault();
  const { error } = await supabase.from("app_feedback").insert({
    user_id: userId,
    rating: parseInt(document.getElementById("fbRating").value),
    category: document.getElementById("fbCategory").value,
    message: document.getElementById("fbMessage").value.trim() || null,
  });
  if (error) {
    toast("Xato: " + error.message, "error");
    return;
  }
  toast("✅ Fikringiz yuborildi, rahmat!", "success");
  document.getElementById("feedbackForm").reset();
}

function subscribeRealtime() {
  channel = supabase
    .channel("notifications-" + userId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        toast(`🔔 ${payload.new.title || "Yangi bildirishnoma"}`, "info");
        await loadNotifications();
      },
    )
    .subscribe();
}
