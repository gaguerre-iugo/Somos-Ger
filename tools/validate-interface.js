const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs.readdirSync(root).filter((name) => name.endsWith(".html")).sort();
const scriptMarker = './assets/project-adaptations.js?v=somos-ger-54';
const styleMarker = './assets/project-interface.css?v=somos-ger-21';
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
const interfaceCss = fs.readFileSync(path.join(root, "assets", "project-interface.css"), "utf8");
const missingIds = expectedIds.filter((id) => !adapter.includes(`"${id}"`));
const forbiddenToolsControls = ["somos-audio-volume-setting", "somos-volume"]
  .filter((token) => adapter.includes(token) || interfaceCss.includes(token));
const stableRevealMissing = [
  'data-somos-layout-ready',
  'window.dispatchEvent(new Event("adt:dock-resize"))',
].filter((token) => !adapter.includes(token))
  .concat(interfaceCss.includes('html:not([data-somos-layout-ready="true"]) #content') ? [] : ["layout-ready CSS"]);
const globalObserver = /observe\(document\.(?:documentElement|body)/.test(adapter);
const expectedThemeTokens = [
  "--somos-panel-bg: #242424",
  "--somos-institutional-300: #66c6c0",
  "--somos-institutional-500: #008078",
  ".somos-native-menu-panel",
  ".somos-tts-player",
  ".somos-setting-read-aloud #somos-read-aloud-description",
  '[role="switch"]:focus-visible::before',
];
const missingThemeTokens = expectedThemeTokens.filter((token) => !interfaceCss.includes(token));

const result = {
  pages: pages.length,
  pageFailures,
  toolbarOrder: ["Índice", "Anterior", "actual / total", "Siguiente", "Herramientas"],
  audioOrder: ["Audio anterior", "Reproducir/Pausar", "Audio siguiente", "Voz y velocidad", "Detener"],
  missingIds,
  forbiddenToolsControls,
  stableRevealMissing,
  missingThemeTokens,
  globalObserver,
};

console.log(JSON.stringify(result, null, 2));

if (pages.length !== 34 || pageFailures.length || missingIds.length || forbiddenToolsControls.length || stableRevealMissing.length || missingThemeTokens.length || globalObserver) {
  process.exitCode = 1;
}
