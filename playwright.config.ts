import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:8888',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/mobile/**',
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/mobile/**',
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
      testMatch: '**/mobile/**',
    },
    {
      name: 'Mobile Safari Large',
      use: { ...devices['iPhone 13 Pro Max'] },
      testMatch: '**/mobile/**',
    },
  ],

  webServer: {
    command: 'python3 -m http.server 8888 --directory dist',
    url: 'http://localhost:8888',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
