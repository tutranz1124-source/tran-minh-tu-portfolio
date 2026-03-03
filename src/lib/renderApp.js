import { clear, el } from "./dom.js";

const NAV_ITEMS = [
  { id: "top", label: { en: "Top", vi: "\u0110\u1ea7u trang" } },
  { id: "experience", label: { en: "Experience", vi: "Kinh nghi\u1ec7m" } },
  { id: "skills", label: { en: "Skills", vi: "K\u1ef9 n\u0103ng" } },
  { id: "contact", label: { en: "Contact", vi: "Li\u00ean h\u1ec7" } },
];

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

  inner.appendChild(
    el("div", "navbar__left", {}, [
      el("div", "navbar__mark", { "aria-hidden": "true" }, ["TM"]),
      el("p", "navbar__name", {}, [activeName(content, lang)]),
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
  const heroBadge = typeof hero.badge === "string" ? hero.badge.trim() : "";

  const card = el("article", "card hero reveal", { "aria-labelledby": "hero-title" });
  if (heroBadge) {
    card.appendChild(el("span", "hero__badge", {}, [heroBadge]));
  }
  card.appendChild(el("h1", "u-line-clamp-2", { id: "hero-title" }, [activeName(content, lang)]));
  card.appendChild(el("p", "hero__subtitle", {}, [meta.title ?? "Software Engineer / Full-stack Developer"]));

  if (hero.tagline) {
    card.appendChild(el("p", "hero__tagline u-line-clamp-2", {}, [hero.tagline]));
  }

  const about = el("div", "hero__about");
  (hero.about_paragraphs ?? []).slice(0, 2).forEach((paragraph) => {
    about.appendChild(el("p", "u-line-clamp-3", {}, [paragraph]));
  });
  card.appendChild(about);

  const cta = el("div", "hero__cta");
  cta.appendChild(createActionButton({ label: lang === "vi" ? "Li\u00ean h\u1ec7" : "Contact", href: "#contact", kind: "primary" }));
  const cvHref = safeHref(meta.links?.cv || "");
  if (state.cvAvailable && cvHref) {
    cta.appendChild(createActionButton({ label: lang === "vi" ? "T\u1ea3i CV" : "Download CV", href: cvHref }));
  }
  card.appendChild(cta);
  return card;
}

function createExperienceSection(content, lang) {
  const experience = content.experience ?? {};
  const works = content.more_work?.items ?? [];

  const section = el("section", "section reveal reveal--section", { id: "experience" });
  const card = el("article", "card list-card experience reveal", { "aria-labelledby": "experience-title" });
  card.appendChild(el("h2", "", { id: "experience-title" }, [experience.title ?? "Experience"]));
  card.appendChild(el("p", "list-card__subtitle", {}, [experience.subtitle ?? "Recent roles"]));

  const list = el("ul", "experience-grid");
  (experience.items ?? []).slice(0, 4).forEach((item, index) => {
    const hasWork = Boolean(works[index]);
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
      el("h3", "u-line-clamp-2", {}, [item.role ?? ""]),
      el("p", "item__meta", {}, [item.date ?? ""]),
      el("p", "item__desc u-line-clamp-3", {}, [item.desc ?? ""]),
    ]);
    list.appendChild(node);
  });
  card.appendChild(list);
  section.appendChild(card);
  return section;
}

