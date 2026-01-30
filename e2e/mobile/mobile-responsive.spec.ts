import { test, expect } from '@playwright/test';

/**
 * Mobile Responsive Breakpoint Tests
 *
 * Verifies pages render correctly across 4 viewport widths:
 * - Small mobile (320px) - oldest small phones
 * - Standard mobile (375px) - iPhone SE / standard phones
 * - Tablet (768px) - iPad portrait
 * - Desktop (1024px) - small desktop / landscape tablet
 */

const breakpoints = [
  { name: 'Small Mobile', width: 320, height: 568 },
  { name: 'Standard Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1024, height: 768 },
] as const;

for (const bp of breakpoints) {
  test.describe(`Responsive @ ${bp.name} (${bp.width}px)`, () => {
    test.use({ viewport: { width: bp.width, height: bp.height } });

    test.beforeEach(async ({ page }) => {
      // Login as Super Admin
      await page.goto('/#/login');
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible({ timeout: 10000 });
      await page.locator('button:has-text("Super Admin")').click();
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
    });

    test('admin dashboard renders without horizontal overflow', async ({ page }) => {
      await page.goto('/#/');
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

      // Check for horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
    });

    test('navigation is accessible', async ({ page }) => {
      // On smaller viewports, look for hamburger/menu button or sidebar
      if (bp.width < 768) {
        // Mobile: expect hamburger menu OR visible nav links
        const hamburger = page.locator(
          'button[aria-label*="menu"], button[aria-label*="Menu"], ' +
          'button:has(svg[class*="menu"]), [data-testid="mobile-menu"], ' +
          'button:has([class*="hamburger"])'
        ).first();
        const sidebar = page.locator('nav, [role="navigation"], aside').first();

        const hasHamburger = await hamburger.isVisible({ timeout: 3000 }).catch(() => false);
        const hasSidebar = await sidebar.isVisible({ timeout: 3000 }).catch(() => false);

        expect(hasHamburger || hasSidebar).toBe(true);
      } else {
        // Tablet/Desktop: sidebar or top nav should be visible
        const nav = page.locator('nav, [role="navigation"], aside').first();
        await expect(nav).toBeVisible({ timeout: 5000 });
      }
    });

    test('inquiries page renders correctly', async ({ page }) => {
      const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();

      if (await inquiriesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await inquiriesLink.click();
        await expect(page).toHaveURL(/inquiries/);
        await expect(page.locator('h1:has-text("Inquiries")')).toBeVisible({ timeout: 10000 });

        // Verify no horizontal overflow on inquiries page
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      }
    });

    if (bp.width < 640) {
      test('tables have scrollable containers on small screens', async ({ page }) => {
        const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();

        if (await inquiriesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await inquiriesLink.click();
          await expect(page).toHaveURL(/inquiries/);

          // Check if any tables exist and are within scrollable containers
          const tables = page.locator('table');
          const tableCount = await tables.count();

          for (let i = 0; i < tableCount; i++) {
            const table = tables.nth(i);
            if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
              // Table's parent or ancestor should allow horizontal scroll
              const isScrollable = await table.evaluate((el) => {
                let parent = el.parentElement;
                while (parent) {
                  const style = window.getComputedStyle(parent);
                  if (
                    style.overflowX === 'auto' ||
                    style.overflowX === 'scroll' ||
                    style.overflow === 'auto' ||
                    style.overflow === 'scroll' ||
                    parent.classList.contains('overflow-x-auto') ||
                    parent.classList.contains('overflow-auto')
                  ) {
                    return true;
                  }
                  parent = parent.parentElement;
                }
                // If table fits within viewport, scrollability isn't needed
                return el.scrollWidth <= el.clientWidth;
              });

              expect(isScrollable).toBe(true);
            }
          }
        }
      });
    }
  });
}
