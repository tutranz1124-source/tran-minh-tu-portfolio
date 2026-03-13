import { clear, el } from "./dom.js";

function activeName(content, lang) {
  if (!content?.meta) {
    return "Portfolio";
  }
  return (lang === "vi" ? content.meta.name_vi : content.meta.name_en) || content.meta.name_en || content.meta.name_vi || "Portfolio";
}

function safeHref(raw) {
  if (!raw) {
    return "";
  }

  try {
    if (raw.startsWith("mailto:")) {
      return raw;
    }

    if (raw.startsWith("/") || raw.startsWith("./")) {
      return raw;
    }

    const absolute = new URL(raw, window.location.origin);
    if (["http:", "https:"].includes(absolute.protocol)) {
      return absolute.href;
    }
  } catch (_error) {
    return "";
  }

  return "";
}

function createActionButton({ label, href, kind = "secondary" }) {
  return el("a", `btn btn--${kind}`, {
    href,
    target: href.startsWith("http") ? "_blank" : "",
    rel: href.startsWith("http") ? "noopener noreferrer" : "",
  }, [label]);
}

function createCircleAction({ label, href, iconSvg, className = "", tip = "" }) {
  const actionClass = className ? `contact-fab__action ${className}` : "contact-fab__action";
  return el(
    "a",
    actionClass,
    {
      href,
      target: href.startsWith("http") ? "_blank" : "",
      rel: href.startsWith("http") ? "noopener noreferrer" : "",
      "aria-label": label,
      title: label,
    },
    [
      el("span", "u-sr-only", {}, [label]),
      el("span", "contact-fab__tip", { "aria-hidden": "true" }, [tip || label]),
      iconSvg,
    ],
  );
}

function createMotifCluster(extraClass = "") {
  const className = extraClass ? `motif-cluster ${extraClass}` : "motif-cluster";
  return el("div", className, { "aria-hidden": "true" }, [
    el("span", "motif-cluster__dot motif-cluster__dot--cyan"),
    el("span", "motif-cluster__dot motif-cluster__dot--green"),
    el("span", "motif-cluster__dot motif-cluster__dot--red"),
  ]);
}

function createRollingTitle(text, id, tag = "h2", extraClass = "") {
  const safeText = (text || "").trim() || "Experience";
  const className = extraClass ? `rolling-title ${extraClass}` : "rolling-title";
  return el(tag, className, { id }, [safeText]);
}

