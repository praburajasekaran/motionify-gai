import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: '**/payment-readiness.spec.ts',
  outputDir: 'playwright-payment-readiness-results', fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-payment-readiness-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:8903', trace: 'retain-on-failure', video: 'on' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'VITE_API_URL=/api npm run build -- --outDir dist-payment-readiness && node --import tsx scripts/payment-sandbox.ts --browser',
    url: 'http://127.0.0.1:8903/__payment/fixture', reuseExistingServer: false, timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 }, stdout: 'pipe', stderr: 'pipe',
  },
});
