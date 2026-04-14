// Feature: vaccination-tracker
// Requirements: 5.7, 6.1–6.7

import { supabase } from "./supabase.js";
import { UZ_VACCINE_SCHEDULE } from "./uz_vaccine_schedule.js";
import { t } from "./i18n.js";
import {
  computeScheduledDate,
  deriveStatus,
  applyRelativeScheduling,
} from "./vaccination_utils.js";

let userId = null;
let selectedChildId = null;
let vaccinationChannel = null;

const today = new Date().toISOString().split("T")[0];

/* ======================
   INIT / DESTROY
====================== */
export async function initVaccinationModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  userId = session.user.id;

  await loadChildrenDropdown();
  setupChildFilter();
  toggleList(false);
}

export function destroyVaccinationModule() {
  if (vaccinationChannel) {
    supabase.removeChannel(vaccinationChannel);
    vaccinationChannel = null;
  }
  userId = null;
  selectedChildId = null;
}

/* ======================
   CHILD DROPDOWN
   Requirements: 6.2
====================== */
async function loadChildrenDropdown() {
  const select = document.getElementById("vaccinationChildSelect");
  if (!select || !userId) return;

  const { data, error } = await supabase
    .from("children")
    .select("id, name")
    .eq("parent_id", userId);

  if (error) {
    console.error("[vaccination] loadChildren error:", error);
    return;
  }

  select.innerHTML = `<option value="">— ${t("select_child")} —</option>`;
  (data || []).forEach((child) => {
    const opt = document.createElement("option");
    opt.value = child.id;
    opt.textContent = child.name;
    select.appendChild(opt);
  });
}

function setupChildFilter() {
  const select = document.getElementById("vaccinationChildSelect");
  if (!select) return;

  select.onchange = async () => {
    selectedChildId = select.value || null;

    // Cleanup previous realtime channel
    if (vaccinationChannel) {
      supabase.removeChannel(vaccinationChannel);
      vaccinationChannel = null;
    }

    if (!selectedChildId) {
      toggleList(false);
      return;
    }

    toggleList(true);

    // Auto-generate vaccination records if none exist
    await ensureVaccinationRecords(selectedChildId);

    loadVaccinationList(selectedChildId);
  };
}

/* ======================
   VACCINATION LIST
   Requirements: 6.1, 6.3, 6.4, 6.7
====================== */
export function loadVaccinationList(childId) {
  if (!userId) return;

  // Initial fetch
  fetchAndRenderVaccinations(childId);

  // Realtime subscription — filter by parent_id (Req 6.7)
  vaccinationChannel = supabase
    .channel("vaccination-records-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "vaccination_records",
        filter: `parent_id=eq.${userId}`,
      },
      () => {
        fetchAndRenderVaccinations(childId);
      },
    )
    .subscribe();
}

async function fetchAndRenderVaccinations(childId) {
  const listEl = document.getElementById("vaccinationList");
  if (!listEl || !userId) return;

  const { data, error } = await supabase
    .from("vaccination_records")
    .select("*")
    .eq("parent_id", userId)
    .eq("child_id", childId);

  if (error) {
    console.error("[vaccination] fetch error:", error);
    return;
  }

  listEl.innerHTML = "";

  if (!data || data.length === 0) {
    listEl.innerHTML = `<li style="padding:20px;text-align:center;color:#94a3b8;font-size:14px;">
      No vaccination records found for this child.
    </li>`;
    return;
  }

  // Sort by scheduled_date ascending
  const records = (data || []).sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date),
  );

  records.forEach((record) => {
    const status = deriveStatus(
      record.scheduled_date,
      record.taken_date,
      today,
    );
    const li = document.createElement("li");
    li.className = `vaccination-item ${status}`;

    li.innerHTML = `
      <input type="checkbox" ${record.taken_date ? "checked" : ""} data-id="${record.id}">
      <div class="vax-info">
        <span class="vax-name">${record.vaccine_name}</span>
        <span class="vax-date">📅 ${record.scheduled_date}</span>
        <span class="vax-status">${t(status) || status}</span>
      </div>
    `;

    li.querySelector("input[type=checkbox]").onchange = (e) => {
      toggleVaccine(record.id, e.target.checked, record, records);
    };

    listEl.appendChild(li);
  });
}

