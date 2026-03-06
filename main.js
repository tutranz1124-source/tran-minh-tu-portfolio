import { getLastGoodContent, loadContent, prefetchContent } from "./src/lib/fetchContent.js";
import {
  initFluidBackground,
  randomizeFluidPlayModeColor,
  resetFluidPlayModeColor,
  setFluidPlayMode,
  setFluidTheme,
} from "./src/lib/fluidBackground.js";
import { initExperienceCarousel } from "./src/lib/experienceCarousel.js";
import { initBubblePhysics } from "./src/lib/bubblePhysics.js";
import { initReveal } from "./src/lib/motion.js";
import { initActiveSectionObserver } from "./src/lib/navActive.js";
import { renderApp } from "./src/lib/renderApp.js";
import { getState, initStore, setState, subscribe } from "./src/lib/store.js";
import { showToast } from "./src/lib/toast.js";
import { trapFocus } from "./src/lib/a11yFocusTrap.js";
import { validateContent } from "./src/lib/validateContent.js";

const SECTION_IDS = ["top", "experience", "skills"];
const BOOT_LOADER_ANIM_MS = 1500;
const BOOT_LOADER_TIMEOUT_MS = 12000;

let observerCleanup = null;
let focusTrapCleanup = null;
let stateSnapshot = getState();
let languageRequestSeq = 0;
let navIndicatorController = null;
let popupLastFocused = null;
let popupPanelAnimation = null;
let popupBackdropAnimation = null;
let popupGhostAnimation = null;
let popupGhostEl = null;
let popupSourceEl = null;
let popupMotionStyle = "zoom";
let popupMotionToken = 0;
let contactFabOpen = false;
let loaderDismissed = false;
let loaderFallbackTimer = 0;
let loaderBootReady = false;
let loaderAnimationDone = false;
let loaderAnimationTimer = 0;

const POPUP_OPEN_BACKDROP_DURATION = 200;
const POPUP_OPEN_PANEL_DURATION = 280;
const POPUP_OPEN_PANEL_DELAY = 45;
const POPUP_CLOSE_BACKDROP_DURATION = 160;
const POPUP_CLOSE_PANEL_DURATION = 200;
const POPUP_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const POPUP_REDUCED_DURATION = 140;
const POPUP_SHARED_OPEN_DURATION = 450;
const POPUP_SHARED_CLOSE_DURATION = 420;
const POPUP_SHARED_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const POPUP_SHARED_FADE_DURATION = 160;
const POPUP_SHARED_GHOST_FADE_DURATION = 120;
const POPUP_SHARED_OVERLAY_DURATION = 180;

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function dismissBootLoader(force = false) {
  if (loaderDismissed) {
    return;
  }

  const loader = document.getElementById("page-loader");
  if (!loader) {
    loaderDismissed = true;
    return;
  }

  if (!force && (!loaderBootReady || !loaderAnimationDone)) {
    return;
  }

  loaderDismissed = true;

  if (loaderFallbackTimer) {
    window.clearTimeout(loaderFallbackTimer);
    loaderFallbackTimer = 0;
  }
  if (loaderAnimationTimer) {
    window.clearTimeout(loaderAnimationTimer);
    loaderAnimationTimer = 0;
  }

  loader.classList.add("is-hiding");
  const removeLoader = () => {
    loader.remove();
  };
  loader.addEventListener("transitionend", removeLoader, { once: true });
  window.setTimeout(removeLoader, 520);
}

function markBootReady() {
  loaderBootReady = true;
  dismissBootLoader();
}

function initBootLoaderGate() {
  const loader = document.getElementById("page-loader");
  if (!loader) {
    loaderAnimationDone = true;
    return;
  }

  const completeAnimationGate = () => {
    if (loaderAnimationDone) {
      return;
    }
    loaderAnimationDone = true;
    dismissBootLoader();
  };

  const ringProgress = loader.querySelector(".page-loader__progress");
  if (ringProgress instanceof SVGElement) {
    ringProgress.addEventListener("animationend", completeAnimationGate, { once: true });
  }

  loaderAnimationTimer = window.setTimeout(completeAnimationGate, BOOT_LOADER_ANIM_MS);
}

function setScrollBehavior(reducedMotion) {
  document.documentElement.style.scrollBehavior = reducedMotion ? "auto" : "smooth";
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  const root = document.documentElement;
  root.classList.toggle("theme-light", nextTheme === "light");
  root.classList.toggle("theme-dark", nextTheme === "dark");
  root.setAttribute("data-theme", nextTheme);
}

function initNavIndicator() {
  if (navIndicatorController?.destroy) {
    navIndicatorController.destroy();
  }

  const linksEl = document.getElementById("nav-links");
  const indicator = linksEl?.querySelector(".navbar__indicator");
  const links = Array.from(linksEl?.querySelectorAll(".navbar__link") || []);

  if (!linksEl || !indicator || links.length === 0) {
    navIndicatorController = null;
    return;
  }

  let activeLink = links.find((link) => link.classList.contains("is-active")) || links[0];
  let destroyed = false;

  const setIndicator = (link, immediate = false) => {
    if (!link || destroyed) {
      return;
    }

    const linkRect = link.getBoundingClientRect();
    const parentRect = linksEl.getBoundingClientRect();
    const x = Math.max(0, linkRect.left - parentRect.left);
    const width = Math.max(18, Math.round(linkRect.width));

    if (immediate) {
      indicator.style.transition = "none";
    }

    linksEl.style.setProperty("--ind-x", `${Math.round(x)}px`);
    linksEl.style.setProperty("--ind-w", `${Math.round(width)}px`);
    indicator.classList.add("is-visible");

    if (immediate) {
      requestAnimationFrame(() => {
        if (!destroyed) {
          indicator.style.transition = "";
        }
      });
    }
  };

  const setActiveBySection = (sectionId, immediate = false) => {
    const target = links.find((link) => link.dataset.section === sectionId || link.getAttribute("href") === `#${sectionId}`);
    if (!target) {
      return;
    }

    activeLink = target;
    setIndicator(activeLink, immediate);
  };

  const onPointerOver = (event) => {
    const link = event.target.closest(".navbar__link");
    if (link) {
      setIndicator(link);
    }
  };

  const onPointerLeave = () => {
    setIndicator(activeLink);
  };

  const onFocusIn = (event) => {
    const link = event.target.closest(".navbar__link");
    if (link) {
      setIndicator(link);
    }
  };

  const onFocusOut = (event) => {
    if (event.relatedTarget && linksEl.contains(event.relatedTarget)) {
      return;
    }
    setIndicator(activeLink);
  };

  linksEl.addEventListener("pointerover", onPointerOver);
  linksEl.addEventListener("pointerleave", onPointerLeave);
  linksEl.addEventListener("focusin", onFocusIn);
  linksEl.addEventListener("focusout", onFocusOut);

  const resizeObserver = new ResizeObserver(() => {
    setIndicator(activeLink, true);
  });
  resizeObserver.observe(linksEl);

  document.fonts?.ready?.then(() => {
    setIndicator(activeLink, true);
  });

  setIndicator(activeLink, true);

  navIndicatorController = {
    setActiveBySection,
    refresh(immediate = false) {
      setIndicator(activeLink, immediate);
    },
    destroy() {
      destroyed = true;
      linksEl.removeEventListener("pointerover", onPointerOver);
      linksEl.removeEventListener("pointerleave", onPointerLeave);
      linksEl.removeEventListener("focusin", onFocusIn);
      linksEl.removeEventListener("focusout", onFocusOut);
      resizeObserver.disconnect();
    },
  };
}

function syncNavActive(sectionId) {
  document.querySelectorAll(".navbar__link").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.section === sectionId);
  });

  document.querySelectorAll(".drawer__item").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.section === sectionId);
  });
  navIndicatorController?.setActiveBySection(sectionId);
}

function closeDrawer() {
  setState({ drawerOpen: false });
}

function applyDrawerState(isOpen) {
  const drawer = document.getElementById("mobile-drawer");
  const toggle = document.getElementById("drawer-toggle");
  const panel = drawer?.querySelector(".drawer__panel");

  if (!drawer || !toggle) {
    return;
  }

  drawer.classList.toggle("is-open", isOpen);
  drawer.setAttribute("aria-hidden", isOpen ? "false" : "true");
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

  if (focusTrapCleanup) {
    focusTrapCleanup();
    focusTrapCleanup = null;
  }

  if (isOpen && panel) {
    focusTrapCleanup = trapFocus(panel);
  }
}

