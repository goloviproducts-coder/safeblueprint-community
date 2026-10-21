"use strict";
const { test, expect } = require("@playwright/test");
const { guard, loadPack } = require("./helpers");

const H = "id,pack,section,question,help_text,type,options,weight,risk_if,severity,maps_to_control,finding_text,action_text,owner_role\n";
const XSS = [
  "<script>window.__pwned=1</script>",
  "<img src=x onerror=\"window.__pwned=1\">",
  "<svg onload=\"window.__pwned=1\"></svg>",
  "javascript:window.__pwned=1",
  "\"><iframe src=\"javascript:window.__pwned=1\"></iframe>"
];
const q = (s) => '"' + s.replace(/"/g, '""') + '"';

test("script, event-handler and javascript: payloads in a pack never execute, in the UI, report or exports", async ({ page }) => {
  const g = await guard(page);
  await page.goto("/ai-security-checklist/");
  const rows = XSS.map((x, i) => [
    "X" + i, "evil", q("Sec " + x), q("Q " + x), q("Help " + x), "choice", q("a=" + x + "|b=Safe"), "2", "a", "high", "EVIL-" + i, q("Finding " + x), q("Action " + x), q("Owner " + x)
  ].join(","));
  await loadPack(page, "evil.csv", "# name: <b>Evil</b><script>window.__pwned=1</script>\n" + H + rows.join("\n") + "\n");
  await expect(page.locator("#pack-preview")).toBeVisible();
  await expect(page.locator("#pack-errors")).toBeHidden();
  await page.click("#pack-preview button");
  for (let i = 0; i < XSS.length; i++) await page.locator(`input[name="pk-X${i}"][value="a"]`).check({ force: true });
  await page.click("#pack-results");
  await expect(page.locator("#pack-out")).toBeVisible();
  // Payloads appear as text, not as elements.
  expect(await page.locator("#pack-out script, #pack-out img, #pack-out svg, #pack-out iframe").count()).toBe(0);
  expect(await page.locator("#pack-qcards script, #pack-qcards img[src=x], #pack-qcards svg, #pack-qcards iframe").count()).toBe(0);
  await expect(page.locator("#pack-out")).toContainText("<script>window.__pwned=1</script>");
  expect(await page.locator('a[href^="javascript:"]').count()).toBe(0);
  // Exports
  for (const [id, check] of [["#pack-json", (t) => JSON.parse(t)], ["#pack-md", (t) => t], ["#pack-html", (t) => t]]) {
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click(id)]);
    const text = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c).toString("utf8"));
    check(text);
    if (id === "#pack-html") {
      expect(text).not.toMatch(/<script>window\.__pwned/);
      expect(text).not.toMatch(/<img src=x onerror/);
      expect(text).toContain("&lt;script&gt;");
    }
  }
  await page.waitForTimeout(300);
  await g.check();
});

test("formula injection payloads are neutralised in CSV cells", async ({ page }) => {
  const g = await guard(page);
  await page.goto("/ai-security-checklist/");
  const out = await page.evaluate(() => ["=cmd|' /C calc'!A0", "+SUM(1,2)", "-2+3", "@HYPERLINK(\"http://x\")", "\t=1"].map((v) => csvCell(v)));
  out.forEach((v) => expect(v.replace(/^"/, "")).toMatch(/^'/));
  await loadPack(page, "formula.csv", H + 'F1,p,S,"=cmd|\' /C calc\'!A0",,yesno,,1,no,high,X-1,"=HYPERLINK(""http://evil"")",,\n');
  await expect(page.locator("#pack-preview")).toBeVisible();
  await g.check();
});

test("huge, deeply nested and malformed files fail safely with a clear message", async ({ page }) => {
  const g = await guard(page);
  await page.goto("/ai-security-checklist/");
  await loadPack(page, "big.csv", H + "A,p,S,Q,,yesno,,1,no,high,X-1,,,\n" + "x".repeat(1100 * 1024));
  await expect(page.locator("#pack-errors")).toContainText("larger than 1 MB");
  let deep = "1"; for (let i = 0; i < 5000; i++) deep = "[" + deep + "]";
  await loadPack(page, "deep.json", '{"questions":[{"id":"Q1","pack":"p","section":"S","question":"Q","type":"choice","options":' + deep + "}]}");
  await expect(page.locator("#pack-errors")).toBeVisible();
  await loadPack(page, "proto.json", '{"__proto__":{"polluted":1},"questions":[{"id":"Q1","pack":"p","section":"S","question":"Q","type":"yesno","constructor":"x"}]}');
  await expect(page.locator("#pack-errors")).toContainText("Unknown field");
  expect(await page.evaluate(() => ({}).polluted)).toBeUndefined();
  await loadPack(page, "bad.csv", 'id,pack,section,question,type\nQ1,p,S,"never closed,yesno\n');
  await expect(page.locator("#pack-errors")).toContainText("never closed");
  await loadPack(page, "bin.csv", "\u0000\u00ff\u00fe garbage");
  await expect(page.locator("#pack-errors")).toBeVisible();
  // Page still works afterwards
  await loadPack(page, "ok.csv", H + "Q1,p,S,Fine?,,yesno,,1,no,high,X-1,,,\n");
  await expect(page.locator("#pack-preview")).toContainText("Questions: 1");
  await g.check();
});
