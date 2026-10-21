"use strict";
const { test, expect } = require("@playwright/test");
const { guard } = require("./helpers");

test("every page loads with zero cross-origin requests and no CSP violations", async ({ page }) => {
  const g = await guard(page);
  for (const p of ["/", "/ai-security-checklist/", "/about/", "/security/", "/privacy/", "/contact/", "/sample/", "/schema/"]) {
    await page.goto(p, { waitUntil: "networkidle" });
  }
  await g.check();
});

test("full AI checklist run and every export stay on the device", async ({ page }) => {
  const g = await guard(page);
  await page.goto("/ai-security-checklist/", { waitUntil: "networkidle" });
  await page.fill("#org-name", "<img src=x onerror=window.__pwned=1>");
  const names = await page.$$eval("#qcards input[type=radio]", (els) => [...new Set(els.map((e) => e.name))]);
  for (const n of names) await page.locator(`#qcards input[name="${n}"][value="2"]`).check({ force: true });
  await page.click("#see-results");
  await expect(page.locator("#out")).toBeVisible();
  for (const sel of ["#out .save-html", "#out .csv-tasks"]) {
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click(sel)]);
    expect(await dl.path()).toBeTruthy();
  }
  await page.evaluate(() => { window.print = () => {}; });
  await page.click("#out .save-pdf").catch(() => {});
  await page.waitForTimeout(500);
  await g.check();
});

test("APP 1.7 inventory run stays on the device", async ({ page }) => {
  const g = await guard(page);
  await page.goto("/", { waitUntil: "networkidle" });
  const names = await page.$$eval("#qcards input[type=radio]", (els) => [...new Set(els.map((e) => e.name))]);
  for (const n of names) await page.locator(`#qcards input[name="${n}"]`).first().check({ force: true });
  const buttons = await page.$$("button");
  expect(buttons.length).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  await g.check();
});

test("the guard itself catches CSP violations and injected script (self-test)", async ({ page }) => {
  const g = await guard(page);
  await page.goto("/about/");
  await page.evaluate(() => { const i = document.createElement("img"); i.src = "https://example.com/x.png"; document.body.appendChild(i); window.__pwned = 1; });
  await page.waitForTimeout(500);
  const csp = await page.evaluate(() => window.__csp);
  expect(csp.join(" ")).toContain("example.com");
  await expect(g.check()).rejects.toThrow();
});
