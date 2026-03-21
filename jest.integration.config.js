export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.integration.js"],
  testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
};