"use strict";
const { expect } = require("@playwright/test");

// Watches a page for: requests to other origins, CSP violations, dialogs, and a canary set by injected script.
async function guard(page) {
  const state = { external: [], csp: [], dialogs: [], errors: [] };
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI));
  });
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (!["http:", "https:"].includes(u.protocol)) return; // data:, blob: stay on device
    if (u.origin !== "http://localhost:4173") state.external.push(r.url());
  });
  page.on("dialog", async (d) => { state.dialogs.push(d.message()); await d.dismiss(); });
  page.on("pageerror", (e) => state.errors.push(e.message));
  state.check = async () => {
    const csp = await page.evaluate(() => window.__csp || []).catch(() => []);
    const pwned = await page.evaluate(() => window.__pwned || 0).catch(() => 0);
    expect(state.external, "no requests to other origins").toEqual([]);
    expect(csp.concat(state.csp), "no CSP violations").toEqual([]);
    expect(state.dialogs, "no injected dialogs").toEqual([]);
    expect(pwned, "injected script did not run").toBe(0);
  };
  return state;
}

async function loadPack(page, name, text) {
  await page.setInputFiles("#pack-file", { name, mimeType: name.endsWith(".json") ? "application/json" : "text/csv", buffer: Buffer.from(text) });
}
module.exports = { guard, loadPack };
