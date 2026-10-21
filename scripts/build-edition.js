// Builds a deployable copy of the site for one edition.
// Usage: node scripts/build-edition.js <hosted|selfhost> [outDir]   (default outDir: dist/<edition>)
// selfhost = site/ as is (contact form off). hosted = site/ + editions/hosted/ overlay (contact form on).
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const root = path.join(__dirname, "..");
const EDITIONS = ["hosted", "selfhost"];

function inside(base, p) {
  const rel = path.relative(base, p);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Refusing path outside " + base + ": " + p);
  return p;
}
function walk(base, dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name.indexOf("..") !== -1 || d.name.indexOf("/") !== -1) throw new Error("Unsafe file name: " + d.name);
    const p = inside(base, path.join(dir, d.name));
    return d.isDirectory() ? walk(base, p) : [p];
  });
}
function updateSri(out) {
  walk(out, out).filter((f) => f.endsWith(".html")).forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    const next = html.replace(/<(script|link)\b([^>]*?)\b(src|href)="(\/[^"]+)"([^>]*?)integrity="[^"]*"/g, (m, tag, a, attr, url, b) => {
      const rel = url.split("?")[0];
      if (rel.indexOf("..") !== -1) throw new Error("Refusing path with ..: " + rel);
      const target = inside(out, path.resolve(out, "." + rel));
      const sri = "sha384-" + crypto.createHash("sha384").update(fs.readFileSync(target)).digest("base64");
      return "<" + tag + a + attr + '="' + url + '"' + b + 'integrity="' + sri + '"';
    });
    if (next !== html) fs.writeFileSync(file, next);
  });
}
// <!--edition:selfhost-->A<!--edition:hosted B--><!--/edition--> keeps A for selfhost, B for hosted.
function applyEditionText(out, edition) {
  const re = /<!--edition:selfhost-->([\s\S]*?)<!--edition:hosted ([\s\S]*?)--><!--\/edition-->/g;
  walk(out, out).filter((f) => f.endsWith(".html")).forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    const next = html.replace(re, (m, a, b) => (edition === "hosted" ? b : a));
    if (next !== html) fs.writeFileSync(file, next);
  });
}
function build(edition, outDir) {
  if (EDITIONS.indexOf(edition) === -1) throw new Error("Edition must be one of: " + EDITIONS.join(", "));
  const out = path.resolve(outDir || path.join(root, "dist", edition));
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(path.join(root, "site"), out, { recursive: true });
  const overlay = path.join(root, "editions", edition);
  if (fs.existsSync(overlay)) fs.cpSync(overlay, out, { recursive: true });
  const cfgPath = path.join(out, "config.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  cfg.edition = edition;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
  applyEditionText(out, edition);
  updateSri(out);
  return out;
}
if (require.main === module) {
  const out = build(process.argv[2], process.argv[3]);
  console.log("Built " + process.argv[2] + " edition in " + path.relative(process.cwd(), out));
}
module.exports = { build, EDITIONS };
