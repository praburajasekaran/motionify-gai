import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/client-delivery.spec.ts', '**/proposal-readiness.spec.ts'],
  outputDir: 'playwright-readiness-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { outputFolder: 'playwright-readiness-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8901',
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `VITE_API_URL=/api npm run build -- --outDir dist-readiness && node --import tsx scripts/readiness-sandbox.ts --serve${process.env.READINESS_R2_ENV_FILE ? ' --real-storage' : ''}`,
    url: 'http://127.0.0.1:8901/__readiness/fixture',
    reuseExistingServer: false,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    stdout: 'pipe', stderr: 'pipe',
  },
});
