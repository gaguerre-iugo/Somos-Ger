const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "imsmanifest.xml");
const manifest = fs.readFileSync(manifestPath, "utf8");
const declared = [...manifest.matchAll(/<file\s+href="([^"]+)"\s*\/>/g)].map((match) => match[1]);
const missing = declared.filter((href) => !fs.existsSync(path.join(root, href)));

if (!/<schemaversion>1\.2<\/schemaversion>/.test(manifest)) {
  throw new Error("El manifiesto no declara SCORM 1.2.");
}
if (!/<resource[^>]+adlcp:scormtype="sco"[^>]+href="index\.html"/s.test(manifest)) {
  throw new Error("El manifiesto no declara index.html como SCO.");
}
if (missing.length) throw new Error(`Recursos declarados inexistentes: ${missing.join(", ")}`);

const source = fs.readFileSync(path.join(root, "assets", "scorm.js"), "utf8");

function runAdapter(completedActivities) {
  const calls = [];
  const values = Object.create(null);
  const storage = { completedActivities: JSON.stringify(completedActivities) };
  const API = {
    LMSInitialize(value) { calls.push(["LMSInitialize", value]); return "true"; },
    LMSFinish(value) { calls.push(["LMSFinish", value]); return "true"; },
    LMSCommit(value) { calls.push(["LMSCommit", value]); return "true"; },
    LMSSetValue(key, value) { values[key] = String(value); calls.push(["LMSSetValue", key, String(value)]); return "true"; },
    LMSGetValue(key) { calls.push(["LMSGetValue", key]); return values[key] || ""; },
  };
  const listeners = Object.create(null);
  const window = {
    API,
    parent: null,
    addEventListener(type, listener) { listeners[type] = listener; },
  };
  window.parent = window;
  const localStorage = {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
  };
  const document = {
    querySelector(selector) {
      if (selector === 'meta[name="title-id"]') return { getAttribute: () => "pg001_sec001" };
      return null;
    },
  };

  vm.runInNewContext(source, { window, document, localStorage, JSON }, { filename: "assets/scorm.js" });
  return { calls, values };
}

const initial = runAdapter([]);
const completed = runAdapter(["qz001-ok", "qz002-ok", "qz003-ok", "qz004-ok"]);

if (initial.values["cmi.core.lesson_location"] !== "pg001_sec001") throw new Error("lesson_location inicial incorrecta.");
if (initial.values["cmi.core.lesson_status"] !== "incomplete") throw new Error("El estado inicial debe ser incomplete.");
if (initial.values["cmi.core.score.raw"] !== "0") throw new Error("El puntaje inicial debe ser 0.");
if (completed.values["cmi.core.lesson_status"] !== "passed") throw new Error("El estado final debe ser passed.");
if (completed.values["cmi.core.score.raw"] !== "100") throw new Error("El puntaje final debe ser 100.");

console.log(JSON.stringify({
  scormVersion: "1.2",
  declaredFiles: declared.length,
  missingFiles: missing.length,
  initialStatus: initial.values["cmi.core.lesson_status"],
  initialScore: initial.values["cmi.core.score.raw"],
  completedStatus: completed.values["cmi.core.lesson_status"],
  completedScore: completed.values["cmi.core.score.raw"],
}, null, 2));
