const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".html"))
  .sort();

const marker =
  '    <script src="./assets/project-adaptations.js?v=somos-ger-56"></script>';
const existingMarker =
  /^[\t ]*<script src="\.\/assets\/project-adaptations\.js(?:\?[^\"]*)?"><\/script>[\t ]*(?:\r?\n)?/m;
const styleMarker =
  '    <link href="./assets/project-interface.css?v=somos-ger-24" rel="stylesheet">';
const existingStyleMarker =
  /^[\t ]*<link href="\.\/assets\/project-interface\.css(?:\?[^\"]*)?" rel="stylesheet">[\t ]*(?:\r?\n)?/m;
const runtimeMarker =
  '    <script src="./assets/base.bundle.local.js?v=somos-ger-runtime-1"></script>';
const existingRuntimeMarker =
  /^[\t ]*<script src="\.\/assets\/base\.bundle\.local\.js(?:\?[^\"]*)?"><\/script>[\t ]*(?:\r?\n)?/m;
const runtimePreloadMarker =
  '    <link rel="preload" href="./assets/base.bundle.local.js?v=somos-ger-runtime-1" as="script">';
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
  if (!existingRuntimeMarker.test(html)) {
    throw new Error(`No se encontró el runtime en ${name}`);
  }
  html = html.replace(existingRuntimeMarker, `${runtimeMarker}\r\n`);
  const anchor = runtimeMarker;
  const runtimeIndex = html.indexOf(anchor);
  const beforeRuntime = html.slice(0, runtimeIndex).replace(/[\t ]*(?:\r?\n[\t ]*)+$/, "");
  html = `${beforeRuntime}\r\n${marker}\r\n${html.slice(runtimeIndex)}`;
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
