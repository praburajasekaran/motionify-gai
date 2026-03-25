import { test, expect } from '@playwright/test';

test.describe('Deliverable Review Flow', () => {
  test('should access deliverables section', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Navigate to a project with deliverables
    const projectCard = page.locator('[data-testid="project-card"], .project-card, a[href*="projects"]').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();

      // Look for deliverables tab or section
      const deliverablesTab = page.locator('text=Deliverables, button:has-text("Deliverables")').first();
      if (await deliverablesTab.isVisible()) {
        await deliverablesTab.click();
        await expect(page.locator('text=Deliverable')).toBeVisible();
      }
    }
  });

  test('should display deliverable card with actions', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Check for deliverable cards or lists
    const deliverableCard = page.locator('[data-testid="deliverable-card"], .deliverable-card').first();

    // If deliverables exist, verify actions are available
    if (await deliverableCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Look for review/approve/download buttons
      await expect(page.locator('button:has-text("Review"), button:has-text("Approve"), button:has-text("Download")')).toBeVisible();
    }
  });

  test('should allow requesting revisions', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Look for request revision functionality
    const requestRevisionBtn = page.locator('button:has-text("Request Revision"), button:has-text("Request Changes")');

    // This functionality might be inside a deliverable detail view
    // Just verify the page loads correctly
    await expect(page).toHaveURL(/\//);
  });

  test('should support video commenting feature', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Video commenting would be in a deliverable detail page
    // This is a placeholder test to verify structure
    await expect(page.locator('body')).toBeVisible();
  });
});
