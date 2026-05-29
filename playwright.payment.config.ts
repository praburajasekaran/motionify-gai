import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Payment Flow Tests
 *
 * This config tests the Vite-hosted public payment handoff surface.
 *
 * Run with: npx playwright test --config=playwright.payment.config.ts
 */

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/payment-*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once for payment tests
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:8899',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run build && ./node_modules/.bin/vite preview --host 127.0.0.1 --port 8899',
    url: 'http://localhost:8899',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
