const SWIPER_SCRIPT_SRC = "https://unpkg.com/swiper@12/swiper-bundle.min.js";
const SWIPER_STYLE_SRC = "https://unpkg.com/swiper@12/swiper-bundle.min.css";

let swiperScriptPromise = null;
let swiperStylePromise = null;
let swiperInstance = null;
let carouselResizeObserver = null;
let carouselResizeHandler = null;
let carouselResizeRaf = 0;
let carouselProgressRaf = 0;
let carouselLayoutKey = "";
let slideAbsCache = new WeakMap();
let carouselBubbleRaf = 0;
let carouselInitObserver = null;

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

function loadSwiperStyle() {
  const existingStyle =
    document.querySelector(`link[href="${SWIPER_STYLE_SRC}"]`)
    || document.querySelector("link[data-swiper-style='true']");
  if (
    existingStyle
    && (existingStyle.getAttribute("data-loaded") === "true" || Boolean(existingStyle.sheet))
  ) {
    existingStyle.setAttribute("data-loaded", "true");
    return Promise.resolve();
  }

  if (swiperStylePromise) {
    return swiperStylePromise;
  }

  swiperStylePromise = new Promise((resolve, reject) => {
    if (existingStyle) {
      existingStyle.addEventListener("load", () => {
        existingStyle.setAttribute("data-loaded", "true");
        resolve();
      }, { once: true });
      existingStyle.addEventListener("error", () => reject(new Error("Failed to load Swiper styles")), { once: true });
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = SWIPER_STYLE_SRC;
    link.setAttribute("data-swiper-style", "true");
    link.onload = () => {
      link.setAttribute("data-loaded", "true");
      resolve();
    };
    link.onerror = () => reject(new Error("Failed to load Swiper styles"));
    document.head.appendChild(link);
  });

  return swiperStylePromise;
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

function updateBubbleActivity(swiper, stageEl) {
  if (!swiper || swiper.destroyed || !stageEl?.isConnected) {
    return;
  }

  const visibleSlide =
    swiper.slides[swiper.activeIndex]
    || swiper.slides.find((slide) => slide.classList.contains("swiper-slide-active"))
    || swiper.slides[0]
    || null;

  swiper.slides.forEach((slide) => {
    const isActive = Boolean(visibleSlide) && slide === visibleSlide;
    slide.classList.toggle("is-bubbles-active", isActive);
    slide
      .querySelectorAll(".exp-carousel__media-bubbles")
      .forEach((container) => container.setAttribute("data-bubbles-active", isActive ? "true" : "false"));
  });
}

function scheduleBubbleActivityUpdate(swiper, stageEl) {
  if (!swiper || swiper.destroyed) {
    return;
  }
  if (carouselBubbleRaf) {
    return;
  }
  carouselBubbleRaf = requestAnimationFrame(() => {
    carouselBubbleRaf = 0;
    if (!swiper || swiper.destroyed) {
      return;
    }
    updateBubbleActivity(swiper, stageEl);
  });
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
  const isMobile = viewportWidth <= 767;
  const isTablet = !isMobile && viewportWidth <= 1023;
  const mobileArrowScale = isMobile ? 0.8 : 1;

  const slideWidthTarget = stageWidth * (isMobile ? 0.8 : (isTablet ? 0.46 : 0.34));
  const slideWidthMin = isMobile ? 206 : (isTablet ? 228 : 252);
  const slideWidthMaxRaw = isMobile ? 312 : (isTablet ? 340 : 360);
  const slideWidthMax = Math.max(slideWidthMin, Math.min(slideWidthMaxRaw, stageWidth - 18));
  const slideWidth = Math.round(clamp(slideWidthTarget, slideWidthMin, slideWidthMax));

  const slideHeightMin = isMobile ? 310 : (isTablet ? 334 : 350);
  const slideHeightMax = isMobile ? 420 : (isTablet ? 446 : 468);
  const baseSlideHeight = clamp(slideWidth * 1.16, slideHeightMin, slideHeightMax);
  const slideHeight = Math.round(clamp(baseSlideHeight * 1.2, slideHeightMin, slideHeightMax * 1.2));
  const arrowScale = 0.85 * mobileArrowScale;

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
  const slideWidthPx = `${layout.slideWidth}px`;
  swiper.slides.forEach((slide) => {
    if (!(slide instanceof HTMLElement)) {
      return;
    }
    if (slide.style.width !== slideWidthPx) {
      slide.style.width = slideWidthPx;
    }
    if (slide.style.flexBasis !== slideWidthPx) {
      slide.style.flexBasis = slideWidthPx;
    }
    if (slide.style.maxWidth !== slideWidthPx) {
      slide.style.maxWidth = slideWidthPx;
    }
  });
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
  if (carouselBubbleRaf) {
    cancelAnimationFrame(carouselBubbleRaf);
    carouselBubbleRaf = 0;
  }
  if (carouselInitObserver) {
    carouselInitObserver.disconnect();
    carouselInitObserver = null;
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
  const isTabletOrMobile = window.matchMedia("(max-width: 1023px)").matches;
  const touchRatio = isTabletOrMobile ? 1.12 : 1;

  const layout = applyResponsiveCarouselVars(stageEl);
  const initialEffect = coverflowForStageWidth(layout.stageWidth);

  try {
    await loadSwiperStyle();
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
      simulateTouch: true,
      shortSwipes: true,
      longSwipes: true,
      longSwipesRatio: 0.2,
      longSwipesMs: 220,
      touchRatio,
      threshold: 4,
      touchStartPreventDefault: false,
      touchReleaseOnEdges: true,
      passiveListeners: true,
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
          updateBubbleActivity(sw, stageEl);
        },
        progress(sw) {
          scheduleProgressUpdate(sw);
          scheduleBubbleActivityUpdate(sw, stageEl);
        },
        slideChangeTransitionStart(sw) {
          updateStageBackground(sw, stageEl);
          scheduleBubbleActivityUpdate(sw, stageEl);
        },
        slideChangeTransitionEnd(sw) {
          scheduleBubbleActivityUpdate(sw, stageEl);
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
        scheduleBubbleActivityUpdate(swiperInstance, stageEl);
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
