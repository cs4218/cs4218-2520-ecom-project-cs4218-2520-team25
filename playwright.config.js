const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./client/tests/integration",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: [
    {
      command: "npm run client",
      port: 3000,
      reuseExistingServer: true,
    },
  ],
});