const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = fs.readdirSync(root).filter((name) => name.endsWith(".html")).sort();
const quizPages = pages.filter((name) => /^qz\d+\.html$/.test(name));
const scriptMarker = './assets/responsive-reader.js?v=somos-ger-reflow-27';
const styleMarker = './assets/project-interface.css?v=somos-ger-26';
const reflowStyleMarker = './assets/responsive-reader.css?v=somos-ger-reflow-27';
const runtimePreloadMarker = '<link rel="preload" href="./assets/base.bundle.local.js?v=somos-ger-runtime-2" as="script">';
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
  const missing = [scriptMarker, styleMarker, reflowStyleMarker, runtimePreloadMarker].filter((marker) => !html.includes(marker));
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
const infographicPage = fs.readFileSync(path.join(root, "pg026027_sec001.html"), "utf8");
const infographicTextCount = (infographicPage.match(/<p data-id="pg026027_n\d+"/g) || []).length;
const infographicLayoutFailures = [
  infographicPage.includes('data-id="pg026027_page" src="images/pg026027_page.png"') ? null : "imagen original",
  infographicPage.includes('transform:translateX(595px) rotate(90deg)') ? null : "orientación original",
  infographicPage.includes('p[data-id^="pg026027_"]') && infographicPage.includes("font-size: 16px !important") && infographicPage.includes("line-height: 19px !important") ? null : "aumento tipográfico",
  infographicTextCount === 20 ? null : `textos: ${infographicTextCount}/20`,
  infographicPage.includes("pg026027-layout") ? "rediseño horizontal residual" : null,
].filter(Boolean);

const adapter = fs.readFileSync(path.join(root, "assets", "project-adaptations.js"), "utf8");
const runtime = fs.readFileSync(path.join(root, "assets", "base.bundle.local.js"), "utf8");
const interfaceCss = fs.readFileSync(path.join(root, "assets", "project-interface.css"), "utf8");
const responsiveReader = fs.readFileSync(path.join(root, "assets", "responsive-reader.js"), "utf8");
const responsiveCss = fs.readFileSync(path.join(root, "assets", "responsive-reader.css"), "utf8");
const config = JSON.parse(fs.readFileSync(path.join(root, "assets", "config.json"), "utf8"));
const expectedBundleVersion = "somos-ger-5";
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
const expectedResponsiveTokens = [
  'window.matchMedia("(max-width: " + (BREAKPOINT - 1) + "px)")',
  'fetch("./content/pages.json',
  'new DOMParser()',
  'document.documentElement.dataset.somosReflowCurrent',
  'document.addEventListener("somos:reflow-previous"',
  'document.addEventListener("somos:reflow-next"',
  'function installKeyboardNavigation()',
  'function composeGregariousSection(section, root)',
  '["pg005_p010", "pg005_p012"]',
  'event.stopImmediatePropagation()',
  'content.style.scrollBehavior = "auto"',
  'project-adaptations.js?v=somos-ger-62',
  'base.bundle.local.js?v=somos-ger-runtime-2',
  'goToPage(state.current + 1, true)',
];
const expectedResponsiveCssTokens = [
  'columns: calc(100vw - (2 * var(--somos-reflow-gutter))) auto',
  'column-fill: auto',
  '.somos-reflow-rights-grid',
  '.somos-reflow-composite-person',
  '.somos-reflow-gregarious-callout',
  'body:has(#simple-main[data-section-type="activity_quiz"])',
  '--somos-reflow-audio-reserve: var(--somos-audio-reserve, 96px)',
];
const responsiveContractFailures = expectedResponsiveTokens
  .filter((token) => !responsiveReader.includes(token))
  .concat(expectedResponsiveCssTokens.filter((token) => !responsiveCss.includes(token)));
const audioReflowBridgeFailures = [
  "window.__somosTtsBridge",
  "selectIndex(index2)",
].filter((token) => !runtime.includes(token)).concat([
  "function alignAudioToReflowPage",
  "audioIndexForReflowPage",
  "bridge.autoplayMode",
  "somosTtsExplicitlyStarted",
  "(!userStartedAudio || userPausedAudio)",
  'window.addEventListener("somos:reflow-pagechange", handleReflowPageChange)',
].filter((token) => !adapter.includes(token)));

const result = {
  pages: pages.length,
  pageFailures,
  quizPages: quizPages.length,
  quizStructureFailures,
  girlOrientationFailures,
  infographicLayoutFailures,
  bundleVersion: config.bundleVersion,
  voiceResourceFailures,
  toolbarOrder: ["Índice", "Anterior", "actual / total", "Siguiente", "Herramientas"],
  audioOrder: ["Anterior", "Reproducir/Pausar", "Siguiente", "Voz y velocidad", "Detener"],
  missingIds,
  forbiddenToolsControls,
  stableRevealMissing,
  printPageCleanupMissing,
  missingThemeTokens,
  responsiveContractFailures,
  audioReflowBridgeFailures,
  globalObserver,
};

console.log(JSON.stringify(result, null, 2));

if (pages.length !== 34 || pageFailures.length || quizPages.length !== 4 || quizStructureFailures.length || girlOrientationFailures.length || infographicLayoutFailures.length || config.bundleVersion !== expectedBundleVersion || voiceResourceFailures.length || missingIds.length || forbiddenToolsControls.length || stableRevealMissing.length || printPageCleanupMissing.length || missingThemeTokens.length || responsiveContractFailures.length || audioReflowBridgeFailures.length || globalObserver) {
  process.exitCode = 1;
}
