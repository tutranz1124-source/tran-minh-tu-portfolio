import { clear, el } from "./dom.js";

const NAV_ITEMS = [
  { id: "top", label: { en: "Top", vi: "\u0110\u1ea7u trang" } },
  { id: "experience", label: { en: "Experience", vi: "Kinh nghi\u1ec7m" } },
  { id: "skills", label: { en: "Skills", vi: "K\u1ef9 n\u0103ng" } },
];

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function localizedLabel(labelMap, lang) {
  return labelMap?.[lang] ?? labelMap?.en ?? "";
}

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

function createRollingTitle(text, id, tag = "h2", extraClass = "") {
  const safeText = (text || "").trim() || "Experience";
  const className = extraClass ? `rolling-title ${extraClass}` : "rolling-title";
  const title = el(tag, className, { id, tabindex: "0", "aria-label": safeText });
  const srText = el("span", "u-sr-only", {}, [safeText]);
  const visual = el("span", "rolling-title__visual", { "aria-hidden": "true" });

  Array.from(safeText).forEach((char, index) => {
    const cell = el("span", `rolling-title__cell${char === " " ? " is-space" : ""}`);
    cell.style.setProperty("--roll-index", String(index));
    cell.appendChild(el("span", "rolling-title__char", {}, [char === " " ? "\u00a0" : char]));
    visual.appendChild(cell);
  });

  title.append(srText, visual);
  return title;
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
    el("span", "u-sr-only", {}, [lang === "vi" ? "Cho dat anh dai dien tam thoi" : "Temporary avatar placeholder"]),
  );
}

