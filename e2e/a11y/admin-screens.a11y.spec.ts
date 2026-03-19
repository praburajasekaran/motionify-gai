import { test } from '@playwright/test';
import { setupAuth, ADMIN_USER, auditScreen, assertNoViolations } from './helpers/a11y-helper';

test.describe('Accessibility: Admin Screens — AAA Contrast', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page, ADMIN_USER);
  });

  test('Dashboard', async ({ page }) => {
    const results = await auditScreen(page, '/portal/', 'Dashboard', {
      takeScreenshot: true,
    });
    assertNoViolations(results, 'Dashboard');
  });

  test('Project List', async ({ page }) => {
    const results = await auditScreen(page, '/portal/projects', 'Project List', {
      takeScreenshot: true,
    });
    assertNoViolations(results, 'Project List');
  });

  // Project Detail — all 7 tabs
  for (const [tab, name] of [
    ['1', 'Overview'],
    ['2', 'Tasks'],
    ['3', 'Deliverables'],
    ['4', 'Files'],
    ['5', 'Team'],
    ['6', 'Activity'],
    ['7', 'Payments'],
  ] as const) {
    test(`Project Detail — ${name} tab`, async ({ page }) => {
      const results = await auditScreen(
        page,
        `/portal/projects/a11y-project-001/${tab}`,
        `Project Detail — ${name}`,
        { takeScreenshot: true }
      );
      assertNoViolations(results, `Project Detail — ${name}`);
    });
  }

  test('Project Settings', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/projects/a11y-project-001/settings',
      'Project Settings',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Project Settings');
  });

  test('Deliverable Review', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/projects/a11y-project-001/deliverables/a11y-del-001',
      'Deliverable Review',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Deliverable Review');
  });

  test('Settings', async ({ page }) => {
    const results = await auditScreen(page, '/portal/settings', 'Settings', {
      takeScreenshot: true,
    });
    assertNoViolations(results, 'Settings');
  });

  // Admin-only screens
  test('Inquiry Dashboard', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/admin/inquiries',
      'Inquiry Dashboard',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Inquiry Dashboard');
  });

  test('Inquiry Detail', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/admin/inquiries/a11y-inq-001',
      'Inquiry Detail',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Inquiry Detail');
  });

  test('Proposal Builder', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/admin/inquiries/a11y-inq-001/proposal',
      'Proposal Builder',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Proposal Builder');
  });

  test('Proposal Detail', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/admin/proposals/a11y-proposal-001',
      'Proposal Detail',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Proposal Detail');
  });

  test('User Management', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/admin/users',
      'User Management',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'User Management');
  });

  test('Activity Logs', async ({ page }) => {
    const results = await auditScreen(
      page,
      '/portal/admin/activity-logs',
      'Activity Logs',
      { takeScreenshot: true }
    );
    assertNoViolations(results, 'Activity Logs');
  });

  test('Payments', async ({ page }) => {
    const results = await auditScreen(page, '/portal/admin/payments', 'Payments', {
      takeScreenshot: true,
    });
    assertNoViolations(results, 'Payments');
  });
});
