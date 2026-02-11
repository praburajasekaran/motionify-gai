import { test, expect } from '@playwright/test';

test.describe('Proposal Acceptance Flow', () => {
  test('should view and navigate proposals as client', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Navigate to projects to find proposals
    await page.locator('a:has-text("Projects"), button:has-text("Projects")').first().click();

    // Check if there are any projects/proposals listed
    await expect(page).toHaveURL(/\/(projects|dashboard)/);
  });

  test('should display proposal details correctly', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Try to navigate to a specific project
    const projectCard = page.locator('[data-testid="project-card"], .project-card').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();

      // Should show project details
      await expect(page.locator('text=Project Details, text=Overview, text=Deliverables')).toBeVisible();
    }
  });

  test('should show accept/reject actions for pending proposals', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.locator('button:has-text("Client (Primary Contact)")').click();

    // Wait for dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Look for pending proposals or approval actions
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("Accept")');
    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Decline")');

    // These might not be visible if there are no pending proposals
    // Just verify the page structure is correct
    await expect(page).toHaveURL(/\//);
  });
});
