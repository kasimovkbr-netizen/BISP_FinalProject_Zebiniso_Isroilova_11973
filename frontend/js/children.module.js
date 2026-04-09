// Requirements: 5.4, 6.1–6.7
import { supabase } from "./supabase.js";

import { computeScheduledDate } from "./vaccination_utils.js";
import { UZ_VACCINE_SCHEDULE } from "./uz_vaccine_schedule.js";
import { generateVaccinationRecords } from "./vaccination.module.js";

let userId = null;
let editId = null;
let channel = null;

// Global confirm modal state
let pendingDeleteChildId = null;

export async function initChildrenModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  userId = session.user.id;

  supabase.auth.onAuthStateChange((event, sess) => {
    if (event === "SIGNED_OUT" || !sess) {
      window.location.href = "../auth/login.html";
    }
  });

  setupUI();
  await loadChildren();
  subscribeRealtime();
}

export function destroyModule() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}

/* ======================
   REALTIME SUBSCRIPTION
====================== */
function subscribeRealtime() {
  if (!userId) return;

  channel = supabase
    .channel("children-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
        filter: `parent_id=eq.${userId}`,
      },
      () => {
        loadChildren();
      },
    )
    .subscribe();
}

/* ======================
   LOAD CHILDREN
====================== */
async function loadChildren() {
  const list = document.getElementById("childList");
  if (!list || !userId) return;

  list.innerHTML = "";

  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("parent_id", userId);

  if (error) {
    console.error("[children] loadChildren error:", error);
    return;
  }

  (data || []).forEach((c) => {
    const li = document.createElement("li");
    li.className = "child-card";

    const ageLabel =
      c.age_unit === "months"
        ? `${Number(c.age ?? 0)} mo`
        : `${Number(c.age ?? 0)} yrs`;

    li.innerHTML = `
      <div class="child-info">
        <span class="child-name">${escapeHtml(c.name ?? "")}</span>
        <span class="divider">|</span>
        <span class="child-age">${ageLabel}</span>
        <span class="divider">|</span>
        <span class="gender">${escapeHtml(c.gender ?? "")}</span>
      </div>

      <div class="child-actions">
        <button class="editBtn" data-id="${c.id}">Edit</button>
        <button class="deleteBtn" data-id="${c.id}">Delete</button>
      </div>
    `;

    li.querySelector(".editBtn").onclick = () => openModal(c, c.id);
    li.querySelector(".deleteBtn").onclick = () =>
      openDeleteConfirm(c.id, c?.name);

    list.appendChild(li);
  });
}

