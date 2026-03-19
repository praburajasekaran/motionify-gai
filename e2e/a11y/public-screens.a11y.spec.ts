import { test } from '@playwright/test';
import { auditScreen, assertNoViolations } from './helpers/a11y-helper';

test.describe('Accessibility: Public Screens — AAA Contrast', () => {
  test('Landing Page', async ({ page }) => {
    const results = await auditScreen(page, '/portal/landing', 'Landing Page', {
      takeScreenshot: true,
    });
    assertNoViolations(results, 'Landing Page');
  });

  test('Login', async ({ page }) => {
    const results = await auditScreen(page, '/portal/login', 'Login', {
      takeScreenshot: true,
    });
    assertNoViolations(results, 'Login');
  });

  test('Inquiry Tracking', async ({ page }) => {
    // Uses a placeholder inquiry number — page should render even if not found
    const results = await auditScreen(
      page,
      '/portal/inquiry-status/INQ-A11Y-001',
      'Inquiry Tracking',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Inquiry Tracking');
  });
});
