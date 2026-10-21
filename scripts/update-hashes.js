// Updates every integrity="sha384-..." attribute in site/**/*.html and regenerates SHA256SUMS.txt.
// Usage: node scripts/update-hashes.js   (run after editing any site file)
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const root = path.join(__dirname, "..");
const site = path.join(root, "site");
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}
let changed = 0;
walk(site).filter((f) => f.endsWith(".html")).forEach((file) => {
  const html = fs.readFileSync(file, "utf8");
  const next = html.replace(/<(script|link)\b([^>]*?)\b(src|href)="(\/[^"]+)"([^>]*?)integrity="[^"]*"/g, (m, tag, a, attr, url, b) => {
    const target = path.join(site, url.split("?")[0]);
    if (!fs.existsSync(target)) throw new Error("Missing " + url + " referenced in " + file);
    const sri = "sha384-" + crypto.createHash("sha384").update(fs.readFileSync(target)).digest("base64");
    return "<" + tag + a + attr + '="' + url + '"' + b + 'integrity="' + sri + '"';
  });
  if (next !== html) { fs.writeFileSync(file, next); changed += 1; }
});
const listed = ["Dockerfile", "docker-compose.yml", "nginx.conf", "INSTALL.md", "VERSION"].map((f) => "./" + f)
  .concat(walk(site).map((f) => "./" + path.relative(root, f).split(path.sep).join("/")))
  .sort();
const sums = listed.map((f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, f))).digest("hex") + "  " + f).join("\n") + "\n";
fs.writeFileSync(path.join(root, "SHA256SUMS.txt"), sums);
console.log("SRI updated in " + changed + " HTML file(s); SHA256SUMS.txt lists " + listed.length + " files.");
