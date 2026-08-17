const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".html"))
  .sort();

const marker =
  '    <script src="./assets/project-adaptations.js?v=somos-ger-4"></script>';
const existingMarker =
  /^[\t ]*<script src="\.\/assets\/project-adaptations\.js(?:\?[^\"]*)?"><\/script>[\t ]*$/m;

for (const name of pages) {
  const file = path.join(root, name);
  let html = fs.readFileSync(file, "utf8");
  if (existingMarker.test(html)) {
    html = html.replace(existingMarker, "");
  }
  const anchor = '    <script src="./assets/base.bundle.local.js"></script>';
  if (!html.includes(anchor)) {
    throw new Error(`No se encontró el runtime en ${name}`);
  }
  html = html.replace(anchor, `${marker}\r\n${anchor}`);
  fs.writeFileSync(file, html);
}

console.log(`Adaptaciones del proyecto aplicadas a ${pages.length} páginas.`);
