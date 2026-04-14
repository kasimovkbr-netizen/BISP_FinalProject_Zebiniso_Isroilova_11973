// family.module.js
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";
import { t } from "./i18n.js";

let userId = null;
let children = [];

export async function initFamilyModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  userId = session.user.id;
  const { data } = await supabase
    .from("children")
    .select("id,name")
    .eq("parent_id", userId);
  children = data || [];
  renderShell();
  setupTabs();
}

export function destroyFamilyModule() {
  userId = null;
  children = [];
}

function childOpts() {
  return `<option value="">— ${t("select_child")} —</option>${children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}`;
}

function renderShell() {
  const page = document.querySelector(".family-page");
  if (!page) return;
  page.innerHTML = `
    <div class="adm-header">
      <div class="adm-title">👨‍👩‍👧 ${t("family_title")}</div>
      <div class="adm-sub">${t("family_subtitle")}</div>
    </div>
    <div class="adm-tabs" id="famTabs">
      <button class="adm-tab active" data-tab="pediatrician">${t("pediatrician")}</button>
      <button class="adm-tab" data-tab="bloodtype">${t("blood_type")}</button>
      <button class="adm-tab" data-tab="notes">${t("daily_notes")}</button>
    </div>
    <div id="famContent"></div>
  `;
}

function setupTabs() {
  document.querySelectorAll("#famTabs .adm-tab").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document
        .querySelectorAll("#famTabs .adm-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      await loadTab(btn.dataset.tab);
    });
  });
  loadTab("pediatrician");
}

async function loadTab(tab) {
  const el = document.getElementById("famContent");
  if (!el) return;
  el.innerHTML = `<div class="adm-loading">⏳ ${t("loading")}...</div>`;
  switch (tab) {
    case "pediatrician":
      await renderPediatrician(el);
      break;
    case "bloodtype":
      await renderBloodType(el);
      break;
    case "notes":
      await renderNotes(el);
      break;
  }
}

