const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".html"))
  .sort();

const marker =
  '    <script src="./assets/project-adaptations.js?v=somos-ger-1"></script>';

for (const name of pages) {
  const file = path.join(root, name);
  let html = fs.readFileSync(file, "utf8");
  if (html.includes(marker)) continue;
  const anchor = '    <script src="./assets/base.bundle.local.js"></script>';
  if (!html.includes(anchor)) {
    throw new Error(`No se encontró el runtime en ${name}`);
  }
  html = html.replace(anchor, `${anchor}\r\n${marker}`);
  fs.writeFileSync(file, html);
}

console.log(`Adaptaciones del proyecto aplicadas a ${pages.length} páginas.`);
