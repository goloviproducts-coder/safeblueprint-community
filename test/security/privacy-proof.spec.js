// Privacy proof: anyone can run `npm run privacy-proof` to see that a full SafeBlueprint run,
// including every export, makes zero requests to any other origin.
"use strict";
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { guard, loadPack } = require("./helpers");

async function saveAll(page, selectors) {
  for (const sel of selectors) {
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click(sel)]);
    expect(await dl.path(), "export saved on this device: " + sel).toBeTruthy();
  }
}

test("privacy proof: full checklist run, custom pack run and every export make zero requests to other origins", async ({ page, baseURL }) => {
  const g = await guard(page);
  const origins = new Set();
  page.on("request", (r) => { const u = new URL(r.url()); if (u.protocol.startsWith("http")) origins.add(u.origin); });

  // 1. Built-in AI security checklist: answer everything, see results, save every export.
  await page.goto("/ai-security-checklist/", { waitUntil: "networkidle" });
  await page.fill("#org-name", "Privacy proof org");
  const names = await page.$$eval("#qcards input[type=radio]", (els) => [...new Set(els.map((e) => e.name))]);
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) await page.locator(`#qcards input[name="${n}"]`).first().check({ force: true });
  await page.click("#see-results");
  await expect(page.locator("#out")).toBeVisible();
  await saveAll(page, ["#out .save-html", "#out .csv-tasks"]);
  // PDF export uses the browser's print dialog; record that it was opened, without leaving the device.
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
  await page.click("#out .save-pdf");
  await expect.poll(() => page.evaluate(() => window.__printed), { message: "PDF export opened the print dialog" }).toBeGreaterThan(0);

  // 2. A custom question pack loaded from a local file: run it and save JSON, Markdown and HTML.
  const csv = fs.readFileSync(path.join(__dirname, "..", "..", "examples", "acme-pack.csv"), "utf8");
  await loadPack(page, "acme-pack.csv", csv);
  await expect(page.locator("#pack-preview")).toBeVisible();
  await page.click("#pack-preview button");
  // Answer every visible question; follow-up questions appear as earlier answers change.
  for (let pass = 0; pass < 5; pass++) {
    const pk = await page.$$eval("#pack-qcards input[type=radio], #pack-qcards input[type=checkbox]", (els) => [...new Set(els.filter((e) => e.offsetParent !== null).map((e) => e.name))]);
    for (const n of pk) await page.locator(`#pack-qcards input[name="${n}"]`).first().check({ force: true });
  }
  await page.click("#pack-results");
  await expect(page.locator("#pack-out")).toBeVisible();
  await saveAll(page, ["#pack-json", "#pack-md", "#pack-html"]);

  // 3. APP 1.7 readiness on the home page.
  await page.goto("/", { waitUntil: "networkidle" });
  const app = await page.$$eval("#qcards input[type=radio]", (els) => [...new Set(els.map((e) => e.name))]);
  for (const n of app) await page.locator(`#qcards input[name="${n}"]`).first().check({ force: true });
  await page.waitForTimeout(500);

  await g.check();
  console.log("Origins contacted during the whole run: " + [...origins].join(", "));
  expect([...origins]).toEqual([new URL(baseURL).origin]);
});