// ─── EMERGENCY CONTACTS ───────────────────────────────────────────────────────
async function renderEmergency(el) {
  const { data } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🆘 ${t("emergency_contacts")}</div>
      <form id="ecForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>${t("name")} *</label><input type="text" id="ecName" placeholder="${t("name")}" required /></div>
          <div><label>${t("relationship")}</label><input type="text" id="ecRel" placeholder="${t("relationship")}" /></div>
          <div><label>${t("phone")} *</label><input type="tel" id="ecPhone" placeholder="+998901234567" required /></div>
        </div>
        <button type="submit" class="adm-btn-primary">➕ ${t("add_btn")}</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>${t("name")}</th><th>${t("relationship")}</th><th>${t("phone")}</th><th></th></tr></thead>
          <tbody id="ecList">
            ${(data || [])
              .map(
                (r) => `<tr>
              <td><strong>${r.name}</strong></td>
              <td>${r.relationship || "—"}</td>
              <td><a href="tel:${r.phone}">${r.phone}</a></td>
              <td><button class="adm-btn-sm red" onclick="window.__famDel('emergency_contacts','${r.id}',this)">🗑</button></td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("ecForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: userId,
      name: document.getElementById("ecName").value.trim(),
      relationship: document.getElementById("ecRel").value.trim() || null,
      phone: document.getElementById("ecPhone").value.trim(),
    });
    if (error) {
      toast(t("error") + ": " + error.message, "error");
      return;
    }
    toast("✅ " + t("success"), "success");
    await renderEmergency(el);
  });
}

// ─── PEDIATRICIAN ─────────────────────────────────────────────────────────────
async function renderPediatrician(el) {
  const { data } = await supabase
    .from("pediatrician_info")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">👨‍⚕️ ${t("pediatrician_doctors")}</div>
      <form id="pedForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>${t("name")} *</label><input type="text" id="pedName" placeholder="Dr. Smith" required /></div>
          <div><label>${t("clinic")}</label><input type="text" id="pedClinic" placeholder="${t("clinic")}" /></div>
          <div><label>${t("phone")}</label><input type="tel" id="pedPhone" placeholder="+998..." /></div>
          <div><label>${t("address")}</label><input type="text" id="pedAddr" placeholder="${t("address")}" /></div>
        </div>
        <button type="submit" class="adm-btn-primary">➕ ${t("add_btn")}</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>${t("name")}</th><th>${t("clinic")}</th><th>${t("phone")}</th><th>${t("address")}</th><th></th></tr></thead>
          <tbody>${(data || [])
            .map(
              (r) => `<tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.clinic || "—"}</td>
            <td>${r.phone ? `<a href="tel:${r.phone}">${r.phone}</a>` : "—"}</td>
            <td>${r.address || "—"}</td>
            <td><button class="adm-btn-sm red" onclick="window.__famDel('pediatrician_info','${r.id}',this)">🗑</button></td>
          </tr>`,
            )
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("pedForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("pediatrician_info").insert({
      user_id: userId,
      name: document.getElementById("pedName").value.trim(),
      clinic: document.getElementById("pedClinic").value.trim() || null,
      phone: document.getElementById("pedPhone").value.trim() || null,
      address: document.getElementById("pedAddr").value.trim() || null,
    });
    if (error) {
      toast(t("error") + ": " + error.message, "error");
      return;
    }
    toast("✅ " + t("success"), "success");
    await renderPediatrician(el);
  });
}

// ─── INSURANCE ────────────────────────────────────────────────────────────────
async function renderInsurance(el) {
  const { data } = await supabase
    .from("insurance_info")
    .select("*")
    .eq("user_id", userId)
    .single()
    .catch(() => ({ data: null }));
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🛡️ ${t("insurance_info")}</div>
      <form id="insForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>${t("insurance_company")}</label><input type="text" id="insProvider" value="${data?.provider || ""}" placeholder="${t("insurance_company")}" /></div>
          <div><label>${t("policy_number")}</label><input type="text" id="insPolicy" value="${data?.policy_number || ""}" placeholder="INS-12345" /></div>
          <div><label>${t("valid_until")}</label><input type="date" id="insValid" value="${data?.valid_until || ""}" /></div>
        </div>
        <textarea id="insCoverage" placeholder="${t("coverage_notes")}" rows="3">${data?.coverage_notes || ""}</textarea>
        <button type="submit" class="adm-btn-primary">💾 ${t("save_btn")}</button>
      </form>
    </div>
  `;
  document.getElementById("insForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      user_id: userId,
      provider: document.getElementById("insProvider").value.trim() || null,
      policy_number: document.getElementById("insPolicy").value.trim() || null,
      valid_until: document.getElementById("insValid").value || null,
      coverage_notes:
        document.getElementById("insCoverage").value.trim() || null,
    };
    const { error } = data
      ? await supabase
          .from("insurance_info")
          .update(payload)
          .eq("user_id", userId)
      : await supabase.from("insurance_info").insert(payload);
    if (error) {
      toast(t("error") + ": " + error.message, "error");
      return;
    }
    toast("✅ " + t("success"), "success");
  });
}

// ─── BLOOD TYPE ───────────────────────────────────────────────────────────────
async function renderBloodType(el) {
  const { data } = await supabase
    .from("blood_type_records")
    .select("*")
    .eq("user_id", userId);
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🩸 ${t("blood_type_title")}</div>
      <form id="btForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>${t("select_child")}</label><select id="btChild">${childOpts()}</select></div>
          <div><label>${t("blood_type")} *</label>
            <select id="btType" required>
              <option value="">${t("select_gender").replace("gender", "")}</option>
              ${["O", "A", "B", "AB"].map((tp) => `<option value="${tp}">${tp}</option>`).join("")}
            </select>
          </div>
          <div><label>${t("rh_factor")}</label>
            <select id="btRh">
              <option value="+">Rh+ (${t("positive")})</option>
              <option value="-">Rh- (${t("negative")})</option>
            </select>
          </div>
        </div>
        <button type="submit" class="adm-btn-primary">💾 ${t("save_btn")}</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>${t("select_child")}</th><th>${t("blood_type")}</th><th>Rh</th><th></th></tr></thead>
          <tbody>${(data || [])
            .map((r) => {
              const child = children.find((c) => c.id === r.child_id);
              return `<tr>
              <td>${child?.name || t("mh_title")}</td>
              <td><span class="adm-badge red">${r.blood_type}</span></td>
              <td><span class="adm-badge ${r.rh_factor === "+" ? "blue" : "gray"}">${r.rh_factor}</span></td>
              <td><button class="adm-btn-sm red" onclick="window.__famDel('blood_type_records','${r.id}',this)">🗑</button></td>
            </tr>`;
            })
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("btForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("blood_type_records").insert({
      user_id: userId,
      child_id: document.getElementById("btChild").value || null,
      blood_type: document.getElementById("btType").value,
      rh_factor: document.getElementById("btRh").value,
    });
    if (error) {
      toast(t("error") + ": " + error.message, "error");
      return;
    }
    toast("✅ " + t("success"), "success");
    await renderBloodType(el);
  });
}

