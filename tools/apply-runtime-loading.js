const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith(".html"));

for (const name of htmlFiles) {
  const file = path.join(root, name);
  const original = fs.readFileSync(file, "utf8");
  const updated = original.replace(
    '<script src="./assets/offline-preloader.js"></script>',
    '<script src="./assets/load-offline-preloader.js?v=somos-ger-1"></script>',
  );
  if (updated !== original) fs.writeFileSync(file, updated, "utf8");
}

console.log(`Carga offline condicionada en ${htmlFiles.length} documentos HTML.`);
