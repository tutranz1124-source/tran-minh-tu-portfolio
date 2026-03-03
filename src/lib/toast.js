import { el } from "./dom.js";

const region = document.getElementById("toast-region");

export function showToast(message, { type = "info", timeout = 2600 } = {}) {
  if (!region || !message) {
    return;
  }

  const toast = el("div", `toast toast--${type}`);
  toast.textContent = message;
  region.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, timeout);
}