/* ======================
   ENSURE VACCINATION RECORDS
   Auto-generate if none exist for this child
====================== */
async function ensureVaccinationRecords(childId) {
  // Check if records already exist
  const { data: existing } = await supabase
    .from("vaccination_records")
    .select("id")
    .eq("child_id", childId)
    .limit(1);

  if (existing && existing.length > 0) return; // already generated

  // Get child's birth_date
  const { data: child } = await supabase
    .from("children")
    .select("birth_date, name")
    .eq("id", childId)
    .single();

  // Use birth_date if available, otherwise use today as reference
  const birthDate = child?.birth_date || new Date().toISOString().split("T")[0];

  await generateVaccinationRecords(childId, userId, birthDate);
}

/* ======================
   GENERATE RECORDS
   Requirements: 5.1, 5.2, 5.4, 10.1
====================== */
export async function generateVaccinationRecords(childId, parentId, birthDate) {
  for (const vaccine of UZ_VACCINE_SCHEDULE) {
    // Duplicate check (Req 5.4)
    const { data: existing, error: checkError } = await supabase
      .from("vaccination_records")
      .select("id")
      .eq("child_id", childId)
      .eq("vaccine_name", vaccine.name);

    if (checkError) {
      console.error("[vaccination] duplicate check error:", checkError);
      continue;
    }

    if (existing && existing.length > 0) continue;

    const scheduledDate = computeScheduledDate(birthDate, vaccine.offsetDays);

    const { error } = await supabase.from("vaccination_records").insert({
      child_id: childId,
      parent_id: parentId,
      vaccine_name: vaccine.name,
      scheduled_date: scheduledDate,
      status: "pending",
      taken_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[vaccination] insert error:", error);
    }
  }
}

/* ======================
   TOGGLE VACCINE
   Requirements: 6.5, 6.6, 7.1, 7.2, 7.3, 7.4
====================== */
export async function toggleVaccine(recordId, taken, record, allRecords) {
  try {
    if (taken) {
      const takenDate = today;

      const { error } = await supabase
        .from("vaccination_records")
        .update({
          taken_date: takenDate,
          status: "taken",
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordId);

      if (error) throw error;

      // Apply relative scheduling if taken late (Req 7.1–7.4)
      if (takenDate > record.scheduled_date && allRecords) {
        const currentIdx = allRecords.findIndex((r) => r.id === recordId);
        if (currentIdx !== -1) {
          const enriched = allRecords.map((r) => {
            const vaccine = UZ_VACCINE_SCHEDULE.find(
              (v) => v.name === r.vaccine_name,
            );
            return {
              ...r,
              scheduledDate: r.scheduled_date,
              offsetDays: vaccine ? vaccine.offsetDays : 0,
            };
          });

          const updated = applyRelativeScheduling(
            enriched,
            currentIdx,
            takenDate,
          );

          for (let i = currentIdx + 1; i < updated.length; i++) {
            if (updated[i].scheduledDate !== allRecords[i].scheduled_date) {
              const { error: updateErr } = await supabase
                .from("vaccination_records")
                .update({
                  scheduled_date: updated[i].scheduledDate,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", allRecords[i].id);

              if (updateErr)
                console.error("[vaccination] reschedule error:", updateErr);
              break;
            }
          }
        }
      }
    } else {
      // Uncheck: restore to pending (Req 6.6)
      const { error } = await supabase
        .from("vaccination_records")
        .update({
          taken_date: null,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordId);

      if (error) throw error;
    }
  } catch (err) {
    console.error("toggleVaccine error:", err);
    if (window.showToast) window.showToast("Xatolik yuz berdi", "error");
  }
}

/* ======================
   TOGGLE UI
====================== */
function toggleList(show) {
  const list = document.getElementById("vaccinationList");
  const hint = document.getElementById("vaccinationHint");

  if (list) list.style.display = show ? "block" : "none";
  if (hint) hint.style.display = show ? "none" : "block";
}
