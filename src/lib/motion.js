let observer = null;

export function markReveal(element) {
  if (!element) {
    return;
  }
  element.classList.add("reveal");
}

export function initReveal(root = document) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = root.querySelectorAll(".reveal");

  if (observer) {
    observer.disconnect();
  }

  if (reduced) {
    targets.forEach((node) => node.classList.add("is-visible"));
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

  targets.forEach((node) => observer.observe(node));
}
