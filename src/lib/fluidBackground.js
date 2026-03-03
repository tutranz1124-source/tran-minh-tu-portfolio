import WebGLFluid from "./webgl-fluid.js";

const DEFAULT_FLUID_CONFIG = {
  TRIGGER: "hover",
  IMMEDIATE: false,
  AUTO: false,
  INTERVAL: 3200,
  SIM_RESOLUTION: 96,
  DYE_RESOLUTION: 768,
  DENSITY_DISSIPATION: 2.4,
  VELOCITY_DISSIPATION: 0.28,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 14,
  CURL: 14,
  SPLAT_RADIUS: 0.055,
  SPLAT_FORCE: 760,
  SPLAT_COUNT: 0,
  POINTER_DELTA_LIMIT: 0.015,
  SHADING: true,
  COLORFUL: false,
  COLOR_UPDATE_SPEED: 8,
  POINTER_COLOR_MULTIPLIER: 0.35,
  MONOCHROME: true,
  MONO_COLOR: { r: 255, g: 255, b: 255 },
  PAUSED: false,
  SUSPEND_WHEN_PAUSED: true,
  PAUSE_POLL_MS: 260,
  PIXEL_RATIO_CAP: 1.75,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: true,
  BLOOM: false,
  SUNRAYS: false,
};

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

const PLAY_RADIUS_MULTIPLIER = 1.4;
const PLAY_FORCE_MULTIPLIER = 1.3;
const PLAY_LENGTH_MULTIPLIER = 1.3;
const PLAY_DENSITY_MULTIPLIER = 0.8;
const PLAY_COLOR_MULTIPLIER = 1.45;

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
  const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;
  const useDragTrigger = !hasFinePointer;
  const trigger = useDragTrigger ? "click" : "hover";

  const lowTier = saveData || memory <= 4 || cores <= 4 || isMobile;
  const midTier = !lowTier && (memory <= 8 || cores <= 8);

  if (lowTier) {
    return {
      TRIGGER: trigger,
      SIM_RESOLUTION: 64,
      DYE_RESOLUTION: 512,
      PRESSURE_ITERATIONS: 12,
      SPLAT_FORCE: 680,
      SPLAT_RADIUS: 0.05,
      PIXEL_RATIO_CAP: 1.35,
      POINTER_DELTA_LIMIT: 0.012,
    };
  }

  if (midTier) {
    return {
      TRIGGER: trigger,
      SIM_RESOLUTION: 80,
      DYE_RESOLUTION: 640,
      PRESSURE_ITERATIONS: 13,
      SPLAT_FORCE: 720,
      PIXEL_RATIO_CAP: 1.55,
    };
  }

  return {
    TRIGGER: trigger,
    PIXEL_RATIO_CAP: 1.85,
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

  fluidApi.setConfig({
    SPLAT_RADIUS: nextRadius,
    SPLAT_FORCE: nextForce,
    POINTER_DELTA_LIMIT: nextDeltaLimit,
    DENSITY_DISSIPATION: nextDensity,
    POINTER_COLOR_MULTIPLIER: nextColorMultiplier,
  });
}

export function setFluidPlayMode(isEnabled) {
  fluidPlayModeEnabled = Boolean(isEnabled);
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

    const init = () => {
      try {
        const adaptiveConfig = computeFluidPreset();
        const mergedConfig = {
          ...DEFAULT_FLUID_CONFIG,
          ...adaptiveConfig,
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
        canvas.style.background = "#000";
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
