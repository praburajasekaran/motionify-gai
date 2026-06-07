import { expect, test } from '@playwright/test';

const tawkScriptUrl = 'https://embed.tawk.to/6a24f7a06d77da1c401dea56/1jqg6ejm4';

test.describe('Tawk.to route gating', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://embed.tawk.to/**', (route) => {
      route.abort();
    });
  });

  for (const path of ['/', '/about', '/contact', '/work']) {
    test(`loads chat script on ${path}`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator(`script[src="${tawkScriptUrl}"]`)).toHaveCount(1);
    });
  }

  test('does not duplicate script during marketing navigation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/about');
    await page.goto('/contact');
    await page.goto('/work');

    await expect(page.locator(`script[src="${tawkScriptUrl}"]`)).toHaveCount(1);
  });

  test('hides chat when navigating from marketing to handoff route in one session', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector(`script[src="${tawkScriptUrl}"]`, { state: 'attached' });
    await page.evaluate(() => {
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_API.hideWidget = () => {
        document.body.setAttribute('data-tawk-hidden', 'true');
      };
      window.history.pushState(null, '', '/proposal/example');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page.locator('body')).toHaveAttribute('data-tawk-hidden', 'true');
  });

  for (const path of ['/portal/login', '/proposal/example', '/payment/example', '/verify-inquiry', '/inquiry-status/INQ-TEST']) {
    test(`does not load chat script on ${path}`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator(`script[src="${tawkScriptUrl}"]`)).toHaveCount(0);
    });
  }
});
