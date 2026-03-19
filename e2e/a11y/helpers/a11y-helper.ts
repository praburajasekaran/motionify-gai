import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

const BASE = '/portal';
const API = '/.netlify/functions';

export const ADMIN_USER = {
  id: 'a11y-admin-001',
  name: 'A11y Admin',
  email: 'admin@a11y-test.com',
  role: 'super_admin',
  avatar: '',
  projectTeamMemberships: {},
};

export const CLIENT_USER = {
  id: 'a11y-client-001',
  name: 'A11y Client',
  email: 'client@a11y-test.com',
  role: 'client',
  avatar: '',
  projectTeamMemberships: {},
};

/**
 * Set up auth mocks and inject session into localStorage.
 * Reuses the pattern from comment-system.spec.ts.
 */
export async function setupAuth(page: Page, user: typeof ADMIN_USER) {
  // Mock auth-me endpoint
  await page.route(`**${API}/auth-me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user }),
    });
  });

  // Catch-all for other API calls to prevent 404s — return empty success
  await page.route(`**${API}/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Navigate to login and inject localStorage session
  await page.goto(`${BASE}/login`);
  await page.evaluate((userData) => {
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_expires', new Date(Date.now() + 86400000).toISOString());
  }, user);
}

/**
 * Toggle theme by manipulating the dark class on <html>.
 * next-themes uses attribute="class", so this directly controls the theme.
 */
export async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, theme);
  // Allow CSS to repaint
  await page.waitForTimeout(200);
}

/**
 * Run axe color-contrast-enhanced (AAA) check on the current page.
 * Returns the axe results object.
 */
export async function checkContrast(page: Page, screenName: string, theme: string) {
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast-enhanced'])
    .analyze();

  if (results.violations.length > 0) {
    console.log(`\n[${theme.toUpperCase()}] ${screenName}: ${results.violations.length} violation(s)`);
    for (const violation of results.violations) {
      console.log(`  Rule: ${violation.id} — ${violation.help}`);
      for (const node of violation.nodes) {
        console.log(`    - ${node.target.join(' > ')}`);
        console.log(`      ${node.failureSummary}`);
      }
    }
  }

  return results;
}

/**
 * Audit a screen in both light and dark mode.
 * Navigates to the route, waits for load, then runs contrast checks in both themes.
 * Captures full-page screenshots on violations.
 */
export async function auditScreen(
  page: Page,
  route: string,
  screenName: string,
  options?: { takeScreenshot?: boolean }
) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');

  const results: Record<string, Awaited<ReturnType<typeof checkContrast>>> = {};

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    results[theme] = await checkContrast(page, screenName, theme);

    if (options?.takeScreenshot && results[theme].violations.length > 0) {
      const filename = screenName.toLowerCase().replace(/[\s/]+/g, '-');
      await page.screenshot({
        path: `test-results/a11y-${filename}-${theme}.png`,
        fullPage: true,
      });
    }
  }

  return results;
}

/**
 * Assert zero AAA contrast violations for both themes.
 */
export function assertNoViolations(
  results: Record<string, Awaited<ReturnType<typeof checkContrast>>>,
  screenName: string
) {
  for (const theme of ['light', 'dark']) {
    const violations = results[theme].violations;
    const details = violations
      .flatMap((v) => v.nodes.map((n) => `${n.target.join(' > ')}: ${n.failureSummary}`))
      .join('\n');
    expect(
      violations,
      `[${theme.toUpperCase()}] ${screenName} has ${violations.length} AAA contrast violation(s):\n${details}`
    ).toHaveLength(0);
  }
}
