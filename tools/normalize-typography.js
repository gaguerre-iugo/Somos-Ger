const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
function collectHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(target);
    return entry.name.endsWith(".html") ? [target] : [];
  });
}

const htmlFiles = collectHtmlFiles(root);
const numericWeights = new Map([
  ["100", "400"], ["200", "400"], ["300", "400"], ["500", "400"],
  ["600", "700"], ["800", "700"], ["900", "700"],
]);

for (const file of htmlFiles) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  updated = updated.replace(
    /&quot;font-family&quot;:&quot;.*?&quot;/g,
    "&quot;font-family&quot;:&quot;Atkinson Hyperlegible,sans-serif&quot;",
  );
  updated = updated.replace(
    /font-family:(?:(?:&[A-Za-z]+;)|[^;"'])+/g,
    "font-family:Atkinson Hyperlegible,sans-serif",
  );
  if (path.dirname(file) === root) {
    updated = updated.replace(
      /<link href="\.\/assets\/fonts\.css(?:\?[^\"]*)?" rel="stylesheet">/,
      [
        '<link rel="preload" href="./assets/fonts/AtkinsonHyperlegible-400-latin.woff2?v=somos-ger-1" as="font" type="font/woff2" crossorigin>',
        '<link rel="preload" href="./assets/fonts/AtkinsonHyperlegible-700-latin.woff2?v=somos-ger-1" as="font" type="font/woff2" crossorigin>',
        '<link href="./assets/fonts.css?v=somos-ger-2" rel="stylesheet">',
      ].join("\n    "),
    );
  }
  updated = updated
    .replace(/^\s*<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*>\s*$/gm, "")
    .replace(/^\s*<link href="https:\/\/fonts\.googleapis\.com\/[^\n]+\n/gm, "")
    .replace(/\bfont-(?:thin|extralight|light|medium)\b/g, "font-normal")
    .replace(/\bfont-(?:semibold|extrabold|black)\b/g, "font-bold")
    .replace(/font-weight\s*:\s*(100|200|300|500|600|800|900)\b/g, (_, weight) =>
      `font-weight:${numericWeights.get(weight)}`,
    );

  /* Fixed-layout exceptions verified in the browser after the font change. */
  if (path.basename(file) === "pg009_sec001.html") {
    updated = updated
      .replace("top:89px;left:38px;line-height:16px;width:133px;height:22px", "top:89px;left:38px;line-height:16px;width:160px;height:22px")
      .replace("top:144px;left:393px;line-height:16px;width:149px;height:41px", "top:144px;left:393px;line-height:16px;width:149px;height:50px");
  }

  updated = updated.replace(/\r\n?/g, "\n");
  if (updated !== original) fs.writeFileSync(file, updated, "utf8");
}

console.log(`Tipografía normalizada en ${htmlFiles.length} documentos y fragmentos HTML.`);
