const LANG_KEY = "portfolio_lang";

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
  theme: "dark",
};

const listeners = new Set();

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
    localStorage.setItem(LANG_KEY, state.lang);
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

export function initStore() {
  const storedLang = normalizeLang(localStorage.getItem(LANG_KEY));
  state.lang = storedLang;
  state.theme = "dark";
  state.reducedMotion = false;
}
