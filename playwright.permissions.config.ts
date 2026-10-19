import { defineConfig } from '@playwright/test';
import readiness from './playwright.readiness.config';

export default defineConfig({
  ...readiness,
  testMatch: ['**/permissions-readiness.spec.ts'],
  outputDir: 'playwright-permissions-results',
  reporter: [['list'], ['html', { outputFolder: 'playwright-permissions-report', open: 'never' }]],
  webServer: {
    ...readiness.webServer,
    command: 'VITE_API_URL=/api npm run build -- --outDir dist-readiness && node --import tsx scripts/readiness-sandbox.ts --serve',
  },
});
