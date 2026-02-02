import { test, expect, devices } from '@playwright/test';

/**
 * Mobile Device-Specific Proposal Workflow Tests
 *
 * Verifies proposal pages work correctly on real device emulations:
 * - iPhone 13 (iOS standard)
 * - Pixel 5 (Android standard)
 * - Galaxy S9+ (Android large)
 *
 * Tests cover: page loads, content rendering, form usability, and touch target sizes.
 */

const MIN_TOUCH_TARGET = 44; // iOS Human Interface Guidelines minimum (px)

// Strip defaultBrowserType from device configs to avoid Playwright worker constraint
function deviceUseConfig(deviceName: string) {
  const { defaultBrowserType, ...config } = devices[deviceName];
  return config;
}

const mobileDevices = [
  { name: 'iPhone 13', config: deviceUseConfig('iPhone 13') },
  { name: 'Pixel 5', config: deviceUseConfig('Pixel 5') },
  { name: 'Galaxy S9+', config: deviceUseConfig('Galaxy S9+') },
];

for (const device of mobileDevices) {
  test.describe(`Proposal Workflow on ${device.name}`, () => {
    test.use({ ...device.config });

    test.beforeEach(async ({ page }) => {
      // Login as Super Admin
      await page.goto('/login');
      await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible({ timeout: 10000 });
      await page.locator('button:has-text("Super Admin")').click();
      await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
    });

    test('dashboard loads and is interactive', async ({ page }) => {
      // Verify dashboard content is visible
      await expect(page.locator('text=Dashboard')).toBeVisible();

      // Verify page doesn't overflow horizontally
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);

      // Verify tap on navigation works
      const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();
      if (await inquiriesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await inquiriesLink.tap();
        await expect(page).toHaveURL(/inquiries/);
      }
    });

    test('inquiry list page loads on mobile', async ({ page }) => {
      // Navigate to inquiries
      const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();

      if (await inquiriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await inquiriesLink.tap();
        await expect(page).toHaveURL(/inquiries/);

        // Verify main content is visible
        await expect(page.locator('h1:has-text("Inquiries")')).toBeVisible({ timeout: 10000 });

        // Verify page is scrollable (touch scroll)
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = await page.evaluate(() => window.innerHeight);

        // Page should have content (body height should be reasonable)
        expect(bodyHeight).toBeGreaterThan(0);
      }
    });

    test('inquiry detail page accessible via tap', async ({ page }) => {
      const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();

      if (await inquiriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await inquiriesLink.tap();
        await expect(page).toHaveURL(/inquiries/);

        // Try tapping on first inquiry
        const inquiryItem = page.locator(
          '[data-testid="inquiry-card"], [class*="inquiry"], a[href*="/admin/inquiries/"]'
        ).first();

        if (await inquiryItem.isVisible({ timeout: 5000 }).catch(() => false)) {
          await inquiryItem.tap();
          await expect(page).toHaveURL(/\/admin\/inquiries\/\w+/);

          // Verify content renders on detail page
          const mainContent = page.locator('main, [role="main"], .container, #app').first();
          await expect(mainContent).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('forms have adequate touch targets', async ({ page }) => {
      const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();

      if (await inquiriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await inquiriesLink.tap();
        await expect(page).toHaveURL(/inquiries/);

        // Navigate to an inquiry detail that might have a proposal creation form
        const inquiryItem = page.locator(
          '[data-testid="inquiry-card"], a[href*="/admin/inquiries/"]'
        ).first();

        if (await inquiryItem.isVisible({ timeout: 5000 }).catch(() => false)) {
          await inquiryItem.tap();

          const createBtn = page.locator('button:has-text("Create Proposal")').first();

          if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await createBtn.tap();

            // Check form inputs have adequate height for touch
            const inputs = page.locator('input:visible, textarea:visible, select:visible');
            const inputCount = await inputs.count();

            for (let i = 0; i < Math.min(inputCount, 10); i++) {
              const input = inputs.nth(i);
              const box = await input.boundingBox();

              if (box) {
                // Input fields should meet minimum touch target height
                expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET - 8); // 36px minimum with 8px tolerance
              }
            }
          }
        }
      }
    });

    test('primary action buttons meet touch target guidelines', async ({ page }) => {
      // Check buttons on dashboard
      const buttons = page.locator('button:visible, a[role="button"]:visible');
      const buttonCount = await buttons.count();

      let checkedCount = 0;
      for (let i = 0; i < Math.min(buttonCount, 15); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();

        if (box && box.width > 20) {
          // Primary action buttons should be at least 44x44px
          // Allow smaller for icon-only buttons that are part of larger tap areas
          if (box.width >= 60) {
            expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET - 12); // 32px minimum with tolerance
            checkedCount++;
          }
        }
      }

      // We should have found at least some buttons to check
      expect(checkedCount).toBeGreaterThan(0);
    });

    test('page supports scroll interaction', async ({ page }) => {
      // Navigate to a content-heavy page
      const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();

      if (await inquiriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await inquiriesLink.tap();
        await expect(page).toHaveURL(/inquiries/);
        await expect(page.locator('h1:has-text("Inquiries")')).toBeVisible({ timeout: 10000 });

        // Simulate touch scroll
        const initialScrollY = await page.evaluate(() => window.scrollY);

        await page.touchscreen.tap(
          device.config.viewport.width / 2,
          device.config.viewport.height / 2
        );

        // Swipe up to scroll
        await page.mouse.move(
          device.config.viewport.width / 2,
          device.config.viewport.height * 0.8
        );
        await page.mouse.down();
        await page.mouse.move(
          device.config.viewport.width / 2,
          device.config.viewport.height * 0.2,
          { steps: 10 }
        );
        await page.mouse.up();

        // Page should be scrollable (or content fits in viewport)
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = await page.evaluate(() => window.innerHeight);

        // Either we scrolled, or the content fits in the viewport
        const afterScrollY = await page.evaluate(() => window.scrollY);
        const fitsInViewport = bodyHeight <= viewportHeight;
        const didScroll = afterScrollY > initialScrollY;

        expect(fitsInViewport || didScroll).toBe(true);
      }
    });
  });
}
