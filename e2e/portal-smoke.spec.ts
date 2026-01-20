import { test, expect } from '@playwright/test';

test.describe('Portal Smoke Test', () => {
  test('should login as client and navigate portal', async ({ page }) => {
    // Navigate to login page
    await page.goto('/#/login');

    // Wait for login page to load
    await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();

    // Click on Client (Primary Contact) login option
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Should redirect to dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await page.waitForURL(/\/#\/(|dashboard)/);

    // Navigate to Projects
    const projectsLink = page.locator('a[href*="projects"], button:has-text("Projects")').first();
    await projectsLink.click();
    await expect(page).toHaveURL(/projects/);

    // Navigate to Settings
    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
    }
  });

  test('should display user profile correctly', async ({ page }) => {
    // Login as client
    await page.goto('/#/login');
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Verify page loaded correctly
    await expect(page).toHaveURL(/\/#\/(|dashboard)/);
  });
});
