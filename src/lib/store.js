const STATE_KEY = "portfolio_lang";

const state = {
  lang: "en",
  status: "loading",
  content: null,
  errorMsg: "",
  reducedMotion: false,
  activeSection: "top",
  drawerOpen: false,
  cvAvailable: false,
  playMode: false,
};

const listeners = new Set();
let mediaQueryList;

export function getState() {
  return { ...state };
}

export function setState(patch) {
  if (!patch || typeof patch !== "object") {
    return;
  }

  let changed = false;
  Object.entries(patch).forEach(([key, value]) => {
    if (!(key in state)) {
      return;
    }
    if (state[key] !== value) {
      state[key] = value;
      changed = true;
    }
  });

  if (Object.prototype.hasOwnProperty.call(patch, "lang")) {
    localStorage.setItem(STATE_KEY, state.lang);
  }

  if (changed) {
    listeners.forEach((fn) => fn(getState()));
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function normalizeLang(value) {
  return value === "vi" ? "vi" : "en";
}

function setReducedMotionPreference(matches) {
  setState({ reducedMotion: matches });
}

export function initStore() {
  const storedLang = normalizeLang(localStorage.getItem(STATE_KEY));
  state.lang = storedLang;

  mediaQueryList = window.matchMedia("(prefers-reduced-motion: reduce)");
  state.reducedMotion = mediaQueryList.matches;

  const onChange = (event) => {
    setReducedMotionPreference(event.matches);
  };

  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", onChange);
  } else {
    mediaQueryList.addListener(onChange);
  }
}
