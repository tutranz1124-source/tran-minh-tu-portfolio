import WebGLFluid from "./webgl-fluid.js";

const DEFAULT_FLUID_CONFIG = {
  TRIGGER: "hover",
  IMMEDIATE: true,
  AUTO: false,
  INTERVAL: 3200,
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 1.2,
  VELOCITY_DISSIPATION: 0.05,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 20,
  CURL: 22,
  SPLAT_RADIUS: 0.08,
  SPLAT_FORCE: 1200,
  SPLAT_COUNT: 8,
  SHADING: true,
  COLORFUL: false,
  COLOR_UPDATE_SPEED: 8,
  POINTER_COLOR_MULTIPLIER: 0.35,
  MONOCHROME: true,
  MONO_COLOR: { r: 255, g: 255, b: 255 },
  PAUSED: false,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: true,
  BLOOM: false,
  SUNRAYS: false,
};

let resizeHandler = null;

function applyCanvasViewport(canvas, api) {
  const width = Math.max(1, Math.floor(window.innerWidth));
  const height = Math.max(1, Math.floor(window.innerHeight));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  api?.resize?.();
}

export function initFluidBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) {
    return;
  }

  document.getElementById("fluid-tuner")?.remove();

  try {
    const api = WebGLFluid(canvas, { ...DEFAULT_FLUID_CONFIG });
    applyCanvasViewport(canvas, api);

    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
    }
    resizeHandler = () => applyCanvasViewport(canvas, api);
    window.addEventListener("resize", resizeHandler, { passive: true });
  } catch (error) {
    console.warn("Fluid background unavailable:", error);
    canvas.style.background = "#000";
  }
}
