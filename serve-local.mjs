import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const port = 4173;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

function send(res, code, body, type = "text/plain; charset=utf-8") {
  res.writeHead(code, {
    "Content-Type": type,
    "Cache-Control": "no-cache",
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const safePath = path.normalize(urlPath).replace(/^([.][.][/\\])+/, "");
  let filePath = path.join(root, safePath);

  if (safePath === "/") {
    filePath = path.join(root, "index.html");
  }

  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (statErr, stat) => {
    if (!statErr && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        if (urlPath !== "/" && !path.extname(urlPath)) {
          fs.readFile(path.join(root, "index.html"), (spaErr, spaData) => {
            if (spaErr) {
              send(res, 404, "Not Found");
              return;
            }
            send(res, 200, spaData, mime[".html"]);
          });
          return;
        }
        send(res, 404, "Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, mime[ext] || "application/octet-stream");
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`darktech-portfolio running at http://127.0.0.1:${port}`);
});