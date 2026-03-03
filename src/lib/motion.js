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

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -10% 0px",
    },
  );

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  targets.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.top <= viewportHeight * 1.2) {
      node.classList.add("is-visible");
      return;
    }
    observer.observe(node);
  });

  // Failsafe: reveal remaining sections shortly after paint, no scroll required.
  revealFallbackTimer = window.setTimeout(() => {
    targets.forEach((node) => node.classList.add("is-visible"));
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    revealFallbackTimer = 0;
  }, 260);
}
