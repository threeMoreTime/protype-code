import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uiPath = path.join(root, "plugin", "ui.html");
const beginMarker = "// BEGIN EMBEDDED HMAC BUNDLE";
const endMarker = "// END EMBEDDED HMAC BUNDLE";
const html = await readFile(uiPath, "utf8");
const begin = html.indexOf(beginMarker);
const end = html.indexOf(endMarker);
if (begin < 0 || end < begin || html.indexOf(beginMarker, begin + 1) !== -1 ||
    html.indexOf(endMarker, end + 1) !== -1) {
  throw new Error("Plugin UI HMAC bundle markers are missing or duplicated");
}

const result = await build({
  entryPoints: [path.join(root, "plugin", "hmac-fallback-entry.mjs")],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2020",
  minify: true,
  write: false,
});
const bundle = result.outputFiles[0].text.trim();
if (/<\/script/i.test(bundle)) throw new Error("Bundled HMAC cannot be embedded in an HTML script tag");
const updated = `${html.slice(0, begin + beginMarker.length)}\n      ${bundle}\n      ${html.slice(end)}`;
if (updated !== html) await writeFile(uiPath, updated, "utf8");

const nobleLicense = await readFile(path.join(root, "node_modules", "@noble", "hashes", "LICENSE"), "utf8");
await writeFile(path.join(root, "plugin", "THIRD_PARTY_LICENSES.txt"),
  `@noble/hashes 2.4.0\nhttps://github.com/paulmillr/noble-hashes\n\n${nobleLicense}`, "utf8");
