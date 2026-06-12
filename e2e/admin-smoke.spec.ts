import { test, expect } from '@playwright/test';
import { setupAuthSession } from './helpers/auth';

test.describe('Admin Smoke Test', () => {
  test('should login as admin and access admin features', async ({ page }) => {
    await setupAuthSession(page);

    await page.goto('/portal');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
  });

  test('should access inquiry management', async ({ page }) => {
    await setupAuthSession(page);
    await page.goto('/portal');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });

    // Navigate to inquiries (look for navigation link or button)
    const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();
    if (await inquiriesLink.isVisible()) {
      await inquiriesLink.click();
      await expect(page).toHaveURL(/inquiries/);
    }
  });

  test('should access user management', async ({ page }) => {
    await setupAuthSession(page);
    await page.goto('/portal');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });

    // Navigate to user management (if available)
    const userMgmtLink = page.locator('a:has-text("Team"), button:has-text("Team")').first();
    if (await userMgmtLink.isVisible()) {
      await userMgmtLink.click();
    }
  });
});