// ─── HEALTH GOALS ─────────────────────────────────────────────────────────────
async function renderGoals(el) {
  const { data } = await supabase
    .from("health_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🎯 ${t("health_goals_title")}</div>
      <form id="goalForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>${t("select_child")}</label><select id="goalChild">${childOpts()}</select></div>
          <div><label>${t("goal_type")} *</label><input type="text" id="goalType" placeholder="${t("goal_type")}" required /></div>
          <div><label>${t("target")}</label><input type="text" id="goalTarget" placeholder="${t("target")}" /></div>
          <div><label>${t("due_date")}</label><input type="date" id="goalDue" /></div>
        </div>
        <button type="submit" class="adm-btn-primary">➕ ${t("add_btn")}</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>${t("goals")}</th><th>${t("select_child")}</th><th>${t("due_date")}</th><th>${t("status")}</th><th></th></tr></thead>
          <tbody>${(data || [])
            .map((r) => {
              const child = children.find((c) => c.id === r.child_id);
              return `<tr>
              <td>${r.goal_type}${r.target ? ` — ${r.target}` : ""}</td>
              <td>${child?.name || "—"}</td>
              <td>${r.due_date || "—"}</td>
              <td>
                <button class="adm-btn-sm ${r.achieved ? "green" : "gray"}" onclick="window.__goalToggle('${r.id}',${r.achieved})">
                  ${r.achieved ? "✅ " + t("achieved") : "⏳ " + t("in_progress")}
                </button>
              </td>
              <td><button class="adm-btn-sm red" onclick="window.__famDel('health_goals','${r.id}',this)">🗑</button></td>
            </tr>`;
            })
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("goalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("health_goals").insert({
      user_id: userId,
      child_id: document.getElementById("goalChild").value || null,
      goal_type: document.getElementById("goalType").value.trim(),
      target: document.getElementById("goalTarget").value.trim() || null,
      due_date: document.getElementById("goalDue").value || null,
    });
    if (error) {
      toast(t("error") + ": " + error.message, "error");
      return;
    }
    toast("✅ " + t("success"), "success");
    await renderGoals(el);
  });
  window.__goalToggle = async (id, current) => {
    await supabase
      .from("health_goals")
      .update({ achieved: !current })
      .eq("id", id);
    await renderGoals(el);
  };
}

// ─── DAILY NOTES ──────────────────────────────────────────────────────────────
async function renderNotes(el) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_notes")
    .select("*, children(name)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(30);
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">📝 ${t("daily_notes_title")}</div>
      <form id="noteForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>${t("select_child")}</label><select id="noteChild">${childOpts()}</select></div>
          <div><label>${t("date")}</label><input type="date" id="noteDate" value="${today}" /></div>
          <div><label>${t("mood")}</label>
            <select id="noteMood">
              <option value="">—</option>
              <option value="great">😊 ${t("great")}</option>
              <option value="good">🙂 ${t("good_rating")}</option>
              <option value="neutral">😐 ${t("neutral")}</option>
              <option value="bad">😟 ${t("bad")}</option>
            </select>
          </div>
        </div>
        <textarea id="noteText" placeholder="${t("todays_observations")}" rows="3" required></textarea>
        <button type="submit" class="adm-btn-primary">💾 ${t("save_btn")}</button>
      </form>
      <div style="margin-top:20px;">
        ${(data || [])
          .map(
            (r) => `
          <div class="adm-section" style="margin-bottom:12px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-weight:600;color:#1e293b;">${r.date} ${r.children?.name ? `— ${r.children.name}` : ""}</span>
              <div>
                ${r.mood ? `<span class="adm-badge gray">${r.mood}</span>` : ""}
                <button class="adm-btn-sm red" style="margin-left:8px;" onclick="window.__famDel('daily_notes','${r.id}',this)">🗑</button>
              </div>
            </div>
            <p style="font-size:14px;color:#475569;margin:0;">${r.note}</p>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
  document.getElementById("noteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("daily_notes").insert({
      user_id: userId,
      child_id: document.getElementById("noteChild").value || null,
      date: document.getElementById("noteDate").value,
      mood: document.getElementById("noteMood").value || null,
      note: document.getElementById("noteText").value.trim(),
    });
    if (error) {
      toast(t("error") + ": " + error.message, "error");
      return;
    }
    toast("✅ " + t("success"), "success");
    await renderNotes(el);
  });
}

// ─── Global delete (no confirm() — uses toast pattern) ────────────────────────
window.__famDel = async (table, id, btn) => {
  // Show inline confirmation via toast
  const confirmed = await new Promise((resolve) => {
    const toastEl = document.createElement("div");
    toastEl.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:14px 20px;border-radius:12px;z-index:9999;display:flex;gap:12px;align-items:center;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,0.3);";
    toastEl.innerHTML = `<span>${t("confirm_delete")}</span><button id="cfYes" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:600;">${t("yes")}</button><button id="cfNo" style="background:#475569;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;">${t("no")}</button>`;
    document.body.appendChild(toastEl);
    toastEl.querySelector("#cfYes").onclick = () => {
      toastEl.remove();
      resolve(true);
    };
    toastEl.querySelector("#cfNo").onclick = () => {
      toastEl.remove();
      resolve(false);
    };
    setTimeout(() => {
      toastEl.remove();
      resolve(false);
    }, 5000);
  });
  if (!confirmed) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    toast(t("error") + ": " + error.message, "error");
    return;
  }
  toast("✅ " + t("delete"), "success");
  btn?.closest("tr")?.remove();
};

