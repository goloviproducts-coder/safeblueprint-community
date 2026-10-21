// Browser security tests. Run: npm run test:security
"use strict";
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "test/security",
  timeout: 60000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { baseURL: "http://localhost:4173", acceptDownloads: true, ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
  webServer: { command: "npx --no-install serve site -l 4173", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI, timeout: 30000 }
});
