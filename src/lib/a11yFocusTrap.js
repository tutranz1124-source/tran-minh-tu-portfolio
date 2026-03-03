const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusable(dialogEl) {
  if (!dialogEl) {
    return [];
  }

  return Array.from(dialogEl.querySelectorAll(FOCUSABLE_SELECTOR)).filter((item) => {
    return !item.hasAttribute("disabled") && item.getAttribute("aria-hidden") !== "true";
  });
}

export function trapFocus(dialogEl) {
  if (!dialogEl) {
    return () => {};
  }

  const focusable = getFocusable(dialogEl);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const keyHandler = (event) => {
    if (event.key !== "Tab") {
      return;
    }

    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last?.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  dialogEl.addEventListener("keydown", keyHandler);
  first?.focus();

  return () => {
    dialogEl.removeEventListener("keydown", keyHandler);
  };
}
