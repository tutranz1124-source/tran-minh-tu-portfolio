export function parseValue(valueRaw) {
  if (valueRaw === null || valueRaw === undefined) {
    return { num: null, suffix: "" };
  }

  if (typeof valueRaw === "number" && Number.isFinite(valueRaw)) {
    return { num: valueRaw, suffix: "" };
  }

  const source = String(valueRaw).trim();
  if (!source) {
    return { num: null, suffix: "" };
  }

  const match = source.match(/^(-?[\d,.]+)(.*)$/);
  if (!match) {
    return { num: null, suffix: source };
  }

  const parsed = Number.parseFloat(match[1].replace(/,/g, ""));
  return {
    num: Number.isFinite(parsed) ? parsed : null,
    suffix: match[2]?.trim() ?? "",
  };
}

export function animateValue(el, num, suffix = "", durationMs = 1000) {
  const start = performance.now();
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: num >= 10 ? 0 : 1,
  });

  function tick(now) {
    const progress = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = num * eased;
    el.textContent = `${formatter.format(current)}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

export function initCountUp(containerEl) {
  if (!containerEl) {
    return;
  }

  const targets = Array.from(containerEl.querySelectorAll("[data-countup]"));

  if (targets.length === 0) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const node = entry.target;
        if (node.dataset.counted === "true") {
          obs.unobserve(node);
          return;
        }

        const animate = node.dataset.animate === "true";
        const display = node.dataset.display || "";
        const duration = Number.parseInt(node.dataset.duration || "1000", 10);

        if (!animate) {
          node.textContent = display;
        } else {
          const parsed = Number.parseFloat(node.dataset.valueNum || "");
          const suffix = node.dataset.valueSuffix || "";
          if (Number.isFinite(parsed)) {
            animateValue(node, parsed, suffix, Math.min(Math.max(duration, 900), 1200));
          } else {
            const fallback = parseValue(display);
            if (fallback.num !== null) {
              animateValue(node, fallback.num, fallback.suffix, Math.min(Math.max(duration, 900), 1200));
            } else {
              node.textContent = display;
            }
          }
        }

        node.dataset.counted = "true";
        obs.unobserve(node);
      });
    },
    { threshold: 0.35 },
  );

  targets.forEach((target) => observer.observe(target));
}