function applyContactFabState(isOpen) {
  const fab = document.getElementById("contact-fab");
  if (!(fab instanceof HTMLElement)) {
    contactFabOpen = false;
    return;
  }

  const trigger = fab.querySelector(".contact-fab__trigger");
  const actions = fab.querySelector(".contact-fab__actions");

  fab.classList.toggle("is-open", isOpen);
  trigger?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  actions?.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

function setContactFabOpen(isOpen) {
  contactFabOpen = Boolean(isOpen);
  applyContactFabState(contactFabOpen);
}

function shouldLockPlayScroll() {
  return window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches;
}

function forceViewportTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function isWorkPopupOpen() {
  const popup = document.getElementById("work-popup");
  return Boolean(popup && !popup.classList.contains("u-hidden"));
}

function syncGlobalScrollLock() {
  const state = getState();
  const playLock = Boolean(state.playMode) && shouldLockPlayScroll();
  const drawerLock = Boolean(state.drawerOpen);
  const popupLock = isWorkPopupOpen();
  const shouldLock = playLock || drawerLock || popupLock;

  document.documentElement.classList.toggle("is-play-scroll-locked", playLock);
  document.documentElement.style.overflow = shouldLock ? "hidden" : "";
  document.body.style.overflow = shouldLock ? "hidden" : "";
  document.body.style.overscrollBehavior = playLock ? "none" : "";
  document.body.style.touchAction = playLock ? "none" : "";
}

function applyPlayModeScrollLock(isPlayMode) {
  const shouldLock = Boolean(isPlayMode) && shouldLockPlayScroll();

  if (shouldLock) {
    forceViewportTop();
    requestAnimationFrame(() => {
      if (getState().playMode && shouldLockPlayScroll()) {
        forceViewportTop();
      }
    });
  }
  syncGlobalScrollLock();
}

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) {
    return;
  }
  target.scrollIntoView({
    behavior: getState().reducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

function getElementRect(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    return null;
  }
  return rect;
}

function removePopupGhost() {
  if (popupGhostEl instanceof HTMLElement && popupGhostEl.isConnected) {
    popupGhostEl.remove();
  }
  popupGhostEl = null;
}

function restorePopupSourceVisibility() {
  if (popupSourceEl instanceof HTMLElement && popupSourceEl.isConnected) {
    popupSourceEl.style.visibility = "";
  }
}

function createGhostFromElement(sourceEl, rect, extraClass = "") {
  const ghost = sourceEl.cloneNode(true);
  ghost.classList.add("work-popup__ghost");
  if (extraClass) {
    ghost.classList.add(extraClass);
  }
  ghost.removeAttribute("id");
  ghost.querySelectorAll?.("[id]").forEach((node) => {
    node.removeAttribute("id");
  });
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.transform = "translate3d(0, 0, 0) scale(1, 1)";

  const sourceStyle = getComputedStyle(sourceEl);
  ghost.style.borderRadius = sourceStyle.borderRadius;
  ghost.style.background = sourceStyle.backgroundColor;
  ghost.style.border = `${sourceStyle.borderWidth} ${sourceStyle.borderStyle} ${sourceStyle.borderColor}`;
  ghost.style.boxShadow = "none";
  ghost.style.setProperty("--shadowOpacity", "0");

  return ghost;
}

function clearPopupPanelInlineStyles() {
  const panel = document.querySelector("#work-popup .work-popup__panel");
  if (panel instanceof HTMLElement) {
    panel.style.opacity = "";
    panel.style.transform = "";
  }
}

function cancelPopupAnimations() {
  popupPanelAnimation?.cancel();
  popupBackdropAnimation?.cancel();
  popupGhostAnimation?.cancel();
  popupPanelAnimation = null;
  popupBackdropAnimation = null;
  popupGhostAnimation = null;
  clearPopupPanelInlineStyles();
  removePopupGhost();
  restorePopupSourceVisibility();
}

function finishWorkPopupClose(popup) {
  popup.classList.add("u-hidden");
  popup.setAttribute("aria-hidden", "true");
  syncGlobalScrollLock();

  const focusTarget = popupLastFocused;
  popupLastFocused = null;
  restorePopupSourceVisibility();
  popupSourceEl = null;
  popupMotionStyle = "zoom";

  if (focusTarget instanceof HTMLElement && focusTarget.isConnected) {
    focusTarget.focus();
  }
}

function closeWorkPopup() {
  const popup = document.getElementById("work-popup");
  if (!popup || popup.classList.contains("u-hidden")) {
    return;
  }

  popup.setAttribute("aria-hidden", "true");

  const panel = popup.querySelector(".work-popup__panel");
  const backdrop = popup.querySelector(".work-popup__backdrop");
  const reducedMotion = getState().reducedMotion;
  const canAnimate =
    panel instanceof HTMLElement &&
    backdrop instanceof HTMLElement &&
    typeof panel.animate === "function" &&
    typeof backdrop.animate === "function";

  cancelPopupAnimations();

  if (!canAnimate) {
    finishWorkPopupClose(popup);
    return;
  }

  const motionToken = ++popupMotionToken;
  const canSharedClose =
    !reducedMotion &&
    popupMotionStyle === "shared" &&
    popupSourceEl instanceof HTMLElement &&
    popupSourceEl.isConnected;

  if (canSharedClose) {
    const panelRect = getElementRect(panel);
    const sourceRect = getElementRect(popupSourceEl);
    if (panelRect && sourceRect) {
      const ghost = createGhostFromElement(panel, panelRect, "work-popup__ghost--panel");
      popupGhostEl = ghost;
      document.body.appendChild(ghost);

      panel.style.opacity = "0";
      ghost.style.setProperty("--shadowOpacity", "1");
      requestAnimationFrame(() => {
        ghost.style.setProperty("--shadowOpacity", "0");
      });

      const dx = Math.round(sourceRect.left - panelRect.left);
      const dy = Math.round(sourceRect.top - panelRect.top);
      const sx = sourceRect.width / panelRect.width;
      const sy = sourceRect.height / panelRect.height;
      const sourceStyle = getComputedStyle(popupSourceEl);
      const panelStyle = getComputedStyle(panel);

      popupGhostAnimation = ghost.animate(
        [
          {
            transform: "translate3d(0px, 0px, 0) scale(1, 1)",
            borderRadius: panelStyle.borderRadius,
            opacity: 1,
          },
          {
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
            borderRadius: sourceStyle.borderRadius,
            opacity: 1,
          },
        ],
        {
          duration: POPUP_SHARED_CLOSE_DURATION,
          easing: POPUP_SHARED_EASING,
          fill: "forwards",
        },
      );

      popupBackdropAnimation = backdrop.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        {
          duration: POPUP_SHARED_OVERLAY_DURATION,
          easing: "linear",
          fill: "both",
        },
      );

      Promise.allSettled([popupGhostAnimation.finished, popupBackdropAnimation.finished]).then(() => {
        if (motionToken !== popupMotionToken) {
          return;
        }
        popupPanelAnimation = null;
        popupBackdropAnimation = null;
        popupGhostAnimation = null;
        clearPopupPanelInlineStyles();
        removePopupGhost();
        finishWorkPopupClose(popup);
      });
      return;
    }
  }

  if (reducedMotion) {
    popupPanelAnimation = panel.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: POPUP_REDUCED_DURATION,
        easing: "ease-out",
        fill: "both",
      },
    );

    popupBackdropAnimation = backdrop.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: POPUP_REDUCED_DURATION,
        easing: "ease-out",
        fill: "both",
      },
    );
  } else {
    popupPanelAnimation = panel.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        { opacity: 0, transform: "translate3d(0, 8px, 0) scale(0.97)" },
      ],
      {
        duration: POPUP_CLOSE_PANEL_DURATION,
        easing: POPUP_EASING,
        fill: "both",
      },
    );

    popupBackdropAnimation = backdrop.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: POPUP_CLOSE_BACKDROP_DURATION,
        easing: "ease-out",
        fill: "both",
      },
    );
  }

  Promise.allSettled([popupPanelAnimation.finished, popupBackdropAnimation.finished]).then(() => {
    if (motionToken !== popupMotionToken) {
      return;
    }
    popupPanelAnimation = null;
    popupBackdropAnimation = null;
    clearPopupPanelInlineStyles();
    finishWorkPopupClose(popup);
  });
}

