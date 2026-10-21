// Browser security tests. Run: npm run test:security
"use strict";
const BASE_URL = process.env.PW_BASE_URL || "http://localhost:4173";
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "test/security",
  timeout: 60000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { baseURL: BASE_URL, acceptDownloads: true, ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
  webServer: { command: "npx --no-install serve site -l 4173", url: BASE_URL + "/", reuseExistingServer: !process.env.CI, timeout: 30000 }
});
