const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs.readdirSync(root).filter((name) => name.endsWith(".html")).sort();
const scriptMarker = './assets/project-adaptations.js?v=somos-ger-25';
const styleMarker = './assets/project-interface.css?v=somos-ger-11';
const expectedIds = [
  "somos-index",
  "somos-previous",
  "somos-page-status",
  "somos-next",
  "somos-tools",
  "somos-audio-previous",
  "somos-audio-toggle",
  "somos-audio-next",
  "somos-audio-settings",
  "somos-audio-stop",
];

const pageFailures = pages.flatMap((name) => {
  const html = fs.readFileSync(path.join(root, name), "utf8");
  const missing = [scriptMarker, styleMarker].filter((marker) => !html.includes(marker));
  return missing.length ? [{ page: name, missing }] : [];
});

const adapter = fs.readFileSync(path.join(root, "assets", "project-adaptations.js"), "utf8");
const missingIds = expectedIds.filter((id) => !adapter.includes(`"${id}"`));
const globalObserver = /observe\(document\.(?:documentElement|body)/.test(adapter);

const result = {
  pages: pages.length,
  pageFailures,
  toolbarOrder: ["Índice", "Anterior", "actual / total", "Siguiente", "Herramientas"],
  audioOrder: ["Audio anterior", "Reproducir/Pausar", "Audio siguiente", "Voz y velocidad", "Detener"],
  missingIds,
  globalObserver,
};

console.log(JSON.stringify(result, null, 2));

if (pages.length !== 34 || pageFailures.length || missingIds.length || globalObserver) {
  process.exitCode = 1;
}