/* ======================
   UI LOGIC
====================== */
function setupUI() {
  const addChildBtn = document.getElementById("addChildBtn");
  const closeChildModal = document.getElementById("closeChildModal");
  const childForm = document.getElementById("childForm");

  if (addChildBtn) addChildBtn.onclick = () => openModal();
  if (closeChildModal) closeChildModal.onclick = () => closeModal();

  // Age unit toggle
  const ageUnitYears = document.getElementById("ageUnitYears");
  const ageUnitMonths = document.getElementById("ageUnitMonths");
  const ageUnitInput = document.getElementById("ageUnit");
  const ageInput = document.getElementById("age");

  if (ageUnitYears && ageUnitMonths) {
    ageUnitYears.onclick = () => {
      ageUnitYears.classList.add("active");
      ageUnitMonths.classList.remove("active");
      if (ageUnitInput) ageUnitInput.value = "years";
      if (ageInput) ageInput.placeholder = "Age (years)";
    };
    ageUnitMonths.onclick = () => {
      ageUnitMonths.classList.add("active");
      ageUnitYears.classList.remove("active");
      if (ageUnitInput) ageUnitInput.value = "months";
      if (ageInput) ageInput.placeholder = "Age (months)";
    };
  }

  if (childForm) {
    childForm.onsubmit = async (e) => {
      e.preventDefault();

      const name = document.getElementById("childName")?.value.trim();
      const age = Number(document.getElementById("age")?.value);
      const gender = document.getElementById("gender")?.value;
      const age_unit = document.getElementById("ageUnit")?.value || "years";
      const birth_date = document.getElementById("birthDate")?.value || null;

      if (!name || !age || !gender) return;

      const data = {
        name,
        age,
        age_unit,
        gender,
        parent_id: userId,
      };

      if (birth_date) data.birth_date = birth_date;

      if (editId) {
        // Fetch old birth_date before updating
        const { data: oldData } = await supabase
          .from("children")
          .select("birth_date")
          .eq("id", editId)
          .single();

        const oldBirthDate = oldData?.birth_date || null;

        const { error } = await supabase
          .from("children")
          .update(data)
          .eq("id", editId);

        if (error) {
          console.error("[children] update error:", error);
          return;
        }

        // Recalculate pending vaccination records if birth_date changed (Req 5.3)
        if (birth_date && birth_date !== oldBirthDate) {
          await recalculatePendingRecords(editId, birth_date);
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("children")
          .insert(data)
          .select()
          .single();

        if (error) {
          console.error("[children] insert error:", error);
          return;
        }

        if (birth_date && inserted?.id) {
          try {
            await generateVaccinationRecords(inserted.id, userId, birth_date);
          } catch (err) {
            console.error("generateVaccinationRecords error:", err);
          }
        }
      }

      closeModal();
      loadChildren();
    };
  }

  wireGlobalConfirmModal();
}

/* ======================
   MODAL HELPERS (ADD/EDIT)
====================== */
function openModal(child = null, id = null) {
  editId = id;

  const modal = document.getElementById("childModal");
  const form = document.getElementById("childForm");
  if (!modal || !form) return;

  modal.classList.remove("hidden");
  const title = document.getElementById("childModalTitle");
  if (title) title.textContent = id ? "Edit Child" : "Add Child";

  const nameInput = document.getElementById("childName");
  const ageInput = document.getElementById("age");
  const genderInput = document.getElementById("gender");
  const birthDateInput = document.getElementById("birthDate");

  if (nameInput) nameInput.value = child?.name || "";
  if (ageInput) ageInput.value = child?.age || "";
  if (genderInput) genderInput.value = child?.gender || "";
  if (birthDateInput) birthDateInput.value = child?.birth_date || "";

  // Restore age unit toggle
  const savedUnit = child?.age_unit || "years";
  const ageUnitInput = document.getElementById("ageUnit");
  const ageUnitYears = document.getElementById("ageUnitYears");
  const ageUnitMonths = document.getElementById("ageUnitMonths");
  if (ageUnitInput) ageUnitInput.value = savedUnit;
  if (ageUnitYears && ageUnitMonths) {
    if (savedUnit === "months") {
      ageUnitMonths.classList.add("active");
      ageUnitYears.classList.remove("active");
    } else {
      ageUnitYears.classList.add("active");
      ageUnitMonths.classList.remove("active");
    }
  }
}

function closeModal() {
  editId = null;
  const modal = document.getElementById("childModal");
  if (modal) modal.classList.add("hidden");
}

/* ======================
   DELETE via GLOBAL confirmModal
====================== */
function openDeleteConfirm(childId, childName = "") {
  pendingDeleteChildId = childId;

  const confirmModal = document.getElementById("confirmModal");
  const confirmText = document.getElementById("confirmText");

  if (confirmText) {
    confirmText.textContent = childName
      ? `Delete "${childName}"? This will also remove that child's medicines.`
      : "Are you sure you want to delete this child?";
  }

  if (confirmModal) confirmModal.classList.remove("hidden");
}

let confirmWired = false;
function wireGlobalConfirmModal() {
  if (confirmWired) return;
  confirmWired = true;

  const confirmModal = document.getElementById("confirmModal");
  const yesBtn = document.getElementById("confirmYes");
  const noBtn = document.getElementById("confirmNo");

  if (!confirmModal || !yesBtn || !noBtn) return;

  noBtn.onclick = () => {
    pendingDeleteChildId = null;
    confirmModal.classList.add("hidden");
  };

  yesBtn.onclick = async () => {
    if (!pendingDeleteChildId) return;

    const id = pendingDeleteChildId;
    pendingDeleteChildId = null;

    const { error } = await supabase.from("children").delete().eq("id", id);

    if (error) {
      console.error("[children] delete error:", error);
    }

    confirmModal.classList.add("hidden");
    loadChildren();
  };
}

/* ======================
   RECALCULATE PENDING VACCINATION RECORDS
   Requirements: 5.3
====================== */
async function recalculatePendingRecords(childId, newBirthDate) {
  const { data: records, error } = await supabase
    .from("vaccination_records")
    .select("id, vaccine_name")
    .eq("child_id", childId)
    .eq("status", "pending");

  if (error) {
    console.error("[children] recalculatePendingRecords error:", error);
    return;
  }

  for (const record of records || []) {
    const vaccine = UZ_VACCINE_SCHEDULE.find(
      (v) => v.name === record.vaccine_name,
    );
    if (!vaccine) continue;

    const newScheduledDate = computeScheduledDate(
      newBirthDate,
      vaccine.offsetDays,
    );

    await supabase
      .from("vaccination_records")
      .update({
        scheduled_date: newScheduledDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
  }
}

/* ======================
   Utils
====================== */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
