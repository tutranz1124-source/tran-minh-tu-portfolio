const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "g",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "symbol",
  "use",
  "ellipse",
]);

function isSvgTag(tag) {
  return SVG_TAGS.has(tag);
}

export function el(tag, className = "", attrs = {}, children = []) {
  const svgNode = isSvgTag(tag);
  const node = svgNode ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);

  if (className) {
    if (svgNode) {
      node.setAttribute("class", className);
    } else {
      node.className = className;
    }
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) {
      return;
    }
    if (key === "dataset" && typeof value === "object") {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        node.dataset[dataKey] = String(dataValue);
      });
      return;
    }
    if (!svgNode && key in node && key !== "role") {
      node[key] = value;
      return;
    }
    node.setAttribute(key, String(value));
  });

  const childList = Array.isArray(children) ? children : [children];
  childList.forEach((child) => {
    if (child === null || child === undefined) {
      return;
    }
    if (typeof child === "string") {
      node.appendChild(document.createTextNode(child));
      return;
    }
    node.appendChild(child);
  });

  return node;
}

export function txt(str = "") {
  return document.createTextNode(str ?? "");
}

export function setText(node, str) {
  if (!node) {
    return;
  }
  node.textContent = str ?? "";
}

export function clear(node) {
  if (!node) {
    return;
  }
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}
