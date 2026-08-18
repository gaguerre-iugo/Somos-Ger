const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs.readdirSync(root).filter((name) => name.endsWith(".html")).sort();
const quizPages = pages.filter((name) => /^qz\d+\.html$/.test(name));
const scriptMarker = './assets/project-adaptations.js?v=somos-ger-57';
const styleMarker = './assets/project-interface.css?v=somos-ger-25';
const runtimeMarker = './assets/base.bundle.local.js?v=somos-ger-runtime-1';
const runtimePreloadMarker = '<link rel="preload" href="./assets/base.bundle.local.js?v=somos-ger-runtime-1" as="script">';
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
  const missing = [scriptMarker, styleMarker, runtimeMarker, runtimePreloadMarker].filter((marker) => !html.includes(marker));
  return missing.length ? [{ page: name, missing }] : [];
});
const quizStructureFailures = quizPages.filter((name) => {
  const html = fs.readFileSync(path.join(root, name), "utf8");
  return !html.includes('data-section-type="activity_quiz"');
});
const girlPage = fs.readFileSync(path.join(root, "pg032033_sec001.html"), "utf8");
const girlImageMarkup = ["pg032033_im001.jpg", "pg032033_im002.jpg"].map((src) =>
  girlPage.match(new RegExp(`<img[^>]+src="images/${src}"[^>]*>`))?.[0] || "",
);
const girlOrientationFailures = [
  girlPage.includes('data-id="pg032033_page"') && girlPage.includes('transform:translateX(595px) rotate(90deg)') ? null : "fondo",
  ...girlImageMarkup.map((markup, index) => markup && !markup.includes("rotate(") ? null : `recorte ${index + 1}`),
].filter(Boolean);

const adapter = fs.readFileSync(path.join(root, "assets", "project-adaptations.js"), "utf8");
const interfaceCss = fs.readFileSync(path.join(root, "assets", "project-interface.css"), "utf8");
const config = JSON.parse(fs.readFileSync(path.join(root, "assets", "config.json"), "utf8"));
const expectedBundleVersion = "somos-ger-4";
const audioVoices = JSON.parse(fs.readFileSync(path.join(root, "content", "i18n", "es-UY", "audio_voices.json"), "utf8"));
const timecodeVoices = JSON.parse(fs.readFileSync(path.join(root, "content", "i18n", "es-UY", "timecode", "timecode_voices.json"), "utf8"));
const voiceResourceFailures = [
  audioVoices.voices?.primary?.label === "Predeterminada" && !audioVoices.voices.secondary ? null : "audio_voices.json",
  timecodeVoices.primary && timecodeVoices.secondary ? null : "timecode_voices.json",
].filter(Boolean);
const missingIds = expectedIds.filter((id) => !adapter.includes(`"${id}"`));
const forbiddenToolsControls = ["somos-audio-volume-setting", "somos-volume"]
  .filter((token) => adapter.includes(token) || interfaceCss.includes(token));
const stableRevealMissing = [
  'data-somos-layout-ready',
  'window.dispatchEvent(new Event("adt:dock-resize"))',
].filter((token) => !adapter.includes(token))
  .concat(interfaceCss.includes('html:not([data-somos-layout-ready="true"]) #content') ? [] : ["layout-ready CSS"]);
const printPageCleanupMissing = [
  "function removePrintPageLabels",
  "data-somos-print-label-removed",
].filter((token) => !adapter.includes(token))
  .concat(interfaceCss.includes(".somos-native-index-panel [role=\"tabpanel\"] li > button > span.text-muted-foreground.whitespace-nowrap") ? [] : ["print-label CSS"]);
const globalObserver = /observe\(document\.(?:documentElement|body)/.test(adapter);
const expectedThemeTokens = [
  "--somos-panel-bg: #242424",
  "--somos-institutional-300: #66c6c0",
  "--somos-institutional-500: #008078",
  ".somos-native-menu-panel",
  ".somos-tts-player",
  ".somos-setting-read-aloud #somos-read-aloud-description",
  '[role="switch"]:focus-visible::before',
  "translate: 0 !important",
  'body:has(#simple-main[data-section-type="activity_quiz"]) #content',
  "grid-template-columns: 44px minmax(0, 1fr) 44px",
];
const missingThemeTokens = expectedThemeTokens.filter((token) => !interfaceCss.includes(token));

const result = {
  pages: pages.length,
  pageFailures,
  quizPages: quizPages.length,
  quizStructureFailures,
  girlOrientationFailures,
  bundleVersion: config.bundleVersion,
  voiceResourceFailures,
  toolbarOrder: ["Índice", "Anterior", "actual / total", "Siguiente", "Herramientas"],
  audioOrder: ["Audio anterior", "Reproducir/Pausar", "Audio siguiente", "Voz y velocidad", "Detener"],
  missingIds,
  forbiddenToolsControls,
  stableRevealMissing,
  printPageCleanupMissing,
  missingThemeTokens,
  globalObserver,
};

console.log(JSON.stringify(result, null, 2));

if (pages.length !== 34 || pageFailures.length || quizPages.length !== 4 || quizStructureFailures.length || girlOrientationFailures.length || config.bundleVersion !== expectedBundleVersion || voiceResourceFailures.length || missingIds.length || forbiddenToolsControls.length || stableRevealMissing.length || printPageCleanupMissing.length || missingThemeTokens.length || globalObserver) {
  process.exitCode = 1;
}
