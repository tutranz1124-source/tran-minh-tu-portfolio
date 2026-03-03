export function initActiveSectionObserver(sectionIds, onActiveChange) {
  const throttleMs = 80;
  const ids = Array.isArray(sectionIds) ? sectionIds : [];
  const sections = ids
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((item) => item.el);

  if (sections.length === 0) {
    return () => {};
  }

  const states = new Map();
  sections.forEach(({ id }) => {
    states.set(id, { ratio: 0, isIntersecting: false });
  });

  let activeId = "";
  let throttleTimer = null;
  let lastRun = 0;

  function getNavBottom() {
    const navbar = document.getElementById("navbar");
    return navbar ? navbar.getBoundingClientRect().bottom : 0;
  }

  function pickCandidate() {
    const navBottom = getNavBottom();
    let best = null;

    sections.forEach(({ id, el }) => {
      const state = states.get(id) || { ratio: 0, isIntersecting: false };
      if (!state.isIntersecting) {
        return;
      }

      const rect = el.getBoundingClientRect();
      const distance = Math.abs(rect.top - navBottom);
      const score = { id, ratio: state.ratio, distance };

      if (!best) {
        best = score;
        return;
      }

      if (score.ratio > best.ratio) {
        best = score;
        return;
      }

      if (Math.abs(score.ratio - best.ratio) < 0.001 && score.distance < best.distance) {
        best = score;
      }
    });

    if (best) {
      const current = states.get(activeId);
      if (
        activeId
        && current?.isIntersecting
        && current.ratio > 0
        && best.id !== activeId
        && current.ratio >= best.ratio - 0.03
      ) {
        return { id: activeId };
      }
      return { id: best.id };
    }

    let fallbackId = sections[0].id;
    sections.forEach(({ id, el }) => {
      if (el.getBoundingClientRect().top <= navBottom + 1) {
        fallbackId = id;
      }
    });
    return { id: fallbackId };
  }

  function evaluate() {
    lastRun = performance.now();
    throttleTimer = null;

    const candidate = pickCandidate();
    if (!candidate || !candidate.id || candidate.id === activeId) {
      return;
    }

    activeId = candidate.id;
    onActiveChange(candidate.id);
  }

  function scheduleEvaluation() {
    const now = performance.now();
    const elapsed = now - lastRun;
    if (!throttleTimer && elapsed >= throttleMs) {
      evaluate();
      return;
    }

    if (!throttleTimer) {
      const wait = Math.max(0, throttleMs - elapsed);
      throttleTimer = window.setTimeout(evaluate, wait);
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        states.set(entry.target.id, {
          ratio: entry.intersectionRatio,
          isIntersecting: entry.isIntersecting,
        });
      });
      scheduleEvaluation();
    },
    {
      threshold: [0.15, 0.25, 0.4, 0.6, 0.8],
      rootMargin: "-8% 0px -55% 0px",
    },
  );

  sections.forEach(({ el }) => observer.observe(el));

  const passive = { passive: true };
  window.addEventListener("scroll", scheduleEvaluation, passive);
  window.addEventListener("resize", scheduleEvaluation, passive);

  scheduleEvaluation();

  return () => {
    observer.disconnect();
    window.removeEventListener("scroll", scheduleEvaluation, passive);
    window.removeEventListener("resize", scheduleEvaluation, passive);
    if (throttleTimer) {
      window.clearTimeout(throttleTimer);
    }
  };
}
