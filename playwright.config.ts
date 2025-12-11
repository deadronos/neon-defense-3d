import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Use the repository root as the base for tests; only run e2e tests by default
  testDir: '.',
  // Ignore manual folder so tests there are not executed automatically
  testIgnore: 'tests/manual/**',
  timeout: 60_000,
  expect: { timeout: 5000 },
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 0,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174',
    port: 5174,
    reuseExistingServer: true,
  },
});
