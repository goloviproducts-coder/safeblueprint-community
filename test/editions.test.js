"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { build } = require("../scripts/build-edition.js");
const tmp = (n) => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ed-")), n);
const sri = (f) => "sha384-" + crypto.createHash("sha384").update(fs.readFileSync(f)).digest("base64");

test("selfhost edition keeps the contact form off", () => {
  const out = build("selfhost", tmp("s"));
  assert.match(fs.readFileSync(path.join(out, "config.js"), "utf8"), /FORM_ENDPOINT = ""/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, "config.json"), "utf8")).edition, "selfhost");
  assert.ok(!fs.existsSync(path.join(out, "contact.js")));
});
test("hosted edition turns on the contact form with correct SRI", () => {
  const out = build("hosted", tmp("h"));
  assert.match(fs.readFileSync(path.join(out, "config.js"), "utf8"), /FORM_ENDPOINT = "\/api\/contact"/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, "config.json"), "utf8")).edition, "hosted");
  const contact = fs.readFileSync(path.join(out, "contact", "index.html"), "utf8");
  assert.ok(contact.includes(sri(path.join(out, "contact.js"))));
  assert.ok(contact.includes(sri(path.join(out, "config.js"))));
  const home = fs.readFileSync(path.join(out, "index.html"), "utf8");
  assert.ok(home.includes(sri(path.join(out, "config.js"))), "home page SRI updated for hosted config.js");
});
test("unknown edition is refused", () => {
  assert.throws(() => build("evil", tmp("x")), /Edition must be/);
});
test("no penalty amounts, gmail or organisation emails in either edition", () => {
  ["hosted", "selfhost"].forEach((ed) => {
    const out = build(ed, tmp(ed));
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    walk(out).filter((f) => /\.(html|js|txt|json|csv)$/.test(f)).forEach((f) => {
      const t = fs.readFileSync(f, "utf8");
      assert.ok(!/21,840|infringement notices of up to/i.test(t), "penalty amount in " + f);
      assert.ok(!/gmail/i.test(t), "gmail in " + f);
      assert.ok(!/golovi(?!products-coder)/i.test(t), "brand mention in " + f);
    });
  });
});

test("contact function: 503 without Resend config, Resend only, recipient from CONTACT_TO", async () => {
  const mod = await import(path.join(__dirname, "..", "functions", "api", "contact.js"));
  const body = { email: "a@b.co", consent: "yes", tool: "AI security checklist", _subject: "SafeBlueprint playbook request" };
  const req = (b) => new Request("https://safeblueprint.pages.dev/api/contact", { method: "POST", headers: { Origin: "https://safeblueprint.pages.dev", "Content-Type": "application/json" }, body: JSON.stringify(b) });
  let r = await mod.onRequestPost({ request: req(body), env: {} });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).message, "contact temporarily unavailable");
  r = await mod.onRequestPost({ request: req(body), env: { RESEND_API_KEY: "k" } });
  assert.equal(r.status, 503);
  const calls = [];
  const orig = global.fetch;
  global.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ id: "x1" }), { status: 200 }); };
  try {
    r = await mod.onRequestPost({ request: req(body), env: { RESEND_API_KEY: "k", CONTACT_TO: "team@example.org" } });
  } finally { global.fetch = orig; }
  assert.equal(r.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.deepEqual(calls[0].body.to, ["team@example.org"]);
  const bad = new Request("https://x/api/contact", { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
  assert.equal((await mod.onRequestPost({ request: bad, env: {} })).status, 403);
  assert.ok(!/formsubmit/i.test(fs.readFileSync(path.join(__dirname, "..", "functions", "api", "contact.js"), "utf8")));
});

test("edition-aware text: selfhost says internal admin, hosted points to the form", () => {
  const os = require("os");
  const { build } = require("../scripts/build-edition.js");
  const s = build("selfhost", fs.mkdtempSync(path.join(os.tmpdir(), "s-")));
  const h = build("hosted", fs.mkdtempSync(path.join(os.tmpdir(), "h-")));
  const sa = fs.readFileSync(path.join(s, "about", "index.html"), "utf8");
  const ha = fs.readFileSync(path.join(h, "about", "index.html"), "utf8");
  assert.match(sa, /contact your internal admin/); assert.doesNotMatch(sa, /contact form<\/a> if you need/);
  assert.match(ha, /contact form<\/a> if you need a reply/); assert.doesNotMatch(ha, /internal admin/);
  assert.ok(ha.includes("instagram.com/aibuzzcrew"));
  assert.doesNotMatch(fs.readFileSync(path.join(h, "index.html"), "utf8"), /no forms that send data/);
});
test("contact function rejects localhost origins in production", async () => {
  const { onRequestPost } = await import(path.join(__dirname, "..", "functions", "api", "contact.js"));
  for (const o of ["http://localhost:8788", "http://127.0.0.1:3000"]) {
    const r = await onRequestPost({ request: new Request("https://safeblueprint.pages.dev/api/contact", { method: "POST", headers: { Origin: o, "Content-Type": "application/json" }, body: "{}" }), env: { RESEND_API_KEY: "x", CONTACT_TO: "a@b.c" } });
    assert.equal(r.status, 403);
  }
});

test("hosted contact page offers Instagram and GitHub fallbacks without revealing an email", () => {
  const IG = "https://www.instagram.com/aibuzzcrew/";
  const GH = "https://github.com/goloviproducts-coder/safeblueprint-community/issues";
  const out = build("hosted", fs.mkdtempSync(path.join(os.tmpdir(), "sb-hosted-")));
  const html = fs.readFileSync(path.join(out, "contact", "index.html"), "utf8");
  const js = fs.readFileSync(path.join(out, "contact.js"), "utf8");
  const hrefs = [...html.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.some((h) => h === IG));
  assert.ok(hrefs.some((h) => h === GH));
  const consts = Object.fromEntries([...js.matchAll(/var (IG_URL|ISSUES_URL) = "([^"]+)";/g)].map((m) => [m[1], m[2]]));
  assert.equal(consts.IG_URL, IG);
  assert.equal(consts.ISSUES_URL, GH);
  for (const s of [html, js]) assert.doesNotMatch(s, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  assert.match(js, /Our contact form is temporarily unavailable\. Please message us on /);
  assert.match(js, /response\.status === 429/);
  const self = build("selfhost", fs.mkdtempSync(path.join(os.tmpdir(), "sb-self-")));
  const selfHrefs = [...fs.readFileSync(path.join(self, "contact", "index.html"), "utf8").matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(!selfHrefs.some((h) => h === IG));
});
