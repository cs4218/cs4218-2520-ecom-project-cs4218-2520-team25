const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  projects: [
    {
      name: "integration",
      testDir: "./client/tests/integration",
    },
    {
      name: "ui tests",
      testDir: "./client/tests/ui-tests",
    }
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: [
    {
      command: "npm run dev",
      port: 3000,
      reuseExistingServer: true,
    },
  ],
});