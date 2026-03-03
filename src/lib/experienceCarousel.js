const SWIPER_SCRIPT_SRC = "https://unpkg.com/swiper@12/swiper-bundle.min.js";

let swiperScriptPromise = null;
let swiperInstance = null;

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
    slide.style.setProperty("--abs", abs.toFixed(3));
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

  stageEl.style.setProperty("--stage-bg-1", colors[0].trim());
  stageEl.style.setProperty("--stage-bg-2", colors[1].trim());
}

export function destroyExperienceCarousel() {
  if (swiperInstance && typeof swiperInstance.destroy === "function") {
    swiperInstance.destroy(true, true);
  }
  swiperInstance = null;
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

  try {
    const SwiperRef = await loadSwiperScript();
    if (!SwiperRef || !document.body.contains(carouselEl)) {
      return;
    }

    swiperInstance = new SwiperRef(carouselEl, {
      effect: "coverflow",
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "auto",
      loop: false,
      rewind: canCycle,
      watchOverflow: false,
      allowTouchMove: canCycle,
      speed: reducedMotion ? 0 : 1200,
      watchSlidesProgress: true,
      coverflowEffect: {
        rotate: 0,
        stretch: 90,
        depth: 200,
        modifier: 1.15,
        slideShadows: false,
      },
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
          updateSlideVars(sw);
        },
        slideChangeTransitionStart(sw) {
          updateStageBackground(sw, stageEl);
        },
      },
    });
  } catch (error) {
    console.warn("Experience carousel unavailable:", error);
  }
}
