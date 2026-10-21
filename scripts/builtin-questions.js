// Reads the built-in question arrays straight from the site scripts (no DOM needed).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const site = path.join(__dirname, "..", "site");
function slice(file, from, to) {
  const src = fs.readFileSync(path.join(site, file), "utf8");
  const a = src.indexOf(from), b = src.indexOf(to);
  if (a === -1 || b === -1) throw new Error("Cannot find question block in " + file);
  return src.slice(a, b);
}
function builtin() {
  const ctx = {};
  vm.runInNewContext(slice("home.js", "var USES", "var INITIATIVE_UNKNOWN") + ";this.STEPS=STEPS;", ctx);
  vm.runInNewContext(slice("checklist.js", "var Q = [", "var picked") + ";this.Q=Q;this.GROUPS=GROUPS;", ctx);
  return JSON.parse(JSON.stringify({ STEPS: ctx.STEPS, Q: ctx.Q, GROUPS: ctx.GROUPS }));
}
module.exports = { builtin };
