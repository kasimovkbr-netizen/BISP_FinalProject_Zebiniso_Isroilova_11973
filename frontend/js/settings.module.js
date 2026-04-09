// Requirements: 5.8, 10.3, 10.4, 10.6
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";

let currentUser = null;

export async function initSettingsModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  currentUser = session.user;

  supabase.auth.onAuthStateChange((event, sess) => {
    if (event === "SIGNED_OUT" || !sess) {
      window.location.href = "../auth/login.html";
    }
  });

  await loadUserProfile();
  setupEventListeners();
  saveTelegramChatId();
  restorePreferences();
}

async function loadUserProfile() {
  if (!currentUser) return;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("display_name, telegram_chat_id")
      .eq("id", currentUser.id)
      .single();

    const nameInput = document.getElementById("settingsDisplayName");
    const emailInput = document.getElementById("settingsEmail");
    const telegramInput = document.getElementById("telegramChatId");

    if (emailInput) emailInput.value = currentUser.email || "";
    if (nameInput) nameInput.value = data?.display_name || "";
    if (telegramInput) telegramInput.value = data?.telegram_chat_id || "";

    if (error) console.error("loadUserProfile error:", error);
  } catch (e) {
    console.error("loadUserProfile error:", e);
  }
}

export async function loadTelegramChatId() {
  if (!currentUser) return;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("telegram_chat_id")
      .eq("id", currentUser.id)
      .single();

    const telegramInput = document.getElementById("telegramChatId");
    if (telegramInput && data) {
      telegramInput.value = data.telegram_chat_id || "";
    }
    if (error) console.error("loadTelegramChatId error:", error);
  } catch (e) {
    console.error("loadTelegramChatId error:", e);
  }
}

export function saveTelegramChatId() {
  const saveTelegramBtn = document.getElementById("saveTelegramBtn");
  if (!saveTelegramBtn) return;
  saveTelegramBtn.addEventListener("click", async () => {
    const chatIdInput = document.getElementById("telegramChatId");
    const errorEl = document.getElementById("telegramChatIdError");
    const chatId = chatIdInput?.value.trim();

    if (!chatId || !/^-?\d+$/.test(chatId)) {
      if (errorEl) errorEl.style.display = "block";
      return;
    }
    if (errorEl) errorEl.style.display = "none";

    try {
      const { error } = await supabase
        .from("users")
        .update({ telegram_chat_id: chatId })
        .eq("id", currentUser.id);

      if (error) throw error;

      // Send test notification via backend
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const apiBase = window.__API_BASE_URL__ || "http://localhost:3001";
        await fetch(`${apiBase}/api/telegram/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
      } catch (_) {
        /* test notification is optional */
      }

      showMessage("Telegram Chat ID saqlandi! Test xabar yuborildi.");
    } catch (e) {
      showMessage("Telegram Chat ID saqlanmadi", "error");
    }
  });
}

export function validatePasswordMatch(p1, p2) {
  return p1 === p2;
}

export function toggleDarkMode(enabled) {
  if (enabled) {
    document.body.dataset.theme = "dark";
  } else {
    delete document.body.dataset.theme;
  }
  localStorage.setItem("pediamom_darkmode", enabled ? "1" : "0");
}

function restorePreferences() {
  const darkToggle = document.getElementById("darkModeToggle");
  if (darkToggle) {
    const saved = localStorage.getItem("pediamom_darkmode") === "1";
    darkToggle.checked = saved;
    if (saved) document.body.dataset.theme = "dark";
  }
  const notifToggle = document.getElementById("notificationsToggle");
  if (notifToggle) {
    notifToggle.checked =
      localStorage.getItem("pediamom_notifications") !== "0";
  }
}

function showMessage(text, type = "success") {
  const box = document.getElementById("settingsMessage");
  if (!box) return;
  box.textContent = text;
  box.className = `settings-message ${type}`;
  box.style.display = "block";
  setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}

function setupEventListeners() {
  // Save profile (display_name)
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
      const name = document.getElementById("settingsDisplayName")?.value.trim();
      if (!name) {
        showMessage("Please enter a display name", "error");
        return;
      }
      try {
        const { error } = await supabase
          .from("users")
          .update({ display_name: name })
          .eq("id", currentUser.id);

        if (error) throw error;
        showMessage("Profile saved successfully!");
      } catch (e) {
        showMessage("Failed to save profile", "error");
      }
    });
  }

  // Change password — no re-auth needed with Supabase
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", async () => {
      const newPw = document.getElementById("newPassword")?.value;
      const confirmPw = document.getElementById("confirmPassword")?.value;
      const errorEl = document.getElementById("passwordError");

      if (!newPw || !confirmPw) {
        if (errorEl) {
          errorEl.textContent = "Please fill all password fields";
          errorEl.style.display = "block";
        }
        return;
      }
      if (!validatePasswordMatch(newPw, confirmPw)) {
        if (errorEl) {
          errorEl.textContent = "New passwords do not match";
          errorEl.style.display = "block";
        }
        return;
      }
      if (errorEl) errorEl.style.display = "none";

      try {
        const { error } = await supabase.auth.updateUser({ password: newPw });
        if (error) throw error;
        showMessage("Password changed successfully!");
        const newPwEl = document.getElementById("newPassword");
        const confirmPwEl = document.getElementById("confirmPassword");
        const currentPwEl = document.getElementById("currentPassword");
        if (newPwEl) newPwEl.value = "";
        if (confirmPwEl) confirmPwEl.value = "";
        if (currentPwEl) currentPwEl.value = "";
      } catch (e) {
        if (errorEl) {
          errorEl.textContent = e.message || "Failed to change password";
          errorEl.style.display = "block";
        }
      }
    });
  }

  // Dark mode toggle
  const darkToggle = document.getElementById("darkModeToggle");
  if (darkToggle) {
    darkToggle.addEventListener("change", () =>
      toggleDarkMode(darkToggle.checked),
    );
  }

  // Notifications toggle
  const notifToggle = document.getElementById("notificationsToggle");
  if (notifToggle) {
    notifToggle.addEventListener("change", () => {
      localStorage.setItem(
        "pediamom_notifications",
        notifToggle.checked ? "1" : "0",
      );
    });
  }

  // Delete account
  const deleteBtn = document.getElementById("deleteAccountBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", showDeleteConfirmDialog);
  }
}

export function showDeleteConfirmDialog() {
  const existing = document.getElementById("deleteAccountModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "deleteAccountModal";
  modal.className = "admin-modal-overlay";
  modal.innerHTML = `
    <div class="admin-modal-box" style="max-width:400px;">
      <h3 style="color:#991b1b;">⚠️ Delete Account</h3>
      <p style="color:#475569;font-size:14px;margin-bottom:16px;">
        This action is permanent and cannot be undone. All your data will be deleted.
        Type <strong>DELETE</strong> to confirm.
      </p>
      <input type="text" id="deleteConfirmInput" placeholder='Type "DELETE" here' style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid #fecaca;font-size:14px;margin-bottom:12px;" />
      <div class="admin-modal-actions">
        <button id="confirmDeleteBtn" style="background:#ef4444;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:600;cursor:pointer;flex:1;">Delete My Account</button>
        <button type="button" id="cancelDeleteBtn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document
    .getElementById("cancelDeleteBtn")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", async () => {
      const input = document.getElementById("deleteConfirmInput")?.value;
      if (input !== "DELETE") {
        toast('Please type "DELETE" exactly to confirm.', "warning");
        return;
      }
      modal.remove();
      await deleteAccount();
    });
}

export async function deleteAccount() {
  if (!currentUser) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) throw new Error("No active session");

    const apiBase = window.__API_BASE_URL__ || "";
    const res = await fetch(`${apiBase}/api/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || "Failed to delete account");
    }

    await supabase.auth.signOut();
    window.location.href = "../index.html";
  } catch (e) {
    toast(
      "Failed to delete account: " + (e.message || "Please try again."),
      "error",
    );
  }
}
