const GROUP_SELECTOR = ".experience-tile__media-bubbles, .exp-carousel__media-bubbles";
const BUBBLE_SELECTOR = ".experience-tile__media-bubble, .exp-carousel__media-bubble";
const RESTITUTION = 0.94;
const SPEED_MULTIPLIER = 0.9;
const MIN_SPEED = 18;
const MAX_SPEED = 34;
const MAX_FRAME_STEP_MS = 1000 / 24;

let groups = [];
let rafId = 0;
let lastTickMs = 0;
let resizeObserver = null;
let visibilityObserver = null;
let activityObserver = null;

function setGroupBubbleActive(group, isActive) {
  if (!group?.container?.isConnected) {
    return;
  }
  const nextValue = isActive ? "true" : "false";
  if (group.container.getAttribute("data-bubbles-active") === nextValue) {
    return;
  }
  group.container.setAttribute("data-bubbles-active", nextValue);
}

function resolveStandaloneActiveGroup(preferredGroup = null) {
  const standaloneGroups = groups.filter((group) => !group.carouselGroup && group.container.isConnected && group.visible !== false);
  if (!standaloneGroups.length) {
    return;
  }

  const activeGroup = standaloneGroups.includes(preferredGroup)
    ? preferredGroup
    : standaloneGroups.find((group) => group.host?.matches?.(":hover, :focus-within"))
      || null;

  standaloneGroups.forEach((group) => {
    setGroupBubbleActive(group, group === activeGroup);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percentVarToRatio(el, name, fallbackRatio) {
  const raw = (el.style.getPropertyValue(name) || "").trim();
  const match = raw.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (!match) {
    return fallbackRatio;
  }
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) {
    return fallbackRatio;
  }
  return value / 100;
}

function updateGroupBounds(group) {
  const width = Math.max(1, group.container.clientWidth);
  const height = Math.max(1, group.container.clientHeight);
  const changed = width !== group.width || height !== group.height || group.dirty;
  group.width = width;
  group.height = height;
  group.dirty = false;

  if (!changed) {
    return;
  }

  group.bubbles.forEach((bubble) => {
    const measuredRadius = Math.max(8, Math.min(bubble.el.offsetWidth, bubble.el.offsetHeight) * 0.5);
    bubble.r = measuredRadius;
    bubble.mass = Math.max(1, measuredRadius * measuredRadius * 0.01);
    bubble.x = clamp(bubble.x, measuredRadius, Math.max(measuredRadius, width - measuredRadius));
    bubble.y = clamp(bubble.y, measuredRadius, Math.max(measuredRadius, height - measuredRadius));
  });

  resolveOverlaps(group.bubbles, width, height);
}

function resetGroupToSeededLayout(group) {
  const width = Math.max(1, group.container.clientWidth);
  const height = Math.max(1, group.container.clientHeight);

  group.width = width;
  group.height = height;
  group.dirty = false;

  group.bubbles.forEach((bubble) => {
    const measuredRadius = Math.max(8, Math.min(bubble.el.offsetWidth, bubble.el.offsetHeight) * 0.5);
    bubble.r = measuredRadius;
    bubble.mass = Math.max(1, measuredRadius * measuredRadius * 0.01);
    bubble.x = clamp(bubble.xRatio * width, measuredRadius, Math.max(measuredRadius, width - measuredRadius));
    bubble.y = clamp(bubble.yRatio * height, measuredRadius, Math.max(measuredRadius, height - measuredRadius));
    bubble.renderX = Number.NaN;
    bubble.renderY = Number.NaN;
  });

  resolveOverlaps(group.bubbles, width, height);
  renderGroup(group);
  group.staticRendered = true;
}

function isGroupActive(group) {
  const flag = group.container.getAttribute("data-bubbles-active");
  return flag !== "false";
}

function isGroupRenderable(group) {
  return Boolean(group?.container?.isConnected) && group.visible !== false && isGroupActive(group);
}

function createBubbleState(el, index, width, height) {
  const r = Math.max(8, Math.min(el.offsetWidth, el.offsetHeight) * 0.5 || 20);
  const xRatio = percentVarToRatio(el, "--bubble-x-start", 0.2 + (index * 0.3));
  const yRatio = percentVarToRatio(el, "--bubble-y-start", 0.2 + (index * 0.2));
  const x = clamp(xRatio * width, r, Math.max(r, width - r));
  const y = clamp(yRatio * height, r, Math.max(r, height - r));

  const angle = ((index + 1) * 2.399963229728653) % (Math.PI * 2);
  const speedBase = MIN_SPEED + ((index * 7) % 11) + (Math.abs(Math.sin(index + 1)) * (MAX_SPEED - MIN_SPEED - 11));
  const speed = speedBase * SPEED_MULTIPLIER;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  return {
    el,
    x,
    y,
    xRatio,
    yRatio,
    vx,
    vy,
    r,
    mass: Math.max(1, r * r * 0.01),
  };
}

function resolveOverlaps(bubbles, width, height) {
  for (let loop = 0; loop < 4; loop += 1) {
    for (let i = 0; i < bubbles.length; i += 1) {
      const a = bubbles[i];
      for (let j = i + 1; j < bubbles.length; j += 1) {
        const b = bubbles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distanceSq = (dx * dx) + (dy * dy);
        const minDistance = a.r + b.r;
        if (distanceSq >= minDistance * minDistance) {
          continue;
        }

        const distance = Math.sqrt(distanceSq) || 0.0001;
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        const correction = overlap * 0.5;

        a.x -= nx * correction;
        a.y -= ny * correction;
        b.x += nx * correction;
        b.y += ny * correction;

        a.x = clamp(a.x, a.r, Math.max(a.r, width - a.r));
        a.y = clamp(a.y, a.r, Math.max(a.r, height - a.r));
        b.x = clamp(b.x, b.r, Math.max(b.r, width - b.r));
        b.y = clamp(b.y, b.r, Math.max(b.r, height - b.r));
      }
    }
  }
}

function integrateGroup(group, dtSec) {
  const width = group.width;
  const height = group.height;

  group.bubbles.forEach((bubble) => {
    bubble.x += bubble.vx * dtSec;
    bubble.y += bubble.vy * dtSec;

    if (bubble.x - bubble.r <= 0) {
      bubble.x = bubble.r;
      bubble.vx = Math.abs(bubble.vx);
    } else if (bubble.x + bubble.r >= width) {
      bubble.x = width - bubble.r;
      bubble.vx = -Math.abs(bubble.vx);
    }

    if (bubble.y - bubble.r <= 0) {
      bubble.y = bubble.r;
      bubble.vy = Math.abs(bubble.vy);
    } else if (bubble.y + bubble.r >= height) {
      bubble.y = height - bubble.r;
      bubble.vy = -Math.abs(bubble.vy);
    }
  });

  for (let i = 0; i < group.bubbles.length; i += 1) {
    const a = group.bubbles[i];
    for (let j = i + 1; j < group.bubbles.length; j += 1) {
      const b = group.bubbles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distanceSq = (dx * dx) + (dy * dy);
      const minDistance = a.r + b.r;
      if (distanceSq >= minDistance * minDistance) {
        continue;
      }

      const distance = Math.sqrt(distanceSq) || 0.0001;
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;
      const totalMass = a.mass + b.mass;
      const moveA = (overlap * (b.mass / totalMass));
      const moveB = (overlap * (a.mass / totalMass));

      a.x -= nx * moveA;
      a.y -= ny * moveA;
      b.x += nx * moveB;
      b.y += ny * moveB;

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velocityAlongNormal = (rvx * nx) + (rvy * ny);
      if (velocityAlongNormal < 0) {
        const impulse = (-(1 + RESTITUTION) * velocityAlongNormal) / ((1 / a.mass) + (1 / b.mass));
        a.vx -= (impulse * nx) / a.mass;
        a.vy -= (impulse * ny) / a.mass;
        b.vx += (impulse * nx) / b.mass;
        b.vy += (impulse * ny) / b.mass;
      }

      a.x = clamp(a.x, a.r, Math.max(a.r, width - a.r));
      a.y = clamp(a.y, a.r, Math.max(a.r, height - a.r));
      b.x = clamp(b.x, b.r, Math.max(b.r, width - b.r));
      b.y = clamp(b.y, b.r, Math.max(b.r, height - b.r));
    }
  }
}

function renderGroup(group) {
  group.bubbles.forEach((bubble) => {
    const tx = bubble.x - bubble.r;
    const ty = bubble.y - bubble.r;
    if (Math.abs((bubble.renderX ?? Number.NaN) - tx) < 0.08 && Math.abs((bubble.renderY ?? Number.NaN) - ty) < 0.08) {
      return;
    }
    bubble.renderX = tx;
    bubble.renderY = ty;
    bubble.el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
  });
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  lastTickMs = 0;
}

function hasRenderableGroups() {
  return groups.some((group) => isGroupRenderable(group));
}

function ensureLoop() {
  if (!rafId && hasRenderableGroups()) {
    rafId = requestAnimationFrame(tick);
  }
}

function tick(nowMs) {
  rafId = 0;

  if (!groups.length) {
    rafId = 0;
    lastTickMs = 0;
    return;
  }

  groups = groups.filter((group) => group.container.isConnected);
  if (!groups.length || !hasRenderableGroups()) {
    stopLoop();
    return;
  }

  if (lastTickMs && (nowMs - lastTickMs) < MAX_FRAME_STEP_MS) {
    ensureLoop();
    return;
  }

  const dtSec = lastTickMs
    ? clamp((nowMs - lastTickMs) / 1000, 0.001, 0.034)
    : (1 / 60);
  lastTickMs = nowMs;

  groups.forEach((group) => {
    if (!isGroupRenderable(group)) {
      if (group.wasActive || group.dirty || !group.staticRendered) {
        resetGroupToSeededLayout(group);
      }
      group.wasActive = false;
      return;
    }
    if (!group.wasActive) {
      group.dirty = true;
      group.wasActive = true;
    }
    group.staticRendered = false;
    if (group.dirty) {
      updateGroupBounds(group);
    }
    integrateGroup(group, dtSec);
    renderGroup(group);
  });

  ensureLoop();
}

function teardownGroup(group) {
  group.host?.removeEventListener("pointerenter", group.onPointerEnter);
  group.host?.removeEventListener("pointerleave", group.onPointerLeave);
  group.host?.removeEventListener("focusin", group.onFocusIn);
  group.host?.removeEventListener("focusout", group.onFocusOut);
  group.bubbles.forEach((bubble) => {
    bubble.el.classList.remove("is-physics");
    bubble.el.style.transform = "";
    bubble.el.style.left = "";
    bubble.el.style.top = "";
  });
}

export function destroyBubblePhysics() {
  stopLoop();
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (visibilityObserver) {
    visibilityObserver.disconnect();
    visibilityObserver = null;
  }
  if (activityObserver) {
    activityObserver.disconnect();
    activityObserver = null;
  }

  groups.forEach((group) => teardownGroup(group));
  groups = [];
}

export function initBubblePhysics() {
  destroyBubblePhysics();

  const containers = Array.from(document.querySelectorAll(GROUP_SELECTOR));
  if (!containers.length) {
    return;
  }

  resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target;
        const group = groups.find((item) => item.container === target);
        if (group) {
          group.dirty = true;
          ensureLoop();
        }
      });
    })
    : null;

  visibilityObserver = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const group = groups.find((item) => item.container === entry.target);
        if (!group) {
          return;
        }
        group.visible = entry.isIntersecting;
      });

      resolveStandaloneActiveGroup();

      if (hasRenderableGroups()) {
        ensureLoop();
      } else {
        stopLoop();
      }
    }, {
      root: null,
      rootMargin: "120px 0px 120px 0px",
      threshold: 0.01,
    })
    : null;

  activityObserver = typeof MutationObserver === "function"
    ? new MutationObserver((entries) => {
      if (!entries.length) {
        return;
      }
      if (hasRenderableGroups()) {
        ensureLoop();
      } else {
        stopLoop();
      }
    })
    : null;

  containers.forEach((container) => {
    const bubbleEls = Array.from(container.querySelectorAll(BUBBLE_SELECTOR));
    if (!bubbleEls.length) {
      return;
    }

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const bubbles = bubbleEls.map((el, index) => {
      el.classList.add("is-physics");
      el.style.left = "0px";
      el.style.top = "0px";
      return createBubbleState(el, index, width, height);
    });

    resolveOverlaps(bubbles, width, height);

    const carouselGroup = container.classList.contains("exp-carousel__media-bubbles");
    const host = container.closest(".experience-timeline__card, .experience-tile, .exp-carousel__card");
    const onPointerEnter = () => {
      if (carouselGroup) {
        return;
      }
      resolveStandaloneActiveGroup(groupRef);
      ensureLoop();
    };
    const onPointerLeave = () => {
      if (carouselGroup) {
        return;
      }
      resolveStandaloneActiveGroup();
    };
    const onFocusIn = () => {
      if (carouselGroup) {
        return;
      }
      resolveStandaloneActiveGroup(groupRef);
      ensureLoop();
    };
    const onFocusOut = (event) => {
      if (carouselGroup || host?.contains(event.relatedTarget)) {
        return;
      }
      resolveStandaloneActiveGroup();
    };

    const groupRef = {
      container,
      host,
      bubbles,
      width,
      height,
      dirty: false,
      carouselGroup,
      staticRendered: false,
      wasActive: false,
      visible: true,
      onPointerEnter,
      onPointerLeave,
      onFocusIn,
      onFocusOut,
    };

    if (host && !carouselGroup) {
      host.addEventListener("pointerenter", onPointerEnter, { passive: true });
      host.addEventListener("pointerleave", onPointerLeave, { passive: true });
      host.addEventListener("focusin", onFocusIn);
      host.addEventListener("focusout", onFocusOut);
    }

    groups.push(groupRef);
    setGroupBubbleActive(groupRef, carouselGroup);
    resetGroupToSeededLayout(groupRef);

    resizeObserver?.observe(container);
    visibilityObserver?.observe(container);
    activityObserver?.observe(container, {
      attributes: true,
      attributeFilter: ["data-bubbles-active"],
    });
  });

  if (!groups.length) {
    resizeObserver?.disconnect();
    resizeObserver = null;
    return;
  }

  resolveStandaloneActiveGroup();
  ensureLoop();
}
