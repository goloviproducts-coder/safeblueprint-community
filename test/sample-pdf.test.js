"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

test("published sample PDF is identical to docs/samples copy", () => {
  const a = fs.readFileSync(path.join(root, "docs/samples/sample-portfolio.pdf"));
  const b = fs.readFileSync(path.join(root, "site/samples/sample-portfolio.pdf"));
  assert.ok(a.equals(b), "site/samples/sample-portfolio.pdf must match docs/samples/sample-portfolio.pdf");
  assert.equal(b.subarray(0, 5).toString(), "%PDF-");
});

test("home sample card links to the PDF in a new tab", () => {
  const html = fs.readFileSync(path.join(root, "site/index.html"), "utf8");
  assert.match(html, /<a class="sample-thumb" href="\/samples\/sample-portfolio\.pdf" target="_blank" rel="noopener"/);
  assert.ok(html.includes("See the fictional sample report (PDF)"));
});

test("_headers serves /samples/* as application/pdf with the full security headers", () => {
  const h = fs.readFileSync(path.join(root, "site/_headers"), "utf8");
  const blk = h.split("/samples/*\n")[1];
  assert.ok(blk, "/samples/* block present");
  assert.match(blk, /Content-Type: application\/pdf/);
  assert.match(blk, /X-Content-Type-Options: nosniff/);
  assert.match(blk, /Content-Security-Policy:/);
});
