import { defineConfig, devices } from '@playwright/test';

if (!process.env.VERIFY_URL || !process.env.VERIFY_PROOF) throw new Error('Run through control.mjs drive');

export default defineConfig({
  testDir: '.',
  testMatch: 'smoke.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  outputDir: `${process.env.VERIFY_PROOF}/test-results`,
  reporter: [
    ['list'],
    ['json', { outputFile: `${process.env.VERIFY_PROOF}/results.json` }],
    ['html', { outputFolder: `${process.env.VERIFY_PROOF}/report`, open: 'never' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.VERIFY_URL,
    serviceWorkers: 'block',
    trace: 'on',
    screenshot: 'on',
  },
});