function normalizeDetailText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDetailList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((line) =>
      normalizeDetailText(line)
        .split(/\r?\n/g)
        .map((part) => part.trim())
        .filter(Boolean),
    );
  }
  const single = normalizeDetailText(value);
  if (!single) {
    return [];
  }
  return single
    .split(/\r?\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildWorkDetailRows(work, lang) {
  const rawDesc = work?.desc;
  if (Array.isArray(rawDesc)) {
    return rawDesc
      .map((line) => normalizeDetailText(line))
      .filter(Boolean)
      .map((text) => ({ text, isSub: false, isJobSub: false, label: "", emphasizeLabel: false }));
  }

  if (typeof rawDesc === "string") {
    return rawDesc
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, isSub: false, isJobSub: false, label: "", emphasizeLabel: false }));
  }

  if (!rawDesc || typeof rawDesc !== "object") {
    return [];
  }

  const labels =
    lang === "vi"
      ? {
          goal: "Mục tiêu",
          role: "Vai trò",
          job: "Công việc",
          result: "Kết quả",
          tech: "Tech",
        }
      : {
          goal: "Goal",
          role: "Role",
          job: "Job",
          result: "Result",
          tech: "Tech",
        };

  const rows = [];
  const pushRow = (text, {
    isSub = false,
    isJobSub = false,
    isListBullet = false,
    label = "",
    emphasizeLabel = false,
  } = {}) => {
    const safeText = normalizeDetailText(text);
    const safeLabel = normalizeDetailText(label);
    if (!safeText && !safeLabel) {
      return;
    }
    rows.push({
      text: safeText,
      isSub,
      isJobSub,
      isListBullet,
      label: safeLabel,
      emphasizeLabel,
    });
  };

  const pushLabeledRows = (label, lines, { emphasizeLabel = false, bulletAllWhenMulti = false } = {}) => {
    const normalized = (lines || []).map((line) => normalizeDetailText(line)).filter(Boolean);
    if (!normalized.length) {
      return;
    }

    if (bulletAllWhenMulti && normalized.length > 1) {
      pushRow("", { label, emphasizeLabel });
      normalized.forEach((line) => {
        pushRow(line, { isSub: true, isListBullet: true });
      });
      return;
    }

    pushRow(normalized[0], { label, emphasizeLabel });
    normalized.slice(1).forEach((line) => {
      pushRow(line, { isSub: true, isListBullet: bulletAllWhenMulti });
    });
  };

  pushLabeledRows(labels.goal, normalizeDetailList(rawDesc.goal), {
    emphasizeLabel: true,
    bulletAllWhenMulti: true,
  });

  const roleLines = normalizeDetailList(rawDesc.role);
  pushLabeledRows(labels.role, roleLines, {
    emphasizeLabel: true,
    bulletAllWhenMulti: true,
  });

  let jobSummary = "";
  let subJobs = [];
  if (typeof rawDesc.job === "string" || Array.isArray(rawDesc.job)) {
    const jobLines = normalizeDetailList(rawDesc.job);
    if (jobLines.length) {
      [jobSummary] = jobLines;
      subJobs = subJobs.concat(jobLines.slice(1));
    }
  } else if (rawDesc.job && typeof rawDesc.job === "object") {
    jobSummary = normalizeDetailText(rawDesc.job.summary || rawDesc.job.title || rawDesc.job.main);
    subJobs = subJobs.concat(normalizeDetailList(rawDesc.job.sub_jobs || rawDesc.job.subJobs));
  }
  subJobs = subJobs.concat(normalizeDetailList(rawDesc.sub_jobs));

  const jobLines = [];
  if (jobSummary) {
    jobLines.push(jobSummary);
  }
  if (subJobs.length) {
    jobLines.push(...subJobs);
  }
  pushLabeledRows(labels.job, jobLines, {
    emphasizeLabel: true,
    bulletAllWhenMulti: true,
  });

  const resultLines = normalizeDetailList(rawDesc.result ?? rawDesc.ressult);
  pushLabeledRows(labels.result, resultLines, {
    bulletAllWhenMulti: true,
  });

  const techLines = normalizeDetailList(rawDesc.tech);
  pushLabeledRows(labels.tech, techLines, {
    emphasizeLabel: true,
    bulletAllWhenMulti: true,
  });

  return rows;
}

function openWorkPopup(index, triggerEl) {
  const popup = document.getElementById("work-popup");
  const state = getState();
  const detailItems = state.content?.details_work?.items ?? state.content?.more_work?.items ?? [];
  const work = detailItems[index];
  if (!popup || !work) {
    return;
  }

  const title = popup.querySelector("#work-popup-title");
  const meta = popup.querySelector("#work-popup-meta");
  const desc = popup.querySelector("#work-popup-desc");
  const closeBtn = popup.querySelector("[data-work-close='true']");
  const panel = popup.querySelector(".work-popup__panel");
  const backdrop = popup.querySelector(".work-popup__backdrop");
  const reducedMotion = state.reducedMotion;

  if (title) title.textContent = work.name || "";
  if (meta) meta.textContent = work.meta || "";
  if (desc) {
    const detailRows = buildWorkDetailRows(work, state.lang);

    if (desc instanceof HTMLUListElement) {
      desc.replaceChildren();
      if (detailRows.length) {
        detailRows.forEach((row) => {
          const bullet = document.createElement("li");
          const classes = ["item__desc"];
          if (row.isSub) {
            classes.push("item__desc--sub");
          }
          if (row.isJobSub) {
            classes.push("item__desc--job-sub");
          }
          if (row.isListBullet) {
            classes.push("item__desc--list-bullet");
          }
          bullet.className = classes.join(" ");
          if (row.label) {
            const labelNode = document.createElement("span");
            labelNode.className = `work-popup__desc-label${row.emphasizeLabel ? " work-popup__desc-label--major" : ""}`;
            labelNode.textContent = `${row.label}: `;
            bullet.appendChild(labelNode);
          }
          if (row.text) {
            bullet.appendChild(document.createTextNode(row.text));
          }
          desc.appendChild(bullet);
        });
      }
    } else {
      desc.textContent = detailRows
        .map((row) => (row.label ? `${row.label}: ${row.text}`.trim() : row.text))
        .join("\n");
    }
  }

  cancelPopupAnimations();
  ++popupMotionToken;

  popupLastFocused = triggerEl instanceof HTMLElement ? triggerEl : document.activeElement;
  popupSourceEl = triggerEl instanceof HTMLElement ? triggerEl : null;
  popupMotionStyle =
    triggerEl instanceof HTMLElement && triggerEl.dataset.motionStyle
      ? triggerEl.dataset.motionStyle
      : "zoom";

  popup.classList.remove("u-hidden");
  popup.setAttribute("aria-hidden", "false");
  syncGlobalScrollLock();

  const canAnimate =
    panel instanceof HTMLElement &&
    backdrop instanceof HTMLElement &&
    typeof panel.animate === "function" &&
    typeof backdrop.animate === "function";

  if (canAnimate) {
    const motionToken = popupMotionToken;
    const canSharedOpen = !reducedMotion && popupMotionStyle === "shared" && popupSourceEl instanceof HTMLElement;

    if (canSharedOpen) {
      const sourceRect = getElementRect(popupSourceEl);
      const panelRect = getElementRect(panel);
      if (sourceRect && panelRect) {
        const ghost = createGhostFromElement(popupSourceEl, sourceRect);
        popupGhostEl = ghost;
        document.body.appendChild(ghost);

        popupSourceEl.style.visibility = "hidden";
        panel.style.opacity = "0";
        ghost.style.setProperty("--shadowOpacity", "0");
        requestAnimationFrame(() => {
          ghost.style.setProperty("--shadowOpacity", "1");
        });

        const dx = Math.round(panelRect.left - sourceRect.left);
        const dy = Math.round(panelRect.top - sourceRect.top);
        const sx = panelRect.width / sourceRect.width;
        const sy = panelRect.height / sourceRect.height;
        const panelStyle = getComputedStyle(panel);
        const sourceStyle = getComputedStyle(popupSourceEl);

        popupBackdropAnimation = backdrop.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          {
            duration: POPUP_SHARED_OVERLAY_DURATION,
            easing: "linear",
            fill: "both",
          },
        );

        popupGhostAnimation = ghost.animate(
          [
            {
              transform: "translate3d(0px, 0px, 0) scale(1, 1)",
              borderRadius: sourceStyle.borderRadius,
            },
            {
              transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
              borderRadius: panelStyle.borderRadius,
            },
          ],
          {
            duration: POPUP_SHARED_OPEN_DURATION,
            easing: POPUP_SHARED_EASING,
            fill: "forwards",
          },
        );

        Promise.allSettled([popupGhostAnimation.finished, popupBackdropAnimation.finished]).then(() => {
          if (motionToken !== popupMotionToken || popup.classList.contains("u-hidden")) {
            return;
          }

          popupPanelAnimation = panel.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            {
              duration: POPUP_SHARED_FADE_DURATION,
              easing: "ease-out",
              fill: "both",
            },
          );

          popupGhostAnimation = ghost.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            {
              duration: POPUP_SHARED_GHOST_FADE_DURATION,
              easing: "linear",
              fill: "both",
            },
          );

          Promise.allSettled([popupPanelAnimation.finished, popupGhostAnimation.finished]).then(() => {
            if (motionToken !== popupMotionToken || popup.classList.contains("u-hidden")) {
              return;
            }
            popupPanelAnimation = null;
            popupBackdropAnimation = null;
            popupGhostAnimation = null;
            clearPopupPanelInlineStyles();
            removePopupGhost();
          });
        });
      }
    } else if (reducedMotion) {
      popupBackdropAnimation = backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: POPUP_REDUCED_DURATION,
          easing: "ease-out",
          fill: "both",
        },
      );

      popupPanelAnimation = panel.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: POPUP_REDUCED_DURATION,
          easing: "ease-out",
          fill: "both",
        },
      );

      Promise.allSettled([popupPanelAnimation.finished, popupBackdropAnimation.finished]).then(() => {
        if (motionToken !== popupMotionToken || popup.classList.contains("u-hidden")) {
          return;
        }
        popupPanelAnimation = null;
        popupBackdropAnimation = null;
      });
    } else {
      popupBackdropAnimation = backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: POPUP_OPEN_BACKDROP_DURATION,
          easing: "ease-out",
          fill: "both",
        },
      );

      popupPanelAnimation = panel.animate(
        [
          { opacity: 0, transform: "translate3d(0, 10px, 0) scale(0.94)" },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: POPUP_OPEN_PANEL_DURATION,
          delay: POPUP_OPEN_PANEL_DELAY,
          easing: POPUP_EASING,
          fill: "both",
        },
      );

      Promise.allSettled([popupPanelAnimation.finished, popupBackdropAnimation.finished]).then(() => {
        if (motionToken !== popupMotionToken || popup.classList.contains("u-hidden")) {
          return;
        }
        popupPanelAnimation = null;
        popupBackdropAnimation = null;
      });
    }
  }

  if (closeBtn instanceof HTMLElement) {
    closeBtn.focus();
  }
}