function createGlobeIcon() {
  return el("svg", "navbar__control-icon", { viewBox: "0 0 24 24", "aria-hidden": "true" }, [
    el("path", "", { d: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm7.8 9h-3.1a15.1 15.1 0 0 0-1.2-5A8 8 0 0 1 19.8 11ZM12 4.2c.9 0 2.3 2.1 2.9 6.8H9.1C9.7 6.3 11.1 4.2 12 4.2ZM8.5 6A15.1 15.1 0 0 0 7.3 11H4.2A8 8 0 0 1 8.5 6ZM4.2 13h3.1a15.1 15.1 0 0 0 1.2 5A8 8 0 0 1 4.2 13Zm7.8 6.8c-.9 0-2.3-2.1-2.9-6.8h5.8c-.6 4.7-2 6.8-2.9 6.8Zm3.5-1.8a15.1 15.1 0 0 0 1.2-5h3.1A8 8 0 0 1 15.5 18Z" }),
  ]);
}

function initialsFromName(name) {
  if (typeof name !== "string") {
    return "AV";
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "AV";
}

function applyHeroAvatarPlaceholder(core, displayName, lang) {
  core.replaceChildren(
    el("span", "hero__avatar-placeholder", { "aria-hidden": "true" }, [initialsFromName(displayName)]),
    el("span", "u-sr-only", {}, [lang === "vi" ? "Chỗ đặt ảnh đại diện tạm thời" : "Temporary avatar placeholder"]),
  );
}

function createHeroAvatar(meta, displayName, lang) {
  const avatarHref = safeHref(meta?.links?.avatar || meta?.avatar || meta?.photo || "");
  const wrapper = el("div", "hero__avatar", { "aria-label": lang === "vi" ? "Ảnh đại diện" : "Avatar" });

  const core = el("div", "hero__avatar-core");
  if (avatarHref) {
    const imageNode = el("img", "hero__avatar-img", {
      src: avatarHref,
      alt: lang === "vi" ? "Ảnh đại diện" : "Avatar",
      loading: "lazy",
      decoding: "async",
      draggable: "false",
    });
    imageNode.addEventListener("error", () => {
      applyHeroAvatarPlaceholder(core, displayName, lang);
    }, { once: true });
    core.appendChild(
      imageNode,
    );
  } else {
    applyHeroAvatarPlaceholder(core, displayName, lang);
  }

  wrapper.appendChild(core);
  return wrapper;
}

function splitRoleParts(rawRole) {
  const lines = normalizeRoleText(rawRole)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    title: lines[0] ?? "",
    company: lines.slice(1).join(" • "),
  };
}

function deriveHeroRoleLine(content, lang) {
  const base = lang === "vi"
    ? "Kỹ sư phần mềm Full-stack"
    : "Full-stack Software Engineer";
  const focus = lang === "vi"
    ? "Backend, Desktop App, Vận hành hệ thống"
    : "Backend, Desktop App, System Operations";
  return `${base} • ${focus}`;
}

function deriveCurrentRole(content) {
  const latest = (content?.experience?.items ?? []).slice(-1)[0] ?? {};
  return splitRoleParts(latest.role);
}

function createHeroProfilePanel(content, lang, displayName) {
  const currentRole = deriveCurrentRole(content);

  const profile = el("aside", "hero__profile", { "aria-label": lang === "vi" ? "Tóm tắt hồ sơ" : "Profile summary" });
  const top = el("div", "hero__profile-top", {}, [
    createHeroAvatar(content.meta ?? {}, displayName, lang),
    el("div", "hero__profile-copy", {}, [
      el("p", "hero__profile-label", {}, [lang === "vi" ? "Hiện tại" : "Currently"]),
      el("h3", "hero__profile-role", {}, [currentRole.title || (lang === "vi" ? "Kỹ sư phần mềm" : "Software Engineer")]),
      el("p", "hero__profile-company", {}, [currentRole.company || (lang === "vi" ? "Đang xây hệ thống thực tế" : "Building production systems")]),
    ]),
    createMotifCluster("hero__motif"),
  ]);

  profile.appendChild(top);
  return profile;
}

function normalizeDescLines(rawDesc) {
  if (Array.isArray(rawDesc)) {
    return rawDesc
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter(Boolean);
  }

  if (typeof rawDesc === "string") {
    return rawDesc
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeRoleText(rawRole) {
  if (Array.isArray(rawRole)) {
    return rawRole
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof rawRole === "string") {
    return rawRole.trim();
  }

  return "";
}

function createDescList(lines, listClass, itemClass) {
  const list = el("ul", listClass);
  lines.forEach((line) => {
    list.appendChild(el("li", itemClass, {}, [line]));
  });
  return list;
}

function normalizeExperienceImageLinks(item) {
  const rawLinks = [];

  if (Array.isArray(item?.images)) {
    item.images.forEach((entry) => {
      if (typeof entry === "string" && entry.trim()) {
        rawLinks.push(entry.trim());
      }
    });
  }

  if (typeof item?.image === "string" && item.image.trim()) {
    rawLinks.push(item.image.trim());
  }

  const unique = new Set();
  rawLinks.forEach((raw) => {
    const href = safeHref(raw);
    if (href) {
      unique.add(href);
    }
  });

  return Array.from(unique);
}

function seededFloat(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function imageSeed(src, index) {
  let hash = 0;
  for (let i = 0; i < src.length; i += 1) {
    hash = ((hash << 5) - hash + src.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) + (index + 1) * 97;
}

function createExperienceMedia(item, className, options = {}) {
  const media = el("div", className, { "aria-hidden": "true" });
  const imageLinks = normalizeExperienceImageLinks(item);
  if (options.showMeta === true) {
    const lang = options.lang === "vi" ? "vi" : "en";
    const meta = el("div", `${className}-meta`, {}, [
      el("span", `${className}-label`, {}, [options.label || "Stack"]),
      el("span", `${className}-count`, {}, [
        imageLinks.length
          ? String(imageLinks.length).padStart(2, "0")
          : (lang === "vi" ? "--" : "--"),
      ]),
    ]);
    media.appendChild(meta);
  } else {
    media.classList.add(`${className}--plain`);
  }

  if (!imageLinks.length) {
    media.classList.add("is-empty");
    return media;
  }

  const bubbles = el("div", `${className}-bubbles`);
  imageLinks.forEach((src, index) => {
    const bubble = el("span", `${className}-bubble`);
    bubble.style.setProperty("--bubble-index", String(index));
    const seed = imageSeed(src, index);
    const startX = (10 + seededFloat(seed + 7) * 80).toFixed(2);
    const startY = (10 + seededFloat(seed + 19) * 80).toFixed(2);
    const midX = (10 + seededFloat(seed + 31) * 80).toFixed(2);
    const midY = (10 + seededFloat(seed + 47) * 80).toFixed(2);
    const endX = (10 + seededFloat(seed + 59) * 80).toFixed(2);
    const endY = (10 + seededFloat(seed + 71) * 80).toFixed(2);
    const driftDuration = ((6.8 + seededFloat(seed + 43) * 4.4) * 0.614125).toFixed(2);
    const driftDelay = (-seededFloat(seed + 61) * driftDuration).toFixed(2);
    const driftScaleMid = (1.015 + seededFloat(seed + 73) * 0.045).toFixed(3);
    const driftScaleEnd = (0.97 + seededFloat(seed + 89) * 0.04).toFixed(3);
    const driftRotate = (seededFloat(seed + 101) * 12 - 6).toFixed(2);

    bubble.style.setProperty("--bubble-x-start", `${startX}%`);
    bubble.style.setProperty("--bubble-y-start", `${startY}%`);
    bubble.style.setProperty("--bubble-x-mid", `${midX}%`);
    bubble.style.setProperty("--bubble-y-mid", `${midY}%`);
    bubble.style.setProperty("--bubble-x-end", `${endX}%`);
    bubble.style.setProperty("--bubble-y-end", `${endY}%`);
    bubble.style.setProperty("--bubble-drift-duration", `${driftDuration}s`);
    bubble.style.setProperty("--bubble-drift-delay", `${driftDelay}s`);
    bubble.style.setProperty("--bubble-scale-mid", driftScaleMid);
    bubble.style.setProperty("--bubble-scale-end", driftScaleEnd);
    bubble.style.setProperty("--bubble-drift-rotate", `${driftRotate}deg`);

    const imageNode = el("img", `${className}-bubble-img`, {
      src,
      alt: "",
      loading: "lazy",
      decoding: "async",
      draggable: "false",
    });

    imageNode.addEventListener("error", () => {
      bubble.remove();
      if (!bubbles.childElementCount) {
        media.classList.remove("has-images");
      }
    }, { once: true });

    bubble.appendChild(imageNode);
    bubbles.appendChild(bubble);
  });

  media.classList.add("has-images");
  media.appendChild(bubbles);
  return media;
}

function getExperienceMediaLabel(lang) {
  return lang === "vi" ? "Nền tảng / Stack" : "Platform / Stack";
}

function getDetailsWorkItems(content) {
  return content.details_work?.items ?? content.more_work?.items ?? [];
}

function normalizeDetailPreviewLines(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((line) => String(line ?? "").split(/\r?\n/g))
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function splitLabeledPreview(line) {
  const safeLine = String(line ?? "").trim();
  const match = safeLine.match(/^([^:]+):\s*(.+)$/);
  if (!match) {
    return { label: "", text: safeLine };
  }
  return {
    label: match[1].trim(),
    text: match[2].trim(),
  };
}

function buildTimelinePreview(item, work, lang) {
  const fallbackLines = normalizeDescLines(item?.desc).map((line) => splitLabeledPreview(line));

  if (!work?.desc || typeof work.desc !== "object" || Array.isArray(work.desc)) {
    const project = work?.name?.trim() || "";
    const highlight = fallbackLines[0]?.text || project || "";
    return {
      project,
      highlight,
      highlightKind: "",
      bullets: fallbackLines.slice(highlight ? 1 : 0, 3),
    };
  }

  const labels = lang === "vi"
    ? {
        goal: "Mục tiêu",
        result: "Kết quả",
        tech: "Tech",
      }
    : {
        goal: "Goal",
        result: "Result",
        tech: "Tech",
      };

  const goal = normalizeDetailPreviewLines(work.desc.goal);
  const result = normalizeDetailPreviewLines(work.desc.result ?? work.desc.ressult);
  const tech = normalizeDetailPreviewLines(work.desc.tech);
  const project = work.name?.trim() || "";
  const highlight = result[0] || goal[0] || project || fallbackLines[0]?.text || "";
  const highlightKind = result[0]
    ? "result"
    : goal[0]
      ? "goal"
      : project
        ? "project"
        : "";

  const bullets = [];
  if (goal[0] && goal[0] !== highlight) {
    bullets.push({ kind: "goal", label: labels.goal, text: goal[0] });
  }
  if (result[0] && result[0] !== highlight) {
    bullets.push({ kind: "result", label: labels.result, text: result[0] });
  }
  if (tech.length) {
    bullets.push({ kind: "tech", label: labels.tech, text: tech.join(" • ") });
  }

  return {
    project,
    highlight,
    highlightKind,
    bullets: bullets.slice(0, 2),
  };
}

function splitExperienceDateLocation(rawValue) {
  const safeValue = String(rawValue ?? "").trim();
  if (!safeValue) {
    return { date: "", location: "" };
  }

  const [datePart, ...locationParts] = safeValue.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    date: datePart ?? safeValue,
    location: locationParts.join(", "),
  };
}

function resolveExperienceStageClass(index, total) {
  if (index === total - 1) {
    return "experience-timeline__item--current";
  }
  if (index === 0) {
    return "experience-timeline__item--origin";
  }
  return "experience-timeline__item--build";
}

function normalizeSkillTags(value) {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function resolveSkillMeta(rawKey, lang, index = 0) {
  const key = normalizeKeyForMatch(rawKey);
  const catalog = [
    {
      match: /ngon ngu|languages?/i,
      badge: "LG",
      level: 92,
      summary: {
        vi: "Ngôn ngữ chính dùng để xây backend, công cụ desktop và script vận hành.",
        en: "Core languages used for backend services, desktop tools, and ops scripts.",
      },
    },
    {
      match: /frontend/i,
      badge: "FE",
      level: 84,
      summary: {
        vi: "UI logic, dashboard flow và front-end implementation theo hướng gọn, ít phụ thuộc framework.",
        en: "UI implementation, dashboard flows, and framework-light frontend delivery.",
      },
    },
    {
      match: /backend/i,
      badge: "BE",
      level: 93,
      summary: {
        vi: "API, auth, xử lý dữ liệu và kết nối nhiều thành phần trong hệ thống.",
        en: "API design, auth, data handling, and service-to-service integration.",
      },
    },
    {
      match: /co so du lieu|database/i,
      badge: "DB",
      level: 87,
      summary: {
        vi: "Thiết kế dữ liệu, truy vấn và lựa chọn storage phù hợp với bài toán vận hành thực tế.",
        en: "Schema design, querying, and practical storage decisions for live systems.",
      },
    },
    {
      match: /he thong|systems?/i,
      badge: "OS",
      level: 88,
      summary: {
        vi: "Server, shell tooling và môi trường triển khai tự chủ cho các hệ thống vận hành thực tế.",
        en: "Server setup, shell tooling, and self-managed deployment environments.",
      },
    },
    {
      match: /van hanh|operations?/i,
      badge: "OP",
      level: 90,
      summary: {
        vi: "Backup, failover, monitoring và workflow giúp hệ thống chạy ổn định hằng ngày.",
        en: "Backup, failover, monitoring, and workflows that keep systems stable.",
      },
    },
  ];

  const found = catalog.find((entry) => entry.match.test(key));
  if (found) {
    return found;
  }

  const fallbackBadges = ["ST", "PX", "SY", "DV"];
  return {
    badge: fallbackBadges[index % fallbackBadges.length],
    level: 80,
    summary: {
      vi: "Nhóm kỹ năng hỗ trợ triển khai và thích ứng nhanh theo từng bài toán cụ thể.",
      en: "Supporting skills used pragmatically based on product and system needs.",
    },
  };
}

function normalizeKeyForMatch(rawKey) {
  return String(rawKey ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isPrioritySkill(rawKey) {
  const key = normalizeKeyForMatch(rawKey);
  return /backend|he thong|systems?|van hanh|operations?/.test(key);
}

function resolveSkillVariantClass(rawKey) {
  const key = normalizeKeyForMatch(rawKey);
  if (/backend/.test(key)) {
    return "skill-group--backend";
  }
  if (/he thong|systems?/.test(key)) {
    return "skill-group--systems";
  }
  if (/van hanh|operations?/.test(key)) {
    return "skill-group--operations";
  }
  return "";
}

function getSkillOrderScore(rawKey) {
  const key = normalizeKeyForMatch(rawKey);
  if (/backend/.test(key)) {
    return 0;
  }
  if (/he thong|systems?/.test(key)) {
    return 1;
  }
  if (/van hanh|operations?/.test(key)) {
    return 2;
  }
  if (/ngon ngu|languages?/.test(key)) {
    return 3;
  }
  if (/frontend/.test(key)) {
    return 4;
  }
  if (/co so du lieu|database|databases/.test(key)) {
    return 5;
  }
  return 99;
}

function createSkeleton() {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(
    el("section", "section topband topband--single", { id: "top" }, [
      el("article", "card", {}, [
        el("div", "skel skel--text"),
        el("div", "skel skel--text", { style: "margin-top:12px;width:76%;" }),
        el("div", "skel skel--text", { style: "margin-top:12px;width:90%;" }),
      ]),
    ]),
  );
  return fragment;
}

function createNavbarContent(state) {
  const { lang, playMode } = state;
  const root = el("div", "navbar__card");
  const inner = el("div", "navbar__inner", { role: "navigation", "aria-label": "Main navigation" });
  const nextLang = lang === "vi" ? "en" : "vi";
  const langLabel = lang === "vi" ? "VI" : "EN";

  const right = el("div", "navbar__right");
  right.appendChild(
    el(
      "button",
      "navbar__control-btn navbar__control-btn--lang",
      {
        type: "button",
        dataset: { langToggle: "true", langNext: nextLang },
        "aria-label": lang === "vi" ? "Switch to English" : "Chuyen sang tieng Viet",
      },
      [
        createGlobeIcon(),
        el("span", "navbar__control-text", {}, [langLabel]),
      ],
    ),
  );
  right.appendChild(
    el(
      "button",
      `navbar__control-btn navbar__control-btn--hide${playMode ? " is-active" : ""}`,
      {
        type: "button",
        dataset: { playMode: "toggle" },
        "aria-pressed": playMode ? "true" : "false",
        "aria-label": lang === "vi" ? "Bật hoặc tắt Hide UI" : "Toggle Hide UI",
      },
      ["Hide UI"],
    ),
  );
  inner.appendChild(right);

  root.appendChild(inner);
  return root;
}

function createPlayModeScreen(state) {
  const name = activeName(state.content, state.lang);
  const lang = state.lang;
  const controls = el("div", "play-mode-screen__controls", {
    role: "group",
    "aria-label": lang === "vi" ? "Điều khiển màu fluid" : "Fluid color controls",
  }, [
    el(
      "button",
      "play-mode-screen__control",
      {
        type: "button",
        dataset: { fluidPlay: "random" },
        "aria-label": lang === "vi" ? "Màu ngẫu nhiên" : "Random color",
      },
      [lang === "vi" ? "Màu ngẫu nhiên" : "Random Color"],
    ),
    el(
      "button",
      "play-mode-screen__control",
      {
        type: "button",
        dataset: { fluidPlay: "default" },
        "aria-label": lang === "vi" ? "Mặc định" : "Back to default",
      },
      [lang === "vi" ? "Mặc định" : "Default"],
    ),
  ]);
  return el("section", "play-mode-screen reveal reveal--section", { id: "top", "aria-label": "Play mode" }, [
    el("p", "play-mode-screen__text", { "aria-hidden": "true" }, [name]),
    controls,
  ]);
}

function createHeroCard(state, content) {
  const lang = state.lang;
  const meta = content.meta ?? {};
  const hero = content.hero ?? {};
  const displayName = activeName(content, lang);
  const heroBadge = typeof hero.badge === "string" ? hero.badge.trim() : "";
  const emailHref = meta.email ? `mailto:${meta.email}` : "";

  const card = el("article", "card hero hero--spotlight rolling-panel reveal", { "aria-labelledby": "hero-title" });
  const layout = el("div", "hero__layout");
  const intro = el("div", "hero__intro");

  if (heroBadge) {
    intro.appendChild(el("span", "hero__badge", {}, [heroBadge]));
  }

  intro.appendChild(
    el("div", "hero__titles", {}, [
      createRollingTitle(displayName, "hero-title", "h1"),
      el("p", "hero__role-line", {}, [deriveHeroRoleLine(content, lang)]),
    ]),
  );

  if (hero.tagline) {
    intro.appendChild(
      el("div", "hero__message", {}, [
        el("p", "hero__tagline hero__tagline--lead", {}, [hero.tagline]),
      ]),
    );
  }

  const about = el("div", "hero__about");
  (hero.about_paragraphs ?? []).slice(0, 3).forEach((paragraph, index) => {
    about.appendChild(el("p", `hero__about-copy${index === 0 ? " hero__about-copy--primary" : ""}`, {}, [paragraph]));
  });
  intro.appendChild(about);

  const cta = el("div", "hero__cta");
  cta.appendChild(
      createActionButton({
      label: lang === "vi" ? "Liên hệ qua email" : "Contact via Email",
      href: emailHref || "#top",
      kind: "primary",
    }),
  );
  const cvHref = safeHref(meta.links?.cv || "");
  if (state.cvAvailable && cvHref) {
    cta.appendChild(createActionButton({ label: lang === "vi" ? "Tải CV" : "Download CV", href: cvHref, kind: "secondary" }));
  }
  intro.appendChild(cta);

  layout.append(intro, createHeroProfilePanel(content, lang, displayName));
  card.appendChild(layout);
  return card;
}

function createExperienceSection(content, lang) {
  const experience = content.experience ?? {};
  const works = getDetailsWorkItems(content);

  const section = el("section", "section reveal reveal--section", { id: "experience" });
  const card = el("article", "card list-card experience reveal", { "aria-labelledby": "experience-title" });
  card.appendChild(el("h2", "", { id: "experience-title" }, [experience.title ?? "Experience"]));
  card.appendChild(el("p", "list-card__subtitle", {}, [experience.subtitle ?? "Recent roles"]));

  const list = el("ul", "experience-grid");
  (experience.items ?? []).slice(0, 4).forEach((item, index) => {
    const hasWork = Boolean(works[index]);
    const descLines = normalizeDescLines(item.desc);
    const roleText = normalizeRoleText(item.role) || "";
    const body = el("div", "experience-tile__body", {}, [
      el("h3", "experience-tile__role", {}, [roleText]),
      el("p", "item__meta", {}, [item.date ?? ""]),
      descLines.length
        ? createDescList(descLines, "item__desc-list", "item__desc")
        : el("p", "item__desc", {}, [item.desc ?? ""]),
    ]);
    const node = el("li", `item experience-tile${hasWork ? " is-clickable" : ""}`, hasWork ? {
      dataset: { workOpen: String(index), motionStyle: "zoom" },
      tabindex: "0",
      role: "button",
      "aria-haspopup": "dialog",
      "aria-label":
        lang === "vi"
          ? `Mở chi tiết công việc liên quan: ${item.role ?? "Kinh nghiệm"}`
          : `Open related work details: ${item.role ?? "Experience"}`,
    } : {}, [
      createExperienceMedia(item, "experience-tile__media", {
        lang,
        showMeta: false,
      }),
      body,
    ]);
    list.appendChild(node);
  });
  card.appendChild(list);
  section.appendChild(card);
  return section;
}

function createExperienceTimelineSection(content, lang) {
  const experience = content.experience ?? {};
  const experienceItems = experience.items ?? [];
  const works = getDetailsWorkItems(content);
  if (!experienceItems.length) {
    return null;
  }

  const rawSectionTitle = typeof experience.title === "string" ? experience.title.trim() : "";
  const sectionTitle = rawSectionTitle || (lang === "vi" ? "Kinh nghiệm" : "Experience");
  const sectionSubtitle = lang === "vi"
    ? "Timeline tập trung vào vai trò, bối cảnh dự án và kết quả chính."
    : "A concise timeline focused on role, project context, and key outcomes.";

  const section = el("section", "section reveal reveal--section", { id: "experience" });
  const card = el("article", "card list-card experience-timeline-panel rolling-panel reveal", { "aria-labelledby": "experience-timeline-title" });
  const head = el("div", "list-card__head", {}, [
    createRollingTitle(sectionTitle, "experience-timeline-title"),
    el("p", "list-card__subtitle experience-timeline-panel__subtitle", {}, [sectionSubtitle]),
  ]);
  card.appendChild(head);

  const timeline = el("ol", "experience-timeline");
  experienceItems.slice(0, 4).forEach((item, index) => {
    const role = splitRoleParts(item.role);
    const work = works[index];
    const preview = buildTimelinePreview(item, work, lang);
    const dateMeta = splitExperienceDateLocation(item.date);
    const hasWork = Boolean(work);
    const stageClass = resolveExperienceStageClass(index, Math.min(experienceItems.length, 4));
    const media = createExperienceMedia(item, "experience-tile__media", {
      lang,
      showMeta: false,
    });
    media.classList.add("experience-timeline__media");

    const bulletList = el("ul", "experience-timeline__bullets");
    if (preview.highlight && preview.highlightKind && preview.highlightKind !== "project") {
      bulletList.appendChild(
        el("li", `experience-timeline__bullet experience-timeline__bullet--${preview.highlightKind}`, {}, [
          el("span", "experience-timeline__bullet-label", {}, [preview.highlightKind === "result"
            ? (lang === "vi" ? "Kết quả" : "Result")
            : (lang === "vi" ? "Mục tiêu" : "Goal")]),
          el("span", "experience-timeline__bullet-text", {}, [preview.highlight]),
        ]),
      );
    }
    preview.bullets.slice(0, 2).forEach((bullet) => {
      const bulletRow = el("li", `experience-timeline__bullet${bullet.kind ? ` experience-timeline__bullet--${bullet.kind}` : ""}`, {}, [
        bullet.label ? el("span", "experience-timeline__bullet-label", {}, [bullet.label]) : null,
        el("span", "experience-timeline__bullet-text", {}, [bullet.text]),
      ].filter(Boolean));
      bulletList.appendChild(bulletRow);
    });

    const body = el("div", "experience-timeline__body", {}, [
      el("div", "experience-timeline__eyebrow", {}, [work?.meta ?? item.date ?? ""]),
      el("h3", "experience-timeline__role", {}, [role.title || sectionTitle]),
      role.company ? el("p", "experience-timeline__company", {}, [role.company]) : null,
      preview.project && preview.project !== preview.highlight ? el("p", "experience-timeline__project", {}, [preview.project]) : null,
      bulletList.childElementCount ? bulletList : null,
      hasWork
        ? el("span", "experience-timeline__hint", {}, [lang === "vi" ? "Nhấn để mở chi tiết" : "Click for full case details"])
        : null,
    ].filter(Boolean));

    const timelineCardAttrs = hasWork
      ? {
          role: "button",
          tabindex: "0",
          "aria-haspopup": "dialog",
          "aria-label":
            lang === "vi"
              ? `Mở chi tiết: ${role.title || "Kinh nghiệm"}`
              : `Open details: ${role.title || "Experience"}`,
          dataset: {
            workOpen: String(index),
            motionStyle: "shared",
          },
        }
      : {};

    const stageCardClass = stageClass.replace("experience-timeline__item--", "experience-timeline__card--");
    const timelineCard = el("article", `experience-timeline__card ${stageCardClass}${hasWork ? " is-clickable" : ""}`, timelineCardAttrs, [
      media,
      body,
    ]);

    timeline.appendChild(
      el("li", `experience-timeline__item ${stageClass}`, {}, [
        el("div", "experience-timeline__date", {}, [
          el("span", "experience-timeline__date-main", {}, [dateMeta.date || item.date || ""]),
          dateMeta.location ? el("span", "experience-timeline__date-sub", {}, [dateMeta.location]) : null,
        ].filter(Boolean)),
        el("div", "experience-timeline__rail", { "aria-hidden": "true" }, [
          el("span", "experience-timeline__dot"),
          el("span", "experience-timeline__line"),
        ]),
        timelineCard,
      ]),
    );
  });

  card.appendChild(timeline);
  section.appendChild(card);
  return section;
}

function createSkillsSection(content, lang) {
  const skills = content.skills ?? {};
  const section = el("section", "section reveal reveal--section", { id: "skills" });
  const card = el("article", "card list-card skills-system-panel rolling-panel reveal", { "aria-labelledby": "skills-title" });
  const subtitle =
    lang === "vi"
      ? "Nhóm kỹ năng được trình bày theo chiều sâu và phạm vi triển khai."
      : "Capabilities grouped by depth, usage, and system responsibility.";

  card.appendChild(
    el("div", "list-card__head", {}, [
      createRollingTitle(skills.title ?? "Skills", "skills-title"),
      el("p", "list-card__subtitle skills-system-panel__subtitle", {}, [subtitle]),
    ]),
  );

  const list = el("div", "skills-system");
  const orderedSkills = [...(skills.items ?? [])].slice(0, 6);

  orderedSkills.forEach((item, index) => {
    const meta = resolveSkillMeta(item.key, lang, index);
    const tags = normalizeSkillTags(item.value).slice(0, 4);
    const group = el("article", "skill-group card--inner rolling-panel reveal");
    const tagRow = el("div", "skill-group__tags");
    tags.forEach((tag) => {
      tagRow.appendChild(el("span", "skill-group__tag", {}, [tag]));
    });

    const headingNodes = [
      el("h3", "skill-group__title", {}, [item.key ?? ""]),
      el("p", "skill-group__summary", {}, [meta.summary[lang] ?? meta.summary.en]),
    ];

    group.append(
      el("div", "skill-group__head", {}, [
        el("div", "skill-group__heading", {}, headingNodes),
      ]),
      tagRow,
    );

    list.appendChild(group);
  });

  card.appendChild(list);
  section.appendChild(card);
  return section;
}

function createFloatingContactMenu(content, state) {
  const lang = state.lang;
  const meta = content.meta ?? {};
  const emailHref = meta.email ? `mailto:${meta.email}` : "";
  const cvHref = safeHref(meta.links?.cv || "");

  const root = el("div", "contact-fab", { id: "contact-fab" });
  const actions = el("div", "contact-fab__actions", { id: "contact-fab-actions", "aria-hidden": "true" });

  if (emailHref) {
    actions.appendChild(
      createCircleAction({
        label: "Email",
        href: emailHref,
        className: "contact-fab__action--email",
        tip: "Email",
        iconSvg: el("svg", "contact-fab__icon", { viewBox: "0 0 24 24", "aria-hidden": "true" }, [
          el("path", "", { d: "M3 6.2c0-1.2 1-2.2 2.2-2.2h13.6c1.2 0 2.2 1 2.2 2.2v11.6c0 1.2-1 2.2-2.2 2.2H5.2c-1.2 0-2.2-1-2.2-2.2V6.2Zm2.2-.2L12 11l6.8-5H5.2Zm13.8 12V8.2l-6.4 4.7a1 1 0 0 1-1.2 0L5 8.2V18h14Z" }),
        ]),
      }),
    );
  }

  if (state.cvAvailable && cvHref) {
    actions.appendChild(
      createCircleAction({
        label: lang === "vi" ? "Tải CV" : "Download CV",
        href: cvHref,
        className: "contact-fab__action--cv",
        tip: "CV",
        iconSvg: el("svg", "contact-fab__icon", { viewBox: "0 0 24 24", "aria-hidden": "true" }, [
          el("path", "", { d: "M12 3c.6 0 1 .4 1 1v8.1l2.5-2.5a1 1 0 1 1 1.4 1.4l-4.2 4.2a1 1 0 0 1-1.4 0L7.1 11a1 1 0 1 1 1.4-1.4L11 12.1V4c0-.6.4-1 1-1ZM5.2 17h13.6A2.2 2.2 0 0 1 21 19.2v.6A2.2 2.2 0 0 1 18.8 22H5.2A2.2 2.2 0 0 1 3 19.8v-.6A2.2 2.2 0 0 1 5.2 17Zm0 2v1h13.6v-1H5.2Z" }),
        ]),
      }),
    );
  }

  if (!actions.children.length) {
    return null;
  }

  root.appendChild(actions);
  root.appendChild(
    el("button", "contact-fab__trigger", {
      type: "button",
      "aria-label": lang === "vi" ? "Mở menu liên hệ" : "Open contact menu",
      "aria-controls": "contact-fab-actions",
      "aria-expanded": "false",
      dataset: { contactFabToggle: "true" },
    }, [
      el("svg", "contact-fab__icon contact-fab__icon--menu", { viewBox: "0 0 24 24", "aria-hidden": "true" }, [
        el("path", "", { d: "M4 7.5c0-.6.4-1 1-1h14a1 1 0 1 1 0 2H5c-.6 0-1-.4-1-1Zm0 4.5c0-.6.4-1 1-1h14a1 1 0 1 1 0 2H5c-.6 0-1-.4-1-1Zm0 4.5c0-.6.4-1 1-1h14a1 1 0 1 1 0 2H5c-.6 0-1-.4-1-1Z" }),
      ]),
    ]),
  );

  return root;
}

function createSiteFooter(content) {
  const footer = el("footer", "site-footer");
  const note = content.footer?.note ? `${content.footer.note} - ` : "";
  footer.appendChild(el("p", "site-footer__note", {}, [`${note}Made by Tran Minh Tu 2026`]));
  return footer;
}

function createWorkPopup() {
  const panel = el("div", "work-popup__panel", {}, [
    el("h3", "work-popup__title", { id: "work-popup-title" }, [""]),
    el("ul", "item__desc-list work-popup__desc-list", { id: "work-popup-desc" }, []),
    el("p", "item__meta work-popup__meta", { id: "work-popup-meta" }, [""]),
  ]);

  const frame = el("div", "work-popup__frame", {}, [
    el("button", "work-popup__close", { type: "button", dataset: { workClose: "true" }, "aria-label": "Close" }, ["\u00d7"]),
    panel,
  ]);

  return el("dialog", "work-popup", { id: "work-popup", "aria-hidden": "true", "aria-labelledby": "work-popup-title" }, [
    el("div", "work-popup__backdrop", { dataset: { workClose: "true" } }),
    frame,
  ]);
}

export function renderApp(state) {
  const app = document.getElementById("app");
  const navbarMount = document.getElementById("navbar");
  if (!app || !navbarMount) {
    return;
  }

  clear(navbarMount);
  navbarMount.appendChild(createNavbarContent(state));
  clear(app);

  if (!state.content) {
    app.appendChild(createSkeleton());
    return;
  }

  const fragment = document.createDocumentFragment();
  if (state.playMode) {
    fragment.appendChild(createPlayModeScreen(state));
  } else {
    fragment.appendChild(el("section", "section topband topband--single reveal reveal--section", { id: "top" }, [createHeroCard(state, state.content)]));
    const experienceTimeline = createExperienceTimelineSection(state.content, state.lang);
    if (experienceTimeline) {
      fragment.appendChild(experienceTimeline);
    }
    fragment.appendChild(createSkillsSection(state.content, state.lang));
    const contactFab = createFloatingContactMenu(state.content, state);
    if (contactFab) {
      fragment.appendChild(contactFab);
    }
    fragment.appendChild(createSiteFooter(state.content));
    fragment.appendChild(createWorkPopup());
  }

  app.appendChild(fragment);
  document.documentElement.lang = state.lang;
  document.title = `${activeName(state.content, state.lang)} | Portfolio`;
}
