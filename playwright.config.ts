import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Look only in e2e tests folder by default
  testDir: 'tests/e2e',
  // Ignore manual and other non-e2e tests so they are not executed automatically
  testIgnore: ['tests/manual/**', 'src/tests/**'],
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
