// motherhealth.module.js
// Requirements: 5.9
import { supabase } from "./supabase.js";

/* ── Navigation cards ─────────────────────────────────────────────────────── */
function initNavCards() {
  const cards = document.querySelectorAll(".mh-nav-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const targetPage = card.dataset.page;
      if (!targetPage) return;
      const menuItem = document.querySelector(
        `.menu-item[data-page="${targetPage}"]`,
      );
      if (menuItem) menuItem.click();
    });
  });
}

/* ── Water Intake Card ────────────────────────────────────────────────────── */
export function calculateGlasses(liters) {
  return Math.round(liters * 4);
}

async function initWaterIntakeCard(userId) {
  const litersInput = document.getElementById("waterLiters");
  const startInput = document.getElementById("waterStartHour");
  const endInput = document.getElementById("waterEndHour");
  const glassesDisplay = document.getElementById("waterGlassesDisplay");
  const errorEl = document.getElementById("waterError");
  const saveBtn = document.getElementById("saveWaterBtn");

  if (!litersInput) return;

  // Load existing data
  try {
    const { data, error } = await supabase
      .from("water_intake")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Water intake load error:", error);
    }
    if (data) {
      litersInput.value = data.daily_liters ?? "";
      startInput.value = data.start_hour ?? "";
      endInput.value = data.end_hour ?? "";
      if (data.daily_liters) {
        glassesDisplay.textContent = `≈ ${calculateGlasses(data.daily_liters)} glasses per day`;
      }
    }
  } catch (e) {
    console.error("Water intake load error:", e);
  }

  // Real-time glasses calculation
  litersInput.addEventListener("input", () => {
    const val = parseFloat(litersInput.value);
    if (!isNaN(val) && val > 0) {
      glassesDisplay.textContent = `≈ ${calculateGlasses(val)} glasses per day`;
    } else {
      glassesDisplay.textContent = "";
    }
  });

  // Save
  saveBtn?.addEventListener("click", async () => {
    const daily_liters = parseFloat(litersInput.value);
    const start_hour = parseInt(startInput.value, 10);
    const end_hour = parseInt(endInput.value, 10);

    if (isNaN(daily_liters) || daily_liters < 0.5 || daily_liters > 5) {
      errorEl.textContent = "Please enter a valid daily goal (0.5–5 liters)";
      errorEl.style.display = "block";
      return;
    }
    if (isNaN(start_hour) || isNaN(end_hour) || end_hour <= start_hour) {
      errorEl.textContent = "End time must be after start time";
      errorEl.style.display = "block";
      return;
    }
    errorEl.style.display = "none";

    try {
      const { error } = await supabase
        .from("water_intake")
        .upsert(
          {
            user_id: userId,
            daily_liters,
            start_hour,
            end_hour,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) throw error;
      saveBtn.textContent = "✅ Saved";
      setTimeout(() => {
        saveBtn.textContent = "Save";
      }, 1500);
    } catch (e) {
      console.error("Water intake save error:", e);
      errorEl.textContent = "Failed to save. Please try again.";
      errorEl.style.display = "block";
    }
  });
}

/* ── Doctor Appointment Card ──────────────────────────────────────────────── */
async function initAppointmentCard(userId) {
  const dateInput = document.getElementById("appointmentDate");
  const warningEl = document.getElementById("appointmentWarning");
  const saveBtn = document.getElementById("saveAppointmentBtn");

  if (!dateInput) return;

  // Load existing data
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("appointment_date")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Appointment load error:", error);
    }
    if (data?.appointment_date) {
      dateInput.value = data.appointment_date;
    }
  } catch (e) {
    console.error("Appointment load error:", e);
  }

  // Save
  saveBtn?.addEventListener("click", async () => {
    const appointment_date = dateInput.value;
    if (!appointment_date) {
      warningEl.textContent = "Please select a date";
      warningEl.style.display = "block";
      return;
    }

    // Past date warning (non-blocking)
    const today = new Date().toISOString().split("T")[0];
    if (appointment_date < today) {
      warningEl.textContent = "The selected date is in the past. Are you sure?";
      warningEl.style.display = "block";
    } else {
      warningEl.style.display = "none";
    }

    try {
      const { error } = await supabase
        .from("appointments")
        .upsert(
          {
            user_id: userId,
            appointment_date,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) throw error;
      saveBtn.textContent = "✅ Saved";
      setTimeout(() => {
        saveBtn.textContent = "Save";
      }, 1500);
    } catch (e) {
      console.error("Appointment save error:", e);
    }
  });
}

/* ── Main init ────────────────────────────────────────────────────────────── */
export async function initMotherHealthModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  const userId = session.user.id;

  initNavCards();
  initWaterIntakeCard(userId);
  initAppointmentCard(userId);
}
