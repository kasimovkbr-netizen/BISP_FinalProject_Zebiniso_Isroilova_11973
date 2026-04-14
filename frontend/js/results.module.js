// results.module.js
import { supabase } from "./supabase.js";
import { t } from "./i18n.js";

let uid = null;
let realtimeChannel = null;
let trendChart = null;
let currentEditId = null;
let childrenMap = {};
let listenersAttached = false;

/* ======================
   PUBLIC API
====================== */

export async function initResultsModule() {
  const resultsList = document.getElementById("resultsList");
  const childFilter = document.getElementById("childFilter");
  const typeFilter = document.getElementById("typeFilter");

  if (!resultsList || !childFilter || !typeFilter) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  uid = session.user.id;

  await loadChildrenIntoFilter(uid);

  if (!listenersAttached) {
    attachStaticListeners();
    listenersAttached = true;
  }

  await loadResults(uid);
  await updateTrendChart(uid);

  // Realtime subscription
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel("results-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "medical_analyses",
        filter: `parent_id=eq.${uid}`,
      },
      async () => {
        await loadResults(uid);
        await updateTrendChart(uid);
      },
    )
    .subscribe();
}

export function destroyResultsModule() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  if (trendChart) {
    trendChart.destroy();
    trendChart = null;
  }
  uid = null;
  currentEditId = null;
  childrenMap = {};
  listenersAttached = false;
}

/* ======================
   PRETTY PRINTER
====================== */

export function prettyPrintData(dataObj) {
  if (!dataObj || typeof dataObj !== "object") return String(dataObj ?? "");
  return Object.entries(dataObj)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
}

/* ======================
   STATIC LISTENERS
====================== */

function attachStaticListeners() {
  const childFilter = document.getElementById("childFilter");
  const typeFilter = document.getElementById("typeFilter");
  const editForm = document.getElementById("editForm");
  const closeEdit = document.getElementById("closeEdit");
  const overlay = document.getElementById("overlay");

  childFilter?.addEventListener("change", async () => {
    if (!uid) return;
    await loadResults(uid);
    await updateTrendChart(uid);
  });

  typeFilter?.addEventListener("change", async () => {
    if (!uid) return;
    await loadResults(uid);
    await updateTrendChart(uid);
  });

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!uid || !currentEditId) return;

    const formData = new FormData(editForm);
    const updatedData = {};
    formData.forEach((v, k) => (updatedData[k] = Number(v)));

    try {
      const { error } = await supabase
        .from("medical_analyses")
        .update({ data: updatedData })
        .eq("id", currentEditId);
      if (error) throw error;
      closeEditModal();
      showMessage("Analysis updated!", "success");
      await loadResults(uid);
      await updateTrendChart(uid);
    } catch (err) {
      console.error(err);
      showMessage("Error updating analysis!", "error");
    }
  });

  closeEdit?.addEventListener("click", closeEditModal);
  overlay?.addEventListener("click", closeEditModal);
}

/* ======================
   HELPERS
====================== */

function closeEditModal() {
  const editModal = document.getElementById("editModal");
  const overlay = document.getElementById("overlay");
  if (editModal) editModal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}

function showMessage(text, type = "success", duration = 3000) {
  const messageBox = document.getElementById("messageBox");
  if (!messageBox) return;
  const icon = type === "success" ? "✅" : "❌";
  messageBox.innerHTML = `<span class="icon">${icon}</span> ${text}`;
  messageBox.className = type + " show";
  setTimeout(() => messageBox.classList.remove("show"), duration);
}

/* ======================
   LOAD CHILDREN -> FILTER
====================== */

async function loadChildrenIntoFilter(parentId) {
  const childFilter = document.getElementById("childFilter");
  if (!childFilter) return;

  const { data } = await supabase
    .from("children")
    .select("id, name")
    .eq("parent_id", parentId);

  childrenMap = {};
  childFilter.innerHTML = `<option value="">${t("all_children")}</option>`;

  (data || []).forEach((child) => {
    childrenMap[child.id] = child.name;
    const option = document.createElement("option");
    option.value = child.id;
    option.textContent = child.name;
    childFilter.appendChild(option);
  });
}

/* ======================
   LOAD RESULTS
====================== */

async function loadResults(parentId) {
  const resultsList = document.getElementById("resultsList");
  const childFilter = document.getElementById("childFilter");
  const typeFilter = document.getElementById("typeFilter");

  if (!resultsList || !childFilter || !typeFilter) return;

  resultsList.innerHTML = "";

  let query = supabase
    .from("medical_analyses")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });

  if (childFilter.value) query = query.eq("child_id", childFilter.value);
  if (typeFilter.value) query = query.eq("type", typeFilter.value);

  const { data, error } = await query;
  if (error) {
    console.error("loadResults error:", error);
    return;
  }

  (data || []).forEach((result) => {
    if (!childrenMap[result.child_id]) return;

    const li = document.createElement("li");
    const valuesHTML = prettyPrintData(result.data)
      .split(" | ")
      .map((kv) => `<span class="value-chip">${kv}</span>`)
      .join("");

    const aiLabel = t("ai_analysis");
    const recsLabel = t("recommendations");
    const aiHTML = result.ai_result
      ? `
      <div class="ai-result-inline">
        <div class="ai-result-label">🤖 ${aiLabel}</div>
        <p class="ai-result-text">${result.ai_result.interpretation || ""}</p>
        ${
          result.ai_result.recommendations?.length
            ? `
          <ul class="ai-result-recs">
            ${result.ai_result.recommendations.map((r) => `<li>${r}</li>`).join("")}
          </ul>`
            : ""
        }
        <div class="ai-result-date">📅 ${result.ai_analyzed_at ? new Date(result.ai_analyzed_at).toLocaleDateString() : ""}</div>
      </div>`
      : "";

    li.innerHTML = `
      <div class="info">
        <div class="card-header">
          <span class="child-name">${childrenMap[result.child_id]}</span>
          <span class="type-badge ${result.type}">${result.type}</span>
        </div>
        <div class="values">${valuesHTML}</div>
        ${aiHTML}
        <div class="date">📅 ${result.created_at ? new Date(result.created_at).toLocaleString() : "N/A"}</div>
      </div>
      <div class="actions">
        <button data-id="${result.id}" class="editBtn">✏️ ${t("edit")}</button>
        <button data-id="${result.id}" class="deleteBtn">🗑 ${t("delete")}</button>
      </div>
    `;
    resultsList.appendChild(li);
  });

  bindEditButtons(data || []);
  bindDeleteButtons(parentId);
}

