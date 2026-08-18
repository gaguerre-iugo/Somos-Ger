const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "assets", "offline-preloader.js");
const source = fs.readFileSync(file, "utf8");
const prefix = "  var INLINE = ";
const start = source.indexOf(prefix);
const endMatch = /;\r?\n  var BASE_DIR/.exec(source.slice(start));
const end = endMatch ? start + endMatch.index : -1;

if (start < 0 || end < 0) throw new Error("No se encontró el mapa INLINE del preloader.");

const before = source.slice(0, start + prefix.length);
const after = source.slice(end);
const inline = JSON.parse(source.slice(start + prefix.length, end));
const requiredInlineResources = [
  "./content/i18n/es-UY/audio_voices.json",
  "./content/i18n/es-UY/timecode/timecode_voices.json",
];

for (const key of requiredInlineResources) {
  if (!(key in inline)) inline[key] = {};
}

for (const key of Object.keys(inline)) {
  const relative = key.replace(/^\.\//, "");
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) continue;

  if (relative.endsWith(".html")) {
    inline[key] = fs.readFileSync(target, "utf8");
  } else if (relative.endsWith(".json")) {
    inline[key] = JSON.parse(fs.readFileSync(target, "utf8"));
  }
}

fs.writeFileSync(file, `${before}${JSON.stringify(inline)}${after}`, "utf8");
console.log(`Preloader sincronizado: ${Object.keys(inline).length} recursos incrustados.`);
