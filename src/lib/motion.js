let observer = null;
let revealFallbackTimer = 0;

export function markReveal(element) {
  if (!element) {
    return;
  }
  element.classList.add("reveal");
}

export function initReveal(root = document) {
  const targets = Array.from(root.querySelectorAll(".reveal"));

  if (revealFallbackTimer) {
    window.clearTimeout(revealFallbackTimer);
    revealFallbackTimer = 0;
  }

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (!targets.length) {
    return;
  }

  requestAnimationFrame(() => {
    targets.forEach((node) => node.classList.add("is-visible"));
  });
}
