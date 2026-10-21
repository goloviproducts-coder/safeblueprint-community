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
