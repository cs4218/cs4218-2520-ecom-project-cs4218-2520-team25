const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './client/tests',
  timeout: 15_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [['html'], ['list']],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    actionTimeout: 0,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: [
    {
      command: 'node server.js',
      port: 6060,
      reuseExistingServer: true,
    },
    {
      command: 'npm run client',
      port: 3000,
      reuseExistingServer: true,
    },
  ],
});
