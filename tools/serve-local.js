const http = require("http");
const fs = require("fs");
const path = require("path");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 5501);
const root = path.resolve(process.cwd());
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function cacheControlFor(requestUrl, target) {
  const extension = path.extname(target).toLowerCase();
  if (path.basename(target).toLowerCase() === "index.html") return "no-cache";
  if (requestUrl.searchParams.has("v")) return "public, max-age=31536000, immutable";
  if ([".jpg", ".jpeg", ".png", ".mp3", ".woff2"].includes(extension)) {
    return "public, max-age=3600";
  }
  return "no-cache";
}

http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    const target = !statError && stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    fs.readFile(target, (readError, data) => {
      if (readError) {
        response.writeHead(readError.code === "ENOENT" ? 404 : 500).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Cache-Control": cacheControlFor(requestUrl, target),
        "Content-Type": mimeTypes[path.extname(target).toLowerCase()] || "application/octet-stream",
      });
      response.end(data);
    });
  });
}).listen(port, host, () => {
  console.log(`Servidor local: http://${host}:${port}/`);
});
