const SWIPER_SCRIPT_SRC = "https://unpkg.com/swiper@12/swiper-bundle.min.js";

let swiperScriptPromise = null;
let swiperInstance = null;
let carouselResizeObserver = null;
let carouselResizeHandler = null;
let carouselResizeRaf = 0;
let carouselProgressRaf = 0;
let carouselLayoutKey = "";
let slideAbsCache = new WeakMap();

function loadSwiperScript() {
  if (window.Swiper) {
    return Promise.resolve(window.Swiper);
  }

  if (swiperScriptPromise) {
    return swiperScriptPromise;
  }

  swiperScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SWIPER_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Swiper), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Swiper script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SWIPER_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Swiper);
    script.onerror = () => reject(new Error("Failed to load Swiper script"));
    document.head.appendChild(script);
  });

  return swiperScriptPromise;
}

function updateSlideVars(swiper) {
  swiper.slides.forEach((slide) => {
    const abs = Math.min(Math.abs(slide.progress || 0), 1);
    const absValue = abs.toFixed(3);
    if (slideAbsCache.get(slide) === absValue) {
      return;
    }
    slideAbsCache.set(slide, absValue);
    slide.style.setProperty("--abs", absValue);
  });
}

function updateStageBackground(swiper, stageEl) {
  const active = swiper.slides[swiper.activeIndex];
  if (!active || !stageEl) {
    return;
  }

  const bgRaw = active.getAttribute("data-bg") || "";
  const colors = bgRaw.split(",");
  if (colors.length < 2) {
    return;
  }

  const bg1 = colors[0].trim();
  const bg2 = colors[1].trim();
  if (stageEl.style.getPropertyValue("--stage-bg-1") !== bg1) {
    stageEl.style.setProperty("--stage-bg-1", bg1);
  }
  if (stageEl.style.getPropertyValue("--stage-bg-2") !== bg2) {
    stageEl.style.setProperty("--stage-bg-2", bg2);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStyleVarIfChanged(stageEl, name, value) {
  if (stageEl.style.getPropertyValue(name) === value) {
    return;
  }
  stageEl.style.setProperty(name, value);
}

function applyResponsiveCarouselVars(stageEl) {
  const measuredWidth = stageEl.clientWidth || stageEl.getBoundingClientRect().width || 336;
  const stageWidth = clamp(measuredWidth, 220, 1600);
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || stageWidth;
  const viewportRatio = clamp((viewportWidth - 360) / (1440 - 360), 0, 1);
  const slideWidth = Math.round(clamp(stageWidth - 20, 228, 336));
  const slideHeight = Math.round(clamp(slideWidth * 1.315, 320, 442));
  const arrowScale = 0.85;

  const arrowHeightMin = 56;
  const arrowHeightMax = 116;
  const arrowHeightByViewport = arrowHeightMin + ((arrowHeightMax - arrowHeightMin) * viewportRatio);
  const arrowHeightBySlide = slideHeight * 0.24;
  const baseArrowHeight = clamp(Math.min(arrowHeightByViewport, arrowHeightBySlide), arrowHeightMin, arrowHeightMax);
  const arrowHeight = Math.round(baseArrowHeight * arrowScale);
  const arrowWidth = Math.round(clamp(arrowHeight * 0.48, 26, 48));
  const arrowIcon = Math.round(clamp(arrowWidth * 0.34, 9, 15));

  setStyleVarIfChanged(stageEl, "--exp-slide-w", `${slideWidth}px`);
  setStyleVarIfChanged(stageEl, "--exp-slide-h", `${slideHeight}px`);
  setStyleVarIfChanged(stageEl, "--exp-arrow-w", `${arrowWidth}px`);
  setStyleVarIfChanged(stageEl, "--exp-arrow-h", `${arrowHeight}px`);
  setStyleVarIfChanged(stageEl, "--exp-arrow-icon", `${arrowIcon}px`);

  return {
    stageWidth,
    slideWidth,
    slideHeight,
    arrowWidth,
    arrowHeight,
    arrowIcon,
  };
}

function coverflowForStageWidth(stageWidth) {
  const ratio = clamp((stageWidth - 280) / (1240 - 280), 0, 1);
  return {
    rotate: 0,
    stretch: Math.round(24 + ratio * (90 - 24)),
    depth: Math.round(105 + ratio * (200 - 105)),
    modifier: Number((1 + ratio * 0.15).toFixed(2)),
    slideShadows: false,
  };
}

function updateCarouselLayout(swiper, stageEl) {
  if (!swiper || swiper.destroyed || !stageEl?.isConnected) {
    return;
  }

  const layout = applyResponsiveCarouselVars(stageEl);
  const nextEffect = coverflowForStageWidth(layout.stageWidth);
  const nextLayoutKey = [
    layout.slideWidth,
    layout.slideHeight,
    layout.arrowWidth,
    layout.arrowHeight,
    layout.arrowIcon,
    nextEffect.stretch,
    nextEffect.depth,
    nextEffect.modifier,
  ].join("|");
  if (nextLayoutKey === carouselLayoutKey) {
    return;
  }
  carouselLayoutKey = nextLayoutKey;

  const currentEffect = swiper.params.coverflowEffect || {};
  const changed =
    currentEffect.stretch !== nextEffect.stretch
    || currentEffect.depth !== nextEffect.depth
    || currentEffect.modifier !== nextEffect.modifier;

  if (changed) {
    swiper.params.coverflowEffect = { ...currentEffect, ...nextEffect };
    swiper.originalParams.coverflowEffect = {
      ...(swiper.originalParams.coverflowEffect || {}),
      ...nextEffect,
    };
  }

  swiper.update();
  updateSlideVars(swiper);
  updateStageBackground(swiper, stageEl);
}

function scheduleProgressUpdate(swiper) {
  if (!swiper || swiper.destroyed) {
    return;
  }
  if (carouselProgressRaf) {
    return;
  }

  carouselProgressRaf = requestAnimationFrame(() => {
    carouselProgressRaf = 0;
    if (!swiper || swiper.destroyed) {
      return;
    }
    updateSlideVars(swiper);
  });
}

export function destroyExperienceCarousel() {
  if (carouselResizeRaf) {
    cancelAnimationFrame(carouselResizeRaf);
    carouselResizeRaf = 0;
  }
  if (carouselProgressRaf) {
    cancelAnimationFrame(carouselProgressRaf);
    carouselProgressRaf = 0;
  }

  if (carouselResizeObserver) {
    carouselResizeObserver.disconnect();
    carouselResizeObserver = null;
  }

  if (carouselResizeHandler) {
    window.removeEventListener("resize", carouselResizeHandler);
    carouselResizeHandler = null;
  }

  if (swiperInstance && typeof swiperInstance.destroy === "function") {
    swiperInstance.destroy(true, true);
  }
  swiperInstance = null;
  carouselLayoutKey = "";
  slideAbsCache = new WeakMap();
}

export async function initExperienceCarousel(reducedMotion = false) {
  destroyExperienceCarousel();

  const carouselEl = document.getElementById("experience-carousel-swiper");
  const stageEl = document.getElementById("experience-carousel-stage");
  if (!carouselEl || !stageEl) {
    return;
  }

  const slideCount = carouselEl.querySelectorAll(".swiper-slide").length;
  const canCycle = slideCount > 1;
  const layout = applyResponsiveCarouselVars(stageEl);
  const initialEffect = coverflowForStageWidth(layout.stageWidth);

  try {
    const SwiperRef = await loadSwiperScript();
    if (!SwiperRef || !document.body.contains(carouselEl)) {
      return;
    }

    swiperInstance = new SwiperRef(carouselEl, {
      effect: "coverflow",
      grabCursor: canCycle,
      centeredSlides: true,
      slidesPerView: "auto",
      loop: false,
      rewind: canCycle,
      watchOverflow: false,
      allowTouchMove: canCycle,
      speed: reducedMotion ? 0 : 900,
      watchSlidesProgress: canCycle,
      coverflowEffect: initialEffect,
      navigation: {
        nextEl: ".exp-carousel-next",
        prevEl: ".exp-carousel-prev",
      },
      pagination: {
        el: ".exp-carousel-pagination",
        clickable: true,
      },
      on: {
        init(sw) {
          updateSlideVars(sw);
          updateStageBackground(sw, stageEl);
        },
        progress(sw) {
          scheduleProgressUpdate(sw);
        },
        slideChangeTransitionStart(sw) {
          updateStageBackground(sw, stageEl);
        },
      },
    });

    const requestLayoutUpdate = () => {
      if (carouselResizeRaf) {
        cancelAnimationFrame(carouselResizeRaf);
      }
      carouselResizeRaf = requestAnimationFrame(() => {
        carouselResizeRaf = 0;
        updateCarouselLayout(swiperInstance, stageEl);
      });
    };

    carouselResizeHandler = requestLayoutUpdate;
    window.addEventListener("resize", carouselResizeHandler, { passive: true });

    if (typeof ResizeObserver === "function") {
      carouselResizeObserver = new ResizeObserver(() => {
        requestLayoutUpdate();
      });
      carouselResizeObserver.observe(stageEl);
    }

    requestLayoutUpdate();
  } catch (error) {
    console.warn("Experience carousel unavailable:", error);
  }
}