async function checkResourceExists(url) {
  if (!url) {
    return false;
  }

  try {
    const headResponse = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (headResponse.ok) {
      return true;
    }

    if (headResponse.status === 405) {
      const getResponse = await fetch(url, { method: "GET", cache: "no-store" });
      return getResponse.ok;
    }
  } catch (_error) {
    return false;
  }

  return false;
}

function announceLang(lang) {
  const region = document.getElementById("sr-live");
  if (!region) {
    return;
  }

  region.textContent =
    lang === "vi"
      ? "\u0110\u00e3 chuy\u1ec3n sang ti\u1ebfng Vi\u1ec7t"
      : "Switched to English";
}

function scheduleLanguagePrefetch(activeLang) {
  const nextLang = activeLang === "vi" ? "en" : "vi";
  const run = () => {
    prefetchContent(nextLang).catch(() => {});
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else {
    window.setTimeout(run, 240);
  }
}

async function loadLanguage(nextLang) {
  const requestSeq = ++languageRequestSeq;
  const previous = getState();
  setState({ status: "loading", lang: nextLang, errorMsg: "" });

  try {
    const content = await loadContent(nextLang);
    if (requestSeq !== languageRequestSeq) {
      return;
    }

    const validation = validateContent(content);
    if (!validation.ok) {
      throw new Error(validation.errors[0] || "Invalid content format");
    }

    const cvUrl = content.meta?.links?.cv || "";
    const cvAvailable = await checkResourceExists(cvUrl);
    if (requestSeq !== languageRequestSeq) {
      return;
    }

    setState({
      content,
      status: "ready",
      errorMsg: "",
      cvAvailable,
      drawerOpen: false,
    });

    announceLang(nextLang);
    scheduleLanguagePrefetch(nextLang);
    return;
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    if (requestSeq !== languageRequestSeq) {
      return;
    }

    const fallback = getLastGoodContent();
    if (fallback) {
      const fallbackCv = await checkResourceExists(fallback.meta?.links?.cv || "");
      if (requestSeq !== languageRequestSeq) {
        return;
      }
      setState({
        content: fallback,
        status: "ready",
        errorMsg: String(error?.message || "Failed to load content"),
        cvAvailable: fallbackCv,
        lang: previous.lang,
      });
      scheduleLanguagePrefetch(previous.lang);
    } else {
      setState({
        status: "error",
        errorMsg: String(error?.message || "Failed to load content"),
        lang: previous.lang,
      });
    }

    showToast(
      nextLang === "vi"
        ? "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c n\u1ed9i dung ng\u00f4n ng\u1eef \u0111\u00e3 ch\u1ecdn. \u0110ang gi\u1eef n\u1ed9i dung tr\u01b0\u1edbc \u0111\u00f3."
        : "Unable to load selected language content. Keeping the previous content.",
      { type: "error" },
    );
  }
}

function bindGlobalInteractions() {
  document.addEventListener("click", (event) => {
    const contactFabToggle = event.target.closest("[data-contact-fab-toggle='true']");
    if (contactFabToggle) {
      event.preventDefault();
      setContactFabOpen(!contactFabOpen);
      return;
    }

    const contactFabAction = event.target.closest(".contact-fab__action");
    if (contactFabAction) {
      setContactFabOpen(false);
      return;
    }

    if (contactFabOpen) {
      const contactFab = document.getElementById("contact-fab");
      if (contactFab && !contactFab.contains(event.target)) {
        setContactFabOpen(false);
      }
    }

    const langToggleBtn = event.target.closest("[data-lang-toggle='true']");
    if (langToggleBtn) {
      const currentLang = getState().lang;
      const nextLang =
        langToggleBtn.dataset.langNext === "vi" || langToggleBtn.dataset.langNext === "en"
          ? langToggleBtn.dataset.langNext
          : (currentLang === "vi" ? "en" : "vi");
      if (nextLang !== currentLang) {
        loadLanguage(nextLang);
      }
      return;
    }

    const legacyLangBtn = event.target.closest(".navbar__lang-btn");
    if (legacyLangBtn) {
      const lang = legacyLangBtn.dataset.lang;
      if ((lang === "vi" || lang === "en") && lang !== getState().lang) {
        loadLanguage(lang);
      }
      return;
    }

    const themeToggleBtn = event.target.closest("[data-theme-toggle='true']");
    if (themeToggleBtn) {
      const currentTheme = getState().theme;
      const nextTheme =
        themeToggleBtn.dataset.themeNext === "dark" || themeToggleBtn.dataset.themeNext === "light"
          ? themeToggleBtn.dataset.themeNext
          : (currentTheme === "light" ? "dark" : "light");
      if (nextTheme !== currentTheme) {
        setState({ theme: nextTheme });
      }
      return;
    }

    const fluidRandomBtn = event.target.closest("[data-fluid-play='random']");
    if (fluidRandomBtn) {
      if (getState().playMode) {
        randomizeFluidPlayModeColor();
      }
      return;
    }

    const fluidDefaultBtn = event.target.closest("[data-fluid-play='default']");
    if (fluidDefaultBtn) {
      if (getState().playMode) {
        resetFluidPlayModeColor();
      }
      return;
    }

    const legacyThemeBtn = event.target.closest(".navbar__theme-btn");
    if (legacyThemeBtn) {
      const nextTheme = legacyThemeBtn.dataset.theme;
      if ((nextTheme === "dark" || nextTheme === "light") && nextTheme !== getState().theme) {
        setState({ theme: nextTheme });
      }
      return;
    }

    const playBtn = event.target.closest("[data-play-mode='toggle']");
    if (playBtn) {
      closeWorkPopup();
      closeDrawer();
      setContactFabOpen(false);
      const nextPlayMode = !getState().playMode;
      if (nextPlayMode && shouldLockPlayScroll()) {
        forceViewportTop();
      }
      setState({ playMode: nextPlayMode });
      return;
    }

    const menuBtn = event.target.closest("#drawer-toggle");
    if (menuBtn) {
      setContactFabOpen(false);
      setState({ drawerOpen: !getState().drawerOpen });
      return;
    }

    const sectionLink = event.target.closest("a[data-section]");
    if (sectionLink) {
      event.preventDefault();
      const id = sectionLink.dataset.section;
      const drawerOpen = getState().drawerOpen;
      setContactFabOpen(false);
      if (drawerOpen) {
        closeDrawer();
        window.setTimeout(() => scrollToSection(id), 90);
      } else {
        scrollToSection(id);
      }
      return;
    }

    const workBtn = event.target.closest("[data-work-open]");
    if (workBtn) {
      const workIndex = Number.parseInt(workBtn.dataset.workOpen || "-1", 10);
      if (workIndex >= 0) {
        setContactFabOpen(false);
        openWorkPopup(workIndex, workBtn);
      }
      return;
    }

    const closePopupBtn = event.target.closest("[data-work-close]");
    if (closePopupBtn) {
      closeWorkPopup();
      return;
    }

    const drawer = event.target.closest("#mobile-drawer");
    if (drawer && event.target === drawer) {
      closeDrawer();
    }
  });

  document.addEventListener("keydown", (event) => {
    const workTrigger = event.target.closest?.("[data-work-open]");
    if (workTrigger && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      const workIndex = Number.parseInt(workTrigger.dataset.workOpen || "-1", 10);
      if (workIndex >= 0) {
        openWorkPopup(workIndex, workTrigger);
      }
      return;
    }

    if (event.key === "Escape") {
      closeWorkPopup();
      setContactFabOpen(false);
    }

    if (event.key === "Escape" && getState().drawerOpen) {
      closeDrawer();
    }
  });

  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
      if (isMobileViewport() && getState().playMode) {
        setState({ playMode: false });
      }
      navIndicatorController?.refresh(true);
      syncGlobalScrollLock();
    });
  }, { passive: true });
}

