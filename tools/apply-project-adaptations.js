const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".html"))
  .sort();

const marker =
  '    <script src="./assets/responsive-reader.js?v=somos-ger-reflow-35"></script>';
const existingMarker =
  /^[\t ]*<script src="\.\/assets\/(?:project-adaptations|responsive-reader)\.js(?:\?[^\"]*)?"><\/script>[\t ]*(?:\r?\n)?/gm;
const styleMarker =
  '    <link href="./assets/project-interface.css?v=somos-ger-30" rel="stylesheet">\r\n    <link href="./assets/responsive-reader.css?v=somos-ger-reflow-30" rel="stylesheet">';
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
  // Pantallas grandes de aula (65", 16:9): elevar el tope de escala del lienzo
  // fijo para que la página llene mucho más el panel y el texto sea legible
  // desde el fondo del aula. El Math.min() sigue tomando el menor de byW/byH,
  // así que nunca provoca overflow; el tope solo limita el agrandamiento máximo.
  html = html.replace(
    /var s = Math\.min\(2, byW, byH > 0 \? byH : byW\);/,
    "var s = Math.min(4, byW, byH > 0 ? byH : byW);",
  );

  // Esqueleto estático de la barra de navegación (anti-parpadeo). Cada cambio de
  // página recarga el documento completo y el runtime tarda ~250 ms en montar la
  // barra real (#somos-primary-toolbar), dejando un hueco en el que el menú
  // desaparece y "parpadea". Pintamos desde el primer fotograma una copia
  // estática idéntica (mismas clases visuales), inerte y oculta a lectores de
  // pantalla, que el CSS oculta —y project-adaptations.js elimina— en cuanto la
  // barra real aparece. Así el menú se mantiene visualmente estable.
  const skeletonMarkup =
    '    <nav class="somos-primary-toolbar somos-toolbar-skeleton" aria-hidden="true" inert>' +
    '<button type="button" class="somos-toolbar-button" tabindex="-1"><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4 5h16M4 12h16M4 19h16"/><circle cx="2" cy="5" r=".7"/><circle cx="2" cy="12" r=".7"/><circle cx="2" cy="19" r=".7"/></svg><span>&#205;ndice</span></button>' +
    '<button type="button" class="somos-toolbar-button" tabindex="-1"><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="m15 18-6-6 6-6"/></svg><span>Anterior</span></button>' +
    '<output class="somos-page-status">&#8211; / &#8211;</output>' +
    '<button type="button" class="somos-toolbar-button" tabindex="-1"><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="m9 18 6-6-6-6"/></svg><span>Siguiente</span></button>' +
    '<button type="button" class="somos-toolbar-button" tabindex="-1"><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.04.08H10l-.04-.08a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1L3.92 14v-4L4 9.96a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.04-.08h3.92L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.32.75.6 1l.08.04v3.92L20 14a1.7 1.7 0 0 0-.6 1Z"/></svg><span>Herramientas</span></button>' +
    "</nav>";
  const existingSkeleton = /^[\t ]*<nav class="somos-primary-toolbar somos-toolbar-skeleton"[\s\S]*?<\/nav>[\t ]*(?:\r?\n)?/m;
  if (existingSkeleton.test(html)) {
    html = html.replace(existingSkeleton, "");
  }
  const navAnchor = '    <div class="relative z-50" id="nav-container"></div>';
  if (!html.includes(navAnchor)) {
    throw new Error(`No se encontró el contenedor de navegación en ${name}`);
  }
  html = html.replace(navAnchor, `${navAnchor}\r\n${skeletonMarkup}`);

  fs.writeFileSync(file, html);
}

console.log(`Adaptaciones del proyecto aplicadas a ${pages.length} páginas.`);
