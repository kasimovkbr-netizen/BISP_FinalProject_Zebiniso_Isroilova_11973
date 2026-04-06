/**
 * PediaMom — Toast notification utility
 * Usage: import { toast } from './toast.js';
 *        toast('Message here');
 *        toast('Error!', 'error');
 *        toast('Info', 'info');
 */

let _container = null;

function getContainer() {
  if (_container && document.body.contains(_container)) return _container;

  _container = document.createElement("div");
  _container.id = "pm-toast-container";
  document.body.appendChild(_container);
  return _container;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration  ms before auto-dismiss (default 3500)
 */
export function toast(message, type = "success", duration = 3500) {
  const container = getContainer();

  const el = document.createElement("div");
  el.className = `pm-toast pm-toast--${type}`;

  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  el.innerHTML = `
        <span class="pm-toast__icon">${icons[type] ?? "ℹ️"}</span>
        <span class="pm-toast__msg">${escapeHtml(message)}</span>
        <button class="pm-toast__close" aria-label="Close">✕</button>
    `;

  el.querySelector(".pm-toast__close").onclick = () => dismiss(el);
  container.appendChild(el);

  // Animate in
  requestAnimationFrame(() => el.classList.add("pm-toast--visible"));

  // Auto dismiss
  const timer = setTimeout(() => dismiss(el), duration);
  el._timer = timer;

  return el;
}

function dismiss(el) {
  clearTimeout(el._timer);
  el.classList.remove("pm-toast--visible");
  el.addEventListener("transitionend", () => el.remove(), { once: true });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
