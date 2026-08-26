const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".html"))
  .sort();

const marker =
  '    <script src="./assets/responsive-reader.js?v=somos-ger-reflow-28"></script>';
const existingMarker =
  /^[\t ]*<script src="\.\/assets\/(?:project-adaptations|responsive-reader)\.js(?:\?[^\"]*)?"><\/script>[\t ]*(?:\r?\n)?/gm;
const styleMarker =
  '    <link href="./assets/project-interface.css?v=somos-ger-26" rel="stylesheet">\r\n    <link href="./assets/responsive-reader.css?v=somos-ger-reflow-28" rel="stylesheet">';
const existingStyleMarker =
  /^[\t ]*<link href="\.\/assets\/(?:project-interface|responsive-reader)\.css(?:\?[^\"]*)?" rel="stylesheet">[\t ]*(?:\r?\n)?/gm;
const runtimeMarker =
  '    <script src="./assets/base.bundle.local.js?v=somos-ger-runtime-2"></script>';
const existingRuntimeMarker =
  /^[\t ]*<script src="\.\/assets\/base\.bundle\.local\.js(?:\?[^\"]*)?"><\/script>[\t ]*(?:\r?\n)?/m;
const runtimePreloadMarker =
  '    <link rel="preload" href="./assets/base.bundle.local.js?v=somos-ger-runtime-2" as="script">';
const existingRuntimePreloadMarker =
  /^[\t ]*<link rel="preload" href="\.\/assets\/base\.bundle\.local\.js(?:\?[^\"]*)?" as="script">[\t ]*(?:\r?\n)?/m;

for (const name of pages) {
  const file = path.join(root, name);
  let html = fs.readFileSync(file, "utf8");
  if (existingMarker.test(html)) {
    html = html.replace(existingMarker, "");
  }
  if (existingStyleMarker.test(html)) {
    html = html.replace(existingStyleMarker, "");
  }
  if (existingRuntimePreloadMarker.test(html)) {
    html = html.replace(existingRuntimePreloadMarker, "");
  }
  const headAnchor = '    <link href="./assets/fonts.css?v=somos-ger-2" rel="stylesheet">';
  if (!html.includes(headAnchor)) {
    throw new Error(`No se encontró la hoja tipográfica en ${name}`);
  }
  const headIndex = html.indexOf(headAnchor);
  const headEnd = headIndex + headAnchor.length;
  const afterHead = html.slice(headEnd).replace(/^(?:[\t ]*\r?\n)+/, "");
  html = `${html.slice(0, headEnd)}\r\n${runtimePreloadMarker}\r\n${styleMarker}\r\n${afterHead}`;
  html = html.replace(existingRuntimeMarker, "");
  const scormMarker = '    <script src="./assets/scorm.js"></script>';
  if (!html.includes(scormMarker)) {
    throw new Error(`No se encontró el cargador SCORM en ${name}`);
  }
  html = html.replace(scormMarker, `${scormMarker}\r\n${marker}`);
  const dockFunction = /        function dock\(\) \{\r?\n(?:          .*\r?\n)+?        \}/;
  if (!dockFunction.test(html) && !html.includes('id="simple-main"')) {
    throw new Error(`No se encontró el cálculo de reserva inferior en ${name}`);
  }
  if (dockFunction.test(html)) {
    html = html.replace(
      dockFunction,
      [
        "        function dock() {",
        '          var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-height"));',
        '          var audio = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--somos-audio-reserve"));',
        "          var base = v > 0 ? v : FALLBACK;",
        "          return base + (audio > 0 ? audio : 96);",
        "        }",
      ].join("\r\n"),
    );
  }
  fs.writeFileSync(file, html);
}

console.log(`Adaptaciones del proyecto aplicadas a ${pages.length} páginas.`);
