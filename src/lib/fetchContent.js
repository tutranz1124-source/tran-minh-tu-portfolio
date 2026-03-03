let currentAbortController = null;
let lastGoodContent = null;
const contentCache = new Map();
const inflightRequests = new Map();

export function getContentUrl(lang) {
  return `./public/CV/portfolio.${lang}.json`;
}

export function setAbortController(ac) {
  currentAbortController = ac;
}

export function getLastGoodContent() {
  return lastGoodContent;
}

export function setLastGoodContent(content) {
  lastGoodContent = content;
}

function normalizeLang(lang) {
  return lang === "vi" ? "vi" : "en";
}

function deepFreezeObject(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  Object.values(value).forEach((entry) => {
    deepFreezeObject(entry);
  });
  return value;
}

function trackInflight(lang, promise) {
  inflightRequests.set(lang, promise);
  promise.finally(() => {
    if (inflightRequests.get(lang) === promise) {
      inflightRequests.delete(lang);
    }
  });
  return promise;
}

async function fetchAndCacheContent(lang, options = {}) {
  const { signal, cacheMode = "default" } = options;
  const response = await fetch(getContentUrl(lang), {
    method: "GET",
    cache: cacheMode,
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${lang.toUpperCase()} content (${response.status})`);
  }

  const content = deepFreezeObject(await response.json());
  contentCache.set(lang, content);
  setLastGoodContent(content);
  return content;
}

export async function loadContent(lang) {
  const targetLang = normalizeLang(lang);

  if (contentCache.has(targetLang)) {
    const cached = contentCache.get(targetLang);
    setLastGoodContent(cached);
    return cached;
  }

  const existingRequest = inflightRequests.get(targetLang);
  if (existingRequest) {
    return existingRequest;
  }

  if (currentAbortController) {
    currentAbortController.abort();
  }

  const ac = new AbortController();
  setAbortController(ac);

  const request = fetchAndCacheContent(targetLang, { signal: ac.signal }).finally(() => {
    if (currentAbortController === ac) {
      setAbortController(null);
    }
  });

  return trackInflight(targetLang, request);
}

export function prefetchContent(lang) {
  const targetLang = normalizeLang(lang);

  if (contentCache.has(targetLang)) {
    return Promise.resolve(contentCache.get(targetLang));
  }

  const existingRequest = inflightRequests.get(targetLang);
  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchAndCacheContent(targetLang, { cacheMode: "force-cache" });

  return trackInflight(targetLang, request);
}