function createExperienceCarouselSection(content, lang) {
  const experienceItems = content.experience?.items ?? [];
  const works = content.more_work?.items ?? [];
  if (!experienceItems.length) {
    return null;
  }
  const carouselItems = experienceItems.slice(0, 3);

  const section = el("section", "section reveal reveal--section", { id: "experience" });
  const card = el("article", "card list-card reveal", { "aria-labelledby": "experience-carousel-title" });
  card.appendChild(el("h2", "", { id: "experience-carousel-title" }, [lang === "vi" ? "Experience Carousel Test" : "Experience Carousel Test"]));
  card.appendChild(
    el(
      "p",
      "list-card__subtitle",
      {},
      [
        lang === "vi"
          ? "Thu animation coverflow tu carousel example. Keo ngang de test."
          : "Coverflow animation test from your carousel example. Drag horizontally to test.",
      ],
    ),
  );

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
            el("span", "exp-carousel__badge", {}, [lang === "vi" ? "Kinh nghiem" : "Experience"]),
            el("h3", "exp-carousel__title u-line-clamp-2", {}, [item.role ?? "Experience"]),
            el("p", "exp-carousel__meta u-line-clamp-1", {}, [item.date ?? ""]),
            el("p", "exp-carousel__desc u-line-clamp-3", {}, [item.desc ?? ""]),
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
  const card = el("article", "card list-card reveal", { "aria-labelledby": "skills-title" });
  card.appendChild(el("h2", "", { id: "skills-title" }, [skills.title ?? "Skills"]));

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

function createContactSection(content, state) {
  const contact = content.contact ?? {};
  const meta = content.meta ?? {};
  const emailHref = meta.email ? `mailto:${meta.email}` : "";
  const linkedinHref = safeHref(meta.links?.linkedin || "");
  const cvHref = safeHref(meta.links?.cv || "");

  const section = el("section", "section reveal reveal--section", { id: "contact" });
  const card = el("article", "card contact-row reveal", { "aria-labelledby": "contact-title" });

  const intro = el("div", "contact-row__intro", {}, [
    el("h2", "", { id: "contact-title" }, [contact.title ?? "Contact"]),
    el("p", "list-card__subtitle", {}, [contact.subtitle ?? "Open for collaboration"]),
    el("p", "u-line-clamp-2", {}, [contact.cta ?? ""]),
  ]);

  const links = el("div", "contact-row__links");
  if (emailHref) {
    links.appendChild(createActionButton({ label: "Email", href: emailHref }));
  }
  if (linkedinHref) {
    links.appendChild(createActionButton({ label: "LinkedIn", href: linkedinHref }));
  } else {
    links.appendChild(el("button", "btn btn--secondary", { type: "button", disabled: true }, ["LinkedIn"]));
  }

  if (state.cvAvailable && cvHref) {
    links.appendChild(createActionButton({ label: "Download CV", href: cvHref }));
  } else {
    links.appendChild(el("button", "btn btn--secondary", { type: "button", disabled: true }, ["Download CV"]));
  }

  const right = el("div", "contact-row__right", {}, [
    el("div", "contact-row__actions", {}, [links]),
  ]);
  card.append(intro, right);
  section.appendChild(card);
  return section;
}

function createSiteFooter(content) {
  const footer = el("footer", "site-footer");
  const note = content.footer?.note ? `${content.footer.note} - ` : "";
  footer.appendChild(el("p", "site-footer__note", {}, [`${note}Made by Tran Minh Tu 2026`]));
  return footer;
}

function createWorkPopup() {
  return el("div", "work-popup u-hidden", { id: "work-popup", "aria-hidden": "true" }, [
    el("div", "work-popup__backdrop", { dataset: { workClose: "true" } }),
    el("div", "work-popup__panel", { role: "dialog", "aria-modal": "true", "aria-labelledby": "work-popup-title" }, [
      el("button", "work-popup__close", { type: "button", dataset: { workClose: "true" }, "aria-label": "Close" }, ["\u00d7"]),
      el("h3", "", { id: "work-popup-title" }, [""]),
      el("p", "item__meta", { id: "work-popup-meta" }, [""]),
      el("p", "item__desc", { id: "work-popup-desc" }, [""]),
    ]),
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
    fragment.appendChild(createContactSection(state.content, state));
    fragment.appendChild(createSiteFooter(state.content));
    fragment.appendChild(createWorkPopup());
  }

  app.appendChild(fragment);
  document.documentElement.lang = state.lang;
  document.title = `${activeName(state.content, state.lang)} | Portfolio`;
}