function createHeroAvatar(meta, displayName, lang) {
  const avatarHref = safeHref(meta?.links?.avatar || meta?.avatar || meta?.photo || "");
  const wrapper = el("div", "hero__avatar", { "aria-label": lang === "vi" ? "Anh dai dien" : "Avatar" });

  wrapper.appendChild(el("span", "hero__avatar-wave hero__avatar-wave--outer", { "aria-hidden": "true" }));
  wrapper.appendChild(el("span", "hero__avatar-wave hero__avatar-wave--inner", { "aria-hidden": "true" }));

  const core = el("div", "hero__avatar-core");
  if (avatarHref) {
    const imageNode = el("img", "hero__avatar-img", {
      src: avatarHref,
      alt: lang === "vi" ? "Anh dai dien" : "Avatar",
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

function createExperienceMedia(item, className) {
  const media = el("div", className, { "aria-hidden": "true" });
  const imageLinks = normalizeExperienceImageLinks(item);
  if (!imageLinks.length) {
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

function getDetailsWorkItems(content) {
  return content.details_work?.items ?? content.more_work?.items ?? [];
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
  const { content, lang, activeSection, drawerOpen, playMode } = state;
  const root = el("div", "navbar__card");
  const inner = el("div", "navbar__inner", { role: "navigation", "aria-label": "Main navigation" });
  const name = activeName(content, lang);

  inner.appendChild(
    el("div", "navbar__left", {}, [
      el("p", "navbar__name", { id: "navbar-name" }, [name]),
    ]),
  );

  const links = el("nav", "navbar__links", { id: "nav-links", "aria-label": "Section links" });
  NAV_ITEMS.forEach((item) => {
    links.appendChild(
      el("a", `navbar__link${activeSection === item.id ? " is-active" : ""}`, {
        href: `#${item.id}`,
        dataset: { section: item.id },
      }, [localizedLabel(item.label, lang)]),
    );
  });
  inner.appendChild(links);

  const right = el("div", "navbar__right");
  right.appendChild(
    el("div", "navbar__lang", { role: "group", "aria-label": "Language switcher" }, [
      el("button", `navbar__lang-btn${lang === "en" ? " is-active" : ""}`, { type: "button", dataset: { lang: "en" }, "aria-pressed": lang === "en" ? "true" : "false" }, ["EN"]),
      el("button", `navbar__lang-btn${lang === "vi" ? " is-active" : ""}`, { type: "button", dataset: { lang: "vi" }, "aria-pressed": lang === "vi" ? "true" : "false" }, ["VI"]),
    ]),
  );
  if (!isMobileViewport()) {
    right.appendChild(
      el(
        "button",
        `navbar__play-btn${playMode ? " is-active" : ""}`,
        {
          type: "button",
          dataset: { playMode: "toggle" },
          "aria-pressed": playMode ? "true" : "false",
          "aria-label": lang === "vi" ? "Bat tat Play Mode" : "Toggle Play Mode",
        },
        [lang === "vi" ? "Play" : "Play"],
      ),
    );
  }
  right.appendChild(
    el("button", "navbar__icon-btn", {
      type: "button",
      id: "drawer-toggle",
      "aria-label": lang === "vi" ? "M\u1edf menu" : "Open menu",
      "aria-expanded": drawerOpen ? "true" : "false",
      "aria-controls": "mobile-drawer",
    }, ["\u2630"]),
  );
  inner.appendChild(right);

  root.appendChild(inner);

  const drawer = el("div", `drawer${drawerOpen ? " is-open" : ""}`, {
    id: "mobile-drawer",
    role: "dialog",
    "aria-modal": "true",
    "aria-hidden": drawerOpen ? "false" : "true",
  });
  const panel = el("div", "drawer__panel", { tabindex: "-1" });
  NAV_ITEMS.forEach((item) => {
    panel.appendChild(
      el("a", `drawer__item${activeSection === item.id ? " is-active" : ""}`, {
        href: `#${item.id}`,
        dataset: { section: item.id },
      }, [localizedLabel(item.label, lang)]),
    );
  });
  drawer.appendChild(panel);
  root.appendChild(drawer);
  return root;
}

function createPlayModeScreen(state) {
  const name = activeName(state.content, state.lang);
  return el("section", "play-mode-screen reveal reveal--section", { id: "top", "aria-label": "Play mode" }, [
    el("p", "play-mode-screen__text", { "aria-hidden": "true" }, [name]),
  ]);
}

function createHeroCard(state, content) {
  const lang = state.lang;
  const meta = content.meta ?? {};
  const hero = content.hero ?? {};
  const displayName = activeName(content, lang);
  const heroBadge = typeof hero.badge === "string" ? hero.badge.trim() : "";
  const emailHref = meta.email ? `mailto:${meta.email}` : "";
  const linkedinHref = safeHref(meta.links?.linkedin || "");

  const card = el("article", "card hero rolling-panel reveal", { "aria-labelledby": "hero-title" });
  if (heroBadge) {
    card.appendChild(el("span", "hero__badge", {}, [heroBadge]));
  }
  card.appendChild(
    el("div", "hero__head", {}, [
      el("div", "hero__titles", {}, [
        createRollingTitle(displayName, "hero-title", "h1"),
        el("p", "hero__subtitle", {}, [meta.title ?? "Software Engineer / Full-stack Developer"]),
      ]),
      createHeroAvatar(meta, displayName, lang),
    ]),
  );

  if (hero.tagline) {
    card.appendChild(el("p", "hero__tagline u-line-clamp-2", {}, [hero.tagline]));
  }

  const about = el("div", "hero__about");
  (hero.about_paragraphs ?? []).slice(0, 2).forEach((paragraph) => {
    about.appendChild(el("p", "u-line-clamp-3", {}, [paragraph]));
  });
  card.appendChild(about);

  const cta = el("div", "hero__cta");
  cta.appendChild(
    createActionButton({
      label: lang === "vi" ? "Li\u00ean h\u1ec7" : "Contact",
      href: emailHref || linkedinHref || "#top",
      kind: "primary",
    }),
  );
  const cvHref = safeHref(meta.links?.cv || "");
  if (state.cvAvailable && cvHref) {
    cta.appendChild(createActionButton({ label: lang === "vi" ? "T\u1ea3i CV" : "Download CV", href: cvHref }));
  }
  card.appendChild(cta);
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
          ? `Mở chi tiết work liên quan: ${item.role ?? "Kinh nghiệm"}`
          : `Open related work details: ${item.role ?? "Experience"}`,
    } : {}, [
      createExperienceMedia(item, "experience-tile__media"),
      body,
    ]);
    list.appendChild(node);
  });
  card.appendChild(list);
  section.appendChild(card);
  return section;
}

function createExperienceCarouselSection(content, lang) {
  const experience = content.experience ?? {};
  const experienceItems = experience.items ?? [];
  const works = getDetailsWorkItems(content);
  if (!experienceItems.length) {
    return null;
  }
  const carouselItems = experienceItems.slice(0, 3);
  const rawSectionTitle = typeof experience.title === "string" ? experience.title.trim() : "";
  const sectionTitle = rawSectionTitle || (lang === "vi" ? "Kinh nghiem" : "Experience");

  const section = el("section", "section reveal reveal--section", { id: "experience" });
  const card = el("article", "card list-card experience-carousel-panel rolling-panel reveal", { "aria-labelledby": "experience-carousel-title" });
  card.appendChild(createRollingTitle(sectionTitle, "experience-carousel-title"));

  const stage = el("div", "exp-carousel-stage", { id: "experience-carousel-stage" });
  const swiper = el("div", "swiper exp-carousel", { id: "experience-carousel-swiper" });
  const wrapper = el("div", "swiper-wrapper");

  const palette = [
    ["#05070c", "#070b16"],
    ["#05070c", "#08121f"],
    ["#05070c", "#0a1525"],
    ["#05070c", "#091321"],
    ["#05070c", "#0b1729"],
  ];

  carouselItems.forEach((item, index) => {
    const colors = palette[index % palette.length];
    const hasWork = Boolean(works[index]);
    const descLines = normalizeDescLines(item.desc);
    const roleText = normalizeRoleText(item.role) || sectionTitle;
    const body = el("div", "exp-carousel__body", {}, [
      el("h3", "exp-carousel__title", {}, [roleText]),
      el("p", "exp-carousel__meta", {}, [item.date ?? ""]),
      descLines.length
        ? createDescList(descLines, "exp-carousel__desc-list", "exp-carousel__desc")
        : el("p", "exp-carousel__desc", {}, [item.desc ?? ""]),
    ]);
    const slide = el(
      "div",
      "swiper-slide exp-carousel__slide",
      {
        dataset: { bg: `${colors[0]}, ${colors[1]}` },
      },
      [
        el(
          "article",
          "exp-carousel__card",
          hasWork
            ? {
                role: "button",
                tabindex: "0",
                "aria-haspopup": "dialog",
                "aria-label":
                  lang === "vi"
                    ? `Mo chi tiet: ${item.role ?? "Kinh nghiem"}`
                    : `Open details: ${item.role ?? "Experience"}`,
                dataset: {
                  workOpen: String(index),
                  motionStyle: "zoom",
                },
              }
            : {},
          [
            createExperienceMedia(item, "exp-carousel__media"),
            body,
          ],
        ),
      ],
    );
    wrapper.appendChild(slide);
  });

  swiper.appendChild(wrapper);
  stage.appendChild(swiper);
  stage.appendChild(el("div", "swiper-button-prev exp-carousel-prev", { "aria-label": "Previous slide" }));
  stage.appendChild(el("div", "swiper-button-next exp-carousel-next", { "aria-label": "Next slide" }));
  stage.appendChild(el("div", "swiper-pagination exp-carousel-pagination"));

  card.appendChild(stage);
  section.appendChild(card);
  return section;
}

function createSkillsSection(content) {
  const skills = content.skills ?? {};
  const section = el("section", "section reveal reveal--section", { id: "skills" });
  const card = el("article", "card list-card rolling-panel reveal", { "aria-labelledby": "skills-title" });
  card.appendChild(createRollingTitle(skills.title ?? "Skills", "skills-title"));

  const list = el("ul", "skills-vertical-grid");
  (skills.items ?? []).slice(0, 8).forEach((item) => {
    list.appendChild(
      el("li", "skill-tile", {}, [
        el("strong", "skill-tile__key", {}, [item.key ?? ""]),
        el("p", "skill-tile__value", {}, [item.value ?? ""]),
      ]),
    );
  });
  card.appendChild(list);
  section.appendChild(card);
  return section;
}

function createFloatingContactMenu(content, state) {
  const lang = state.lang;
  const meta = content.meta ?? {};
  const emailHref = meta.email ? `mailto:${meta.email}` : "";
  const linkedinHref = safeHref(meta.links?.linkedin || "");
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

  if (linkedinHref) {
    actions.appendChild(
      createCircleAction({
        label: "LinkedIn",
        href: linkedinHref,
        className: "contact-fab__action--linkedin",
        tip: "LinkedIn",
        iconSvg: el("svg", "contact-fab__icon", { viewBox: "0 0 24 24", "aria-hidden": "true" }, [
          el("path", "", { d: "M6.4 8.5a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2ZM4.7 10h3.3v9.7H4.7V10Zm5 0H13v1.4h.1c.5-.9 1.7-1.7 3.4-1.7 3 0 3.5 2 3.5 4.5v5.5h-3.3v-4.9c0-1.2 0-2.7-1.7-2.7-1.7 0-2 1.3-2 2.6v5h-3.3V10Z" }),
        ]),
      }),
    );
  }

  if (state.cvAvailable && cvHref) {
    actions.appendChild(
      createCircleAction({
        label: lang === "vi" ? "Tai CV" : "Download CV",
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
      "aria-label": lang === "vi" ? "Mo menu lien he" : "Open contact menu",
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
  const panel = el("div", "work-popup__panel", { role: "dialog", "aria-modal": "true", "aria-labelledby": "work-popup-title" }, [
    el("h3", "work-popup__title", { id: "work-popup-title" }, [""]),
    el("ul", "item__desc-list work-popup__desc-list", { id: "work-popup-desc" }, []),
    el("p", "item__meta work-popup__meta", { id: "work-popup-meta" }, [""]),
  ]);

  const frame = el("div", "work-popup__frame", {}, [
    el("button", "work-popup__close", { type: "button", dataset: { workClose: "true" }, "aria-label": "Close" }, ["\u00d7"]),
    panel,
  ]);

  return el("div", "work-popup u-hidden", { id: "work-popup", "aria-hidden": "true" }, [
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
    const experienceCarousel = createExperienceCarouselSection(state.content, state.lang);
    if (experienceCarousel) {
      fragment.appendChild(experienceCarousel);
    }
    fragment.appendChild(createSkillsSection(state.content));
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
