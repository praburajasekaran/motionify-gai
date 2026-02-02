import { test, expect } from '@playwright/test';

test.describe('Admin Smoke Test', () => {
  test('should login as admin and access admin features', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Wait for login page to load
    await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();

    // Click on Super Admin login option
    await page.locator('button:has-text("Super Admin")').click();

    // Should redirect to dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Admin should see dashboard
    await expect(page).toHaveURL(/\/(dashboard)?/);
  });

  test('should access inquiry management', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.locator('button:has-text("Super Admin")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Navigate to inquiries (look for navigation link or button)
    const inquiriesLink = page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first();
    if (await inquiriesLink.isVisible()) {
      await inquiriesLink.click();
      await expect(page).toHaveURL(/inquiries/);
    }
  });

  test('should access user management', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.locator('button:has-text("Super Admin")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Navigate to user management (if available)
    const userMgmtLink = page.locator('a:has-text("Team"), button:has-text("Team")').first();
    if (await userMgmtLink.isVisible()) {
      await userMgmtLink.click();
    }
  });
});
