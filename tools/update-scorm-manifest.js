const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "imsmanifest.xml");
const excludedRoots = new Set([".git", "tools"]);
const excludedFiles = new Set(["AGENTS.md", "imsmanifest.xml"]);

function collect(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!prefix && excludedRoots.has(entry.name)) return [];
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(target, relative);
    if (excludedFiles.has(relative)) return [];
    return [relative.replaceAll("\\", "/")];
  });
}

const files = collect(root).sort((a, b) => a.localeCompare(b, "en"));
const source = fs.readFileSync(manifestPath, "utf8");
const resourcePattern = /(<resource\b[^>]*\bhref="index\.html"[^>]*>)[\s\S]*?(<\/resource>)/;
const match = resourcePattern.exec(source);
if (!match) throw new Error("No se encontró el recurso SCO principal.");

const entries = files.map((file) => `      <file href="${file}"/>`).join("\n");
const replacement = `${match[1]}\n${entries}\n    ${match[2]}`;
fs.writeFileSync(manifestPath, source.replace(resourcePattern, replacement), "utf8");
console.log(`Manifiesto SCORM actualizado con ${files.length} recursos.`);
