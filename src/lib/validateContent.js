export function validateContent(content) {
  const errors = [];

  if (!content || typeof content !== "object") {
    errors.push("content is not an object");
    return { ok: false, errors };
  }

  if (!content.meta || typeof content.meta !== "object") {
    errors.push("meta missing or invalid");
  }

  if (!content.hero || typeof content.hero !== "object") {
    errors.push("hero missing or invalid");
  } else if (content.hero.about_paragraphs && !Array.isArray(content.hero.about_paragraphs)) {
    errors.push("hero.about_paragraphs should be array");
  }

  if (!content.impact || typeof content.impact !== "object") {
    errors.push("impact missing or invalid");
  } else if (content.impact.metrics && !Array.isArray(content.impact.metrics)) {
    errors.push("impact.metrics should be array");
  }

  const project = content.featured?.project;
  if (!project || typeof project !== "object") {
    errors.push("featured.project missing or invalid");
  } else {
    if (project.constraints && !Array.isArray(project.constraints)) {
      errors.push("featured.project.constraints should be array");
    }
    if (project.tradeoffs && !Array.isArray(project.tradeoffs)) {
      errors.push("featured.project.tradeoffs should be array");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