function initSectionObserver() {
  if (observerCleanup) {
    observerCleanup();
  }

  observerCleanup = initActiveSectionObserver(SECTION_IDS, (activeId) => {
    if (activeId !== getState().activeSection) {
      setState({ activeSection: activeId });
    }
  });
}

function runPostRender(state) {
  setScrollBehavior(state.reducedMotion);
  applyTheme(state.theme);
  setFluidTheme(state.theme);
  applyDrawerState(state.drawerOpen);
  if (state.playMode) {
    setContactFabOpen(false);
  } else {
    applyContactFabState(contactFabOpen);
  }
  document.getElementById("main")?.classList.toggle("main--play", state.playMode);
  setFluidPlayMode(state.playMode);
  initNavIndicator();
  syncNavActive(state.activeSection);
  applyPlayModeScrollLock(state.playMode);

  const app = document.getElementById("app");
  if (!app) {
    return;
  }

  initReveal(app);
  initExperienceCarousel(state.reducedMotion);
  initBubblePhysics();

  if (state.playMode) {
    if (observerCleanup) {
      observerCleanup();
      observerCleanup = null;
    }
    return;
  }

  if (state.content) {
    initSectionObserver();
  }
}

function onStateChange(next) {
  const prev = stateSnapshot;
  stateSnapshot = next;

  const requiresFullRender =
    prev.content !== next.content
    || prev.status !== next.status
    || prev.lang !== next.lang
    || prev.cvAvailable !== next.cvAvailable
    || prev.playMode !== next.playMode
    || prev.theme !== next.theme;

  if (requiresFullRender) {
    renderApp(next);
    runPostRender(next);
    return;
  }

  if (prev.activeSection !== next.activeSection) {
    syncNavActive(next.activeSection);
  }

  if (prev.drawerOpen !== next.drawerOpen) {
    applyDrawerState(next.drawerOpen);
    syncGlobalScrollLock();
  }

  if (prev.reducedMotion !== next.reducedMotion) {
    setScrollBehavior(next.reducedMotion);
  }

  if (prev.playMode !== next.playMode) {
    applyPlayModeScrollLock(next.playMode);
  }
}

async function bootstrap() {
  initBootLoaderGate();
  loaderFallbackTimer = window.setTimeout(() => {
    dismissBootLoader(true);
  }, BOOT_LOADER_TIMEOUT_MS);

  initStore();
  bindGlobalInteractions();
  const fluidInitPromise = initFluidBackground();

  subscribe(onStateChange);

  renderApp(getState());
  runPostRender(getState());

  await loadLanguage(getState().lang);
  await fluidInitPromise;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      markBootReady();
    });
  });
}

bootstrap().catch((error) => {
  console.error("Bootstrap error:", error);
  dismissBootLoader(true);
});
