import WebGLFluid from "./webgl-fluid.js";

const DEFAULT_FLUID_CONFIG = {
  TRIGGER: "hover",
  IMMEDIATE: false,
  AUTO: false,
  INTERVAL: 3200,
  SIM_RESOLUTION: 72,
  DYE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 2.7,
  VELOCITY_DISSIPATION: 0.32,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 10,
  CURL: 12,
  SPLAT_RADIUS: 0.05,
  SPLAT_FORCE: 620,
  SPLAT_COUNT: 0,
  POINTER_DELTA_LIMIT: 0.012,
  SHADING: false,
  COLORFUL: false,
  COLOR_UPDATE_SPEED: 8,
  POINTER_COLOR_MULTIPLIER: 0.35,
  MONOCHROME: true,
  MONO_COLOR: { r: 255, g: 255, b: 255 },
  PAUSED: false,
  SUSPEND_WHEN_PAUSED: true,
  PAUSE_POLL_MS: 380,
  PIXEL_RATIO_CAP: 1.2,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: false,
  BLOOM: false,
  SUNRAYS: false,
};

const MOBILE_BREAKPOINT_MAX = 767;
const DARK_BG_COLOR = { r: 0, g: 0, b: 0 };
const PLAY_DEFAULT_MONO_COLOR = { r: 166, g: 174, b: 188 };

let resizeHandler = null;
let visibilityHandler = null;
let pageHideHandler = null;
let pageShowHandler = null;
let resizeRaf = 0;
let idleInitToken = null;
let fluidApi = null;
let fluidBaseConfig = {
  SPLAT_RADIUS: DEFAULT_FLUID_CONFIG.SPLAT_RADIUS,
  SPLAT_FORCE: DEFAULT_FLUID_CONFIG.SPLAT_FORCE,
  POINTER_DELTA_LIMIT: DEFAULT_FLUID_CONFIG.POINTER_DELTA_LIMIT,
  DENSITY_DISSIPATION: DEFAULT_FLUID_CONFIG.DENSITY_DISSIPATION,
  POINTER_COLOR_MULTIPLIER: DEFAULT_FLUID_CONFIG.POINTER_COLOR_MULTIPLIER,
};
let fluidPlayModeEnabled = false;
let fluidPlayModeColorOverride = null;

const PLAY_RADIUS_MULTIPLIER = 1.4;
const PLAY_FORCE_MULTIPLIER = 1.3;
const PLAY_LENGTH_MULTIPLIER = 1.3;
const PLAY_DENSITY_MULTIPLIER = 0.8;
const PLAY_COLOR_MULTIPLIER = 1.45;

function isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_MAX}px)`).matches;
}

function getFluidBackgroundColor() {
  return { ...DARK_BG_COLOR };
}

function getFluidCanvasColorCss() {
  const color = getFluidBackgroundColor();
  return `rgb(${color.r} ${color.g} ${color.b})`;
}

function clampRgb(value) {
  return Math.min(255, Math.max(0, Math.round(Number(value) || 0)));
}

function normalizeRgbColor(color) {
  if (!color || typeof color !== "object") {
    return null;
  }
  return {
    r: clampRgb(color.r),
    g: clampRgb(color.g),
    b: clampRgb(color.b),
  };
}

function randomPlayModeColor() {
  const hue = Math.random() * 360;
  const saturation = 0.45 + (Math.random() * 0.35);
  const lightness = 0.53 + (Math.random() * 0.2);
  const c = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - (c / 2);

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;
  if (hue < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hue < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hue < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hue < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hue < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: clampRgb((rPrime + m) * 255),
    g: clampRgb((gPrime + m) * 255),
    b: clampRgb((bPrime + m) * 255),
  };
}

function setCanvasActive(canvas, isActive) {
  canvas.style.display = isActive ? "block" : "none";
  canvas.style.background = getFluidCanvasColorCss();
}

function applyCanvasViewport(canvas, api) {
  const width = Math.max(1, Math.floor(window.innerWidth));
  const height = Math.max(1, Math.floor(window.innerHeight));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  api?.resize?.();
}

function computeFluidPreset() {
  const cores = Number(navigator.hardwareConcurrency || 8);
  const memory = Number(navigator.deviceMemory || 8);
  const saveData = Boolean(navigator.connection?.saveData);
  const isMobile = window.matchMedia("(max-width: 820px)").matches;
  const isTabletUp = window.matchMedia("(min-width: 768px)").matches;
  const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;
  const useDragTrigger = !hasFinePointer && !isTabletUp;
  const trigger = useDragTrigger ? "click" : "hover";

  const lowTier = saveData || memory <= 4 || cores <= 4 || isMobile;
  const midTier = !lowTier && (memory <= 8 || cores <= 8);

  if (lowTier) {
    return {
      TRIGGER: trigger,
      SIM_RESOLUTION: 44,
      DYE_RESOLUTION: 320,
      PRESSURE_ITERATIONS: 8,
      SPLAT_FORCE: 520,
      SPLAT_RADIUS: 0.044,
      PIXEL_RATIO_CAP: 1,
      POINTER_DELTA_LIMIT: 0.008,
      SHADING: false,
    };
  }

  if (midTier) {
    return {
      TRIGGER: trigger,
      SIM_RESOLUTION: 56,
      DYE_RESOLUTION: 448,
      PRESSURE_ITERATIONS: 9,
      SPLAT_FORCE: 580,
      SPLAT_RADIUS: 0.047,
      PIXEL_RATIO_CAP: 1.1,
      POINTER_DELTA_LIMIT: 0.01,
      SHADING: false,
    };
  }

  return {
    TRIGGER: trigger,
    SIM_RESOLUTION: 72,
    DYE_RESOLUTION: 512,
    PRESSURE_ITERATIONS: 10,
    SPLAT_FORCE: 620,
    SPLAT_RADIUS: 0.05,
    PIXEL_RATIO_CAP: 1.2,
    POINTER_DELTA_LIMIT: 0.012,
    SHADING: false,
  };
}

function cleanupFluidListeners() {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
  if (pageHideHandler) {
    window.removeEventListener("pagehide", pageHideHandler);
    pageHideHandler = null;
  }
  if (pageShowHandler) {
    window.removeEventListener("pageshow", pageShowHandler);
    pageShowHandler = null;
  }
  if (resizeRaf) {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = 0;
  }
}

function applyFluidPlayModeConfig() {
  if (!fluidApi?.setConfig) {
    return;
  }

  const baseRadius = Number(fluidBaseConfig.SPLAT_RADIUS) || DEFAULT_FLUID_CONFIG.SPLAT_RADIUS;
  const baseForce = Number(fluidBaseConfig.SPLAT_FORCE) || DEFAULT_FLUID_CONFIG.SPLAT_FORCE;
  const baseDeltaLimit = Number(fluidBaseConfig.POINTER_DELTA_LIMIT) || DEFAULT_FLUID_CONFIG.POINTER_DELTA_LIMIT;
  const baseDensity = Number(fluidBaseConfig.DENSITY_DISSIPATION) || DEFAULT_FLUID_CONFIG.DENSITY_DISSIPATION;
  const baseColorMultiplier =
    Number(fluidBaseConfig.POINTER_COLOR_MULTIPLIER) || DEFAULT_FLUID_CONFIG.POINTER_COLOR_MULTIPLIER;

  const nextRadius = fluidPlayModeEnabled
    ? Number((baseRadius * PLAY_RADIUS_MULTIPLIER).toFixed(5))
    : baseRadius;
  const nextForce = fluidPlayModeEnabled
    ? Math.round(baseForce * PLAY_FORCE_MULTIPLIER)
    : baseForce;
  const nextDeltaLimit = fluidPlayModeEnabled
    ? Number((baseDeltaLimit * PLAY_LENGTH_MULTIPLIER).toFixed(5))
    : baseDeltaLimit;
  const nextDensity = fluidPlayModeEnabled
    ? Number((baseDensity * PLAY_DENSITY_MULTIPLIER).toFixed(4))
    : baseDensity;
  const nextColorMultiplier = fluidPlayModeEnabled
    ? Number((baseColorMultiplier * PLAY_COLOR_MULTIPLIER).toFixed(4))
    : baseColorMultiplier;
  const defaultMonoColor = fluidPlayModeEnabled
    ? { ...PLAY_DEFAULT_MONO_COLOR }
    : { ...DEFAULT_FLUID_CONFIG.MONO_COLOR };
  const monoColor = normalizeRgbColor(fluidPlayModeColorOverride) ?? defaultMonoColor;

  fluidApi.setConfig({
    SPLAT_RADIUS: nextRadius,
    SPLAT_FORCE: nextForce,
    POINTER_DELTA_LIMIT: nextDeltaLimit,
    DENSITY_DISSIPATION: nextDensity,
    POINTER_COLOR_MULTIPLIER: nextColorMultiplier,
    MONO_COLOR: monoColor,
    BACK_COLOR: getFluidBackgroundColor(),
    TRANSPARENT: false,
  });
}

export function setFluidPlayMode(isEnabled) {
  fluidPlayModeEnabled = Boolean(isEnabled);
  if (!fluidPlayModeEnabled) {
    fluidPlayModeColorOverride = null;
  }
  applyFluidPlayModeConfig();
}

export function randomizeFluidPlayModeColor() {
  if (!fluidPlayModeEnabled) {
    return null;
  }
  fluidPlayModeColorOverride = randomPlayModeColor();
  applyFluidPlayModeConfig();
  return { ...fluidPlayModeColorOverride };
}

export function resetFluidPlayModeColor() {
  fluidPlayModeColorOverride = null;
  applyFluidPlayModeConfig();
}

export function initFluidBackground() {
  return new Promise((resolve) => {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) {
      resolve(false);
      return;
    }

    document.getElementById("fluid-tuner")?.remove();
    cleanupFluidListeners();
    fluidApi = null;
    if (idleInitToken !== null) {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleInitToken);
      } else {
        clearTimeout(idleInitToken);
      }
      idleInitToken = null;
    }

    if (isMobileViewport()) {
      setCanvasActive(canvas, false);
      resolve(false);
      return;
    }

    const init = () => {
      try {
        setCanvasActive(canvas, true);
        const adaptiveConfig = computeFluidPreset();
        const mergedConfig = {
          ...DEFAULT_FLUID_CONFIG,
          ...adaptiveConfig,
          BACK_COLOR: getFluidBackgroundColor(),
          TRANSPARENT: false,
        };
        const api = WebGLFluid(canvas, {
          ...mergedConfig,
        });
        fluidApi = api;
        fluidBaseConfig = {
          SPLAT_RADIUS: mergedConfig.SPLAT_RADIUS,
          SPLAT_FORCE: mergedConfig.SPLAT_FORCE,
          POINTER_DELTA_LIMIT: mergedConfig.POINTER_DELTA_LIMIT,
          DENSITY_DISSIPATION: mergedConfig.DENSITY_DISSIPATION,
          POINTER_COLOR_MULTIPLIER: mergedConfig.POINTER_COLOR_MULTIPLIER,
        };
        applyFluidPlayModeConfig();
        applyCanvasViewport(canvas, api);

        resizeHandler = () => {
          if (resizeRaf) {
            cancelAnimationFrame(resizeRaf);
          }
          resizeRaf = requestAnimationFrame(() => {
            resizeRaf = 0;
            if (isMobileViewport()) {
              setCanvasActive(canvas, false);
              api.setConfig?.({ PAUSED: true });
              return;
            }
            setCanvasActive(canvas, true);
            api.setConfig?.({ PAUSED: document.hidden });
            applyCanvasViewport(canvas, api);
          });
        };
        window.addEventListener("resize", resizeHandler, { passive: true });

        visibilityHandler = () => {
          api.setConfig?.({ PAUSED: document.hidden });
        };
        pageHideHandler = () => {
          api.setConfig?.({ PAUSED: true });
        };
        pageShowHandler = () => {
          api.setConfig?.({ PAUSED: document.hidden });
        };
        document.addEventListener("visibilitychange", visibilityHandler, { passive: true });
        window.addEventListener("pagehide", pageHideHandler, { passive: true });
        window.addEventListener("pageshow", pageShowHandler, { passive: true });
        idleInitToken = null;
        resolve(true);
      } catch (error) {
        console.warn("Fluid background unavailable:", error);
        canvas.style.background = getFluidCanvasColorCss();
        fluidApi = null;
        idleInitToken = null;
        resolve(false);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      idleInitToken = window.requestIdleCallback(init, { timeout: 520 });
    } else {
      idleInitToken = window.setTimeout(init, 16);
    }
  });
}