/* ======================
   EDIT / DELETE BUTTONS
====================== */

function bindEditButtons(results) {
  const editModal = document.getElementById("editModal");
  const overlay = document.getElementById("overlay");
  const editFields = document.getElementById("editFields");

  if (!editModal || !overlay || !editFields) return;

  document.querySelectorAll(".editBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const result = results.find((r) => r.id === id);
      if (!result) return;

      currentEditId = id;
      editFields.innerHTML = "";

      Object.entries(result.data || {}).forEach(([key, val]) => {
        const div = document.createElement("div");
        div.innerHTML = `<label>${key}:</label><input type="number" name="${key}" value="${val}" required>`;
        editFields.appendChild(div);
      });

      editModal.style.display = "block";
      overlay.style.display = "block";
    });
  });
}

function bindDeleteButtons(parentId) {
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      // Use global confirm modal instead of browser confirm()
      const confirmed = await new Promise((resolve) => {
        const modal = document.getElementById("confirmModal");
        const text = document.getElementById("confirmText");
        const yesBtn = document.getElementById("confirmYes");
        const noBtn = document.getElementById("confirmNo");

        if (!modal || !yesBtn || !noBtn) {
          resolve(
            window.confirm("Are you sure you want to delete this analysis?"),
          );
          return;
        }

        if (text) text.textContent = t("delete_analysis_confirm");
        modal.classList.remove("hidden");

        const cleanup = () => {
          modal.classList.add("hidden");
          yesBtn.onclick = null;
          noBtn.onclick = null;
        };
        yesBtn.onclick = () => {
          cleanup();
          resolve(true);
        };
        noBtn.onclick = () => {
          cleanup();
          resolve(false);
        };
      });

      if (!confirmed) return;
      try {
        const { error } = await supabase
          .from("medical_analyses")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await loadResults(parentId);
        await updateTrendChart(parentId);
        showMessage(t("analysis_deleted"), "success");
      } catch (err) {
        console.error(err);
        showMessage("Error deleting analysis!", "error");
      }
    });
  });
}

/* ======================
   CHART
====================== */

const DATASET_COLORS = {
  hemoglobin: "rgba(54, 162, 235, 1)",
  ferritin: "rgba(255, 99, 132, 1)",
  vitaminD: "rgba(255, 159, 64, 1)",
  vitaminB12: "rgba(153, 102, 255, 1)",
};

export function drawTrendChart(results, type) {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const filtered =
    type === "" ? [...results] : results.filter((r) => r.type === type);

  if (filtered.length === 0) {
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
    return null;
  }

  filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const labelSet = [];
  filtered.forEach((r) => {
    const d = new Date(r.created_at);
    const label = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    if (!labelSet.includes(label)) labelSet.push(label);
  });

  const datasetMap = {};
  filtered.forEach((r) => {
    const d = new Date(r.created_at);
    const label = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    const idx = labelSet.indexOf(label);
    Object.entries(r.data || {}).forEach(([key, val]) => {
      if (!datasetMap[key])
        datasetMap[key] = new Array(labelSet.length).fill(null);
      datasetMap[key][idx] = val;
    });
  });

  const chartDatasets = Object.keys(datasetMap).map((key) => ({
    label: key,
    data: datasetMap[key],
    fill: false,
    tension: 0.3,
    borderColor: DATASET_COLORS[key] || "rgba(100, 100, 100, 1)",
    backgroundColor: DATASET_COLORS[key] || "rgba(100, 100, 100, 0.2)",
    spanGaps: true,
  }));

  const chartTitle =
    type === ""
      ? t("all_types_trend")
      : `${type.charAt(0).toUpperCase() + type.slice(1)} Trend`;

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: "line",
    data: { labels: labelSet, datasets: chartDatasets },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: chartTitle },
        legend: { display: true, position: "bottom" },
      },
      scales: { y: { beginAtZero: true } },
    },
  });

  return trendChart;
}

async function updateTrendChart(parentId) {
  const childFilter = document.getElementById("childFilter");
  const typeFilter = document.getElementById("typeFilter");
  const trendHint = document.getElementById("trendHint");

  if (!childFilter || !typeFilter) return;

  if (!childFilter.value) {
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
    if (trendHint) trendHint.style.display = "block";
    return;
  }
  if (trendHint) trendHint.style.display = "none";

  const { data } = await supabase
    .from("medical_analyses")
    .select("*")
    .eq("parent_id", parentId)
    .eq("child_id", childFilter.value);

  const allResults = (data || []).filter((r) => childrenMap[r.child_id]);
  drawTrendChart(allResults, typeFilter.value);
}
