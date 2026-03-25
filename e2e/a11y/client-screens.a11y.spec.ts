import { test } from '@playwright/test';
import { setupAuth, CLIENT_USER, auditScreen, assertNoViolations } from './helpers/a11y-helper';

test.describe('Accessibility: Client Screens — AAA Contrast', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page, CLIENT_USER);
  });

  test('Projects (client home)', async ({ page }) => {
    // Client role redirects from / to /projects
    const results = await auditScreen(page, '/portal/projects', 'Client — Projects', {
      takeScreenshot: true,
    });
    assertNoViolations(results, 'Client — Projects');
  });

  // Project Detail — all 7 tabs (client view)
  for (const [tab, name] of [
    ['1', 'Overview'],
    ['2', 'Tasks'],
    ['3', 'Deliverables'],
    ['4', 'Files'],
    ['5', 'Team'],
    ['6', 'Activity'],
    ['7', 'Payments'],
  ] as const) {
    test(`Project Detail — ${name} tab (client)`, async ({ page }) => {
      const results = await auditScreen(
        page,
        `/portal/projects/a11y-project-001/${tab}`,
        `Client — Project Detail — ${name}`,
        { takeScreenshot: true }
      );
      assertNoViolations(results, `Client — Project Detail — ${name}`);
    });
  }

  test('Deliverable Review (client)', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/projects/a11y-project-001/deliverables/a11y-del-001',
      'Client — Deliverable Review',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Client — Deliverable Review');
  });

  test('Payment', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/payment/a11y-proposal-001',
      'Client — Payment',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Client — Payment');
  });

  test('Settings (client)', async ({ page }) => {
    const results = await auditScreen(page, '/portal/settings', 'Client — Settings', {
      takeScreenshot: true,
    });
    assertNoViolations(results, 'Client — Settings');
  });
});