// ─── PREGNANCY RECORDS ────────────────────────────────────────────────────────
export async function renderPregnancyRecords(el, userId) {
  const { data } = await supabase
    .from("pregnancy_records")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🤰 ${t("period_title")}</div>
      <form id="pregForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>${t("due_date")}</label><input type="date" id="prDue" /></div>
          <div><label>${t("period_start")}</label><input type="date" id="prLast" /></div>
          <div><label>${t("name")}</label><input type="text" id="prDoctor" placeholder="Dr. Smith" /></div>
          <div><label>${t("clinic")}</label><input type="text" id="prHospital" placeholder="${t("clinic")}" /></div>
        </div>
        <textarea id="prNotes" placeholder="${t("symptoms_placeholder")}" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 ${t("save_btn")}</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>${t("due_date")}</th><th>${t("name")}</th><th>${t("clinic")}</th><th>${t("status")}</th><th></th></tr></thead>
          <tbody>${(data || [])
            .map(
              (r) => `<tr>
            <td>${r.due_date || "—"}</td>
            <td>${r.doctor || "—"}</td>
            <td>${r.hospital || "—"}</td>
            <td><span class="adm-badge ${r.status === "active" ? "green" : "gray"}">${r.status}</span></td>
            <td><button class="adm-btn-sm red" onclick="window.__famDel('pregnancy_records','${r.id}',this)">🗑</button></td>
          </tr>`,
            )
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("pregForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("pregnancy_records").insert({
      user_id: userId,
      due_date: document.getElementById("prDue").value || null,
      last_period: document.getElementById("prLast").value || null,
      doctor: document.getElementById("prDoctor").value.trim() || null,
      hospital: document.getElementById("prHospital").value.trim() || null,
      notes: document.getElementById("prNotes").value.trim() || null,
    });
    if (error) {
      toast(t("error") + ": " + error.message, "error");
      return;
    }
    toast("✅ " + t("success"), "success");
    await renderPregnancyRecords(el, userId);
  });
}

// ─── SUPPORT TICKET ───────────────────────────────────────────────────────────
export async function renderSupportTicket(el, userId) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🎫 ${t("send_feedback")}</div>
      <form id="ticketForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>${t("subject")} *</label><input type="text" id="tkSubject" placeholder="${t("subject")}" required /></div>
          <div><label>${t("category")}</label>
            <select id="tkPriority">
              <option value="low">${t("poor_rating")}</option>
              <option value="normal" selected>${t("average_rating")}</option>
              <option value="high">${t("good_rating")}</option>
              <option value="urgent">${t("excellent")}</option>
            </select>
          </div>
        </div>
        <textarea id="tkMessage" placeholder="${t("write_feedback")}" rows="4" required></textarea>
        <button type="submit" class="adm-btn-primary">📤 ${t("send")}</button>
      </form>
    </div>
  `;
  document
    .getElementById("ticketForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        subject: document.getElementById("tkSubject").value.trim(),
        message: document.getElementById("tkMessage").value.trim(),
        priority: document.getElementById("tkPriority").value,
      });
      if (error) {
        toast(t("error") + ": " + error.message, "error");
        return;
      }
      toast("✅ " + t("feedback_sent"), "success");
      document.getElementById("ticketForm").reset();
    });
}
