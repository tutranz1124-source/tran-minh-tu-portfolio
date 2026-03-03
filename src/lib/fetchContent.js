let currentAbortController = null;
let lastGoodContent = null;
const contentCache = new Map();

export function getContentUrl(lang) {
  return `/public/CV/portfolio.${lang}.json`;
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

export async function loadContent(lang) {
  const targetLang = lang === "vi" ? "vi" : "en";

  if (contentCache.has(targetLang)) {
    return structuredClone(contentCache.get(targetLang));
  }

  if (currentAbortController) {
    currentAbortController.abort();
  }

  const ac = new AbortController();
  setAbortController(ac);

  const response = await fetch(getContentUrl(targetLang), {
    method: "GET",
    cache: "no-store",
    signal: ac.signal,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${targetLang.toUpperCase()} content (${response.status})`);
  }

  const content = await response.json();
  contentCache.set(targetLang, content);
  setLastGoodContent(content);

  return structuredClone(content);
}
