import { expect, test } from '@playwright/test';

const youtubeEmbedPattern = /youtube(?:-nocookie)?\.com\/embed\//;

test.describe('Public Work page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/youtube(?:-nocookie)?\.com|i\.ytimg\.com|embed\.tawk\.to/, (route) => {
      route.abort();
    });
  });

  test('renders portfolio videos and approach without pricing', async ({ page }) => {
    await page.goto('/work');

    await expect(page.getByRole('heading', { name: /visual stories built/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /a clear path from brief/i })).toBeVisible();
    await expect(page.locator('section:first-of-type article')).toHaveCount(29);
    await expect(page.getByText(/pricing/i)).toHaveCount(0);
    await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(0);

    await page.getByRole('button', { name: /play mastering the art of visual storytelling/i }).click();
    await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]').first()).toHaveAttribute('src', youtubeEmbedPattern);
  });

  test('does not overflow on narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/work');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('header shows login link in a new tab when signed out and footer uses header logo', async ({ page }) => {
    await page.goto('/work');

    const desktopLogin = page.getByRole('link', { name: 'Login' }).first();

    await expect(desktopLogin).toHaveAttribute('target', '_blank');
    await expect(desktopLogin).toHaveAttribute('rel', /noopener/);
    await expect(desktopLogin).toHaveAttribute('rel', /noreferrer/);
    await expect(page.getByRole('link', { name: 'Portal' })).toHaveCount(0);

    await expect(page.locator('footer img[alt="Motionify Studio"]')).toHaveAttribute(
      'src',
      '/images/motionify-studio-web.png',
    );
  });

  test('header shows portal link in a new tab when signed in', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'client',
          avatar: '',
          projectTeamMemberships: {},
        }),
      );
      localStorage.setItem('auth_expires', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    });

    await page.goto('/work');

    const desktopPortal = page.getByRole('link', { name: 'Portal' }).first();

    await expect(desktopPortal).toHaveAttribute('target', '_blank');
    await expect(desktopPortal).toHaveAttribute('rel', /noopener/);
    await expect(desktopPortal).toHaveAttribute('rel', /noreferrer/);
    await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0);
  });
});

test.describe('Landing process video', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/youtube(?:-nocookie)?\.com|i\.ytimg\.com|embed\.tawk\.to/, (route) => {
      route.abort();
    });
  });

  test('adds the Motionify process video to From Idea to Impact', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'From Idea to Impact' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'See the Motionify process' })).toBeVisible();
    await expect(page.locator('iframe[src*="Lvv_T_8fNjI"]')).toHaveCount(0);

    await page.getByRole('button', { name: /play motionify studio process video/i }).click();
    await expect(page.locator('iframe[src*="Lvv_T_8fNjI"]')).toBeVisible();
  });

  test('places the process video beside the steps on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    const videoCard = page
      .getByRole('heading', { name: 'See the Motionify process' })
      .locator('xpath=ancestor::div[contains(@class, "ring-1")][1]');
    const firstStep = page
      .getByRole('heading', { name: 'Choose & Customize' })
      .locator('xpath=ancestor::div[contains(@class, "ring-1")][1]');
    const videoBox = await videoCard.boundingBox();
    const stepBox = await firstStep.boundingBox();

    expect(videoBox).not.toBeNull();
    expect(stepBox).not.toBeNull();
    expect(videoBox!.x).toBeLessThan(stepBox!.x);
    expect(Math.abs(videoBox!.y - stepBox!.y)).toBeLessThan(80);
  });
});
