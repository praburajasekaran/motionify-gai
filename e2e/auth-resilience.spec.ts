import { expect, test } from '@playwright/test';
import { E2E_SUPER_ADMIN, setupApiFallback } from './helpers/auth';

const unavailableMessage = 'Sign-in is temporarily unavailable. Please try again shortly.';
const invalidResponses = [
  { name: 'empty server error', status: 500, contentType: 'text/plain', body: '' },
  { name: 'HTML gateway error', status: 503, contentType: 'text/html', body: '<html>Service unavailable</html>' },
  { name: 'HTML success fallback', status: 200, contentType: 'text/html', body: '<html>App shell</html>' },
  { name: 'malformed JSON', status: 200, contentType: 'application/json', body: '{' },
  { name: 'null JSON', status: 200, contentType: 'application/json', body: 'null' },
  { name: 'missing success flag', status: 200, contentType: 'application/json', body: '{}' },
];

test.beforeEach(async ({ page }) => {
  await setupApiFallback(page);
  await page.route('**/.netlify/functions/auth-me*', route => route.fulfill({ status: 401, json: { success: false } }));
});

for (const { name, ...response } of invalidResponses) {
  test(`login handles ${name} and allows retry`, async ({ page }) => {
    let attempts = 0;
    await page.route('**/.netlify/functions/auth-request-magic-link', route => {
      attempts += 1;
      return route.fulfill(attempts === 1 ? response : { json: { success: true } });
    });
    await page.goto('/portal/login');
    await page.getByRole('textbox', { name: 'Email address' }).fill('client@example.test');
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await expect(page.getByRole('alert')).toHaveText(unavailableMessage);
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveValue('client@example.test');
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
    expect(attempts).toBe(2);
  });

  test(`verification handles ${name} without storing a session`, async ({ page }) => {
    await page.route('**/.netlify/functions/auth-verify-magic-link', route => route.fulfill(response));
    await page.goto('/portal/login?token=test-token');
    await expect(page.getByRole('alert')).toHaveText(unavailableMessage);
    await expect(page.getByRole('button', { name: 'Send magic link' })).toBeEnabled();
    await expect(page).toHaveURL(/\/portal\/login\?token=test-token$/);
    expect(await page.evaluate(() => localStorage.getItem('auth_user'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('auth_expires'))).toBeNull();
  });
}

test('login preserves structured API errors even with a successful HTTP status', async ({ page }) => {
  await page.route('**/.netlify/functions/auth-request-magic-link', route => route.fulfill({
    json: { success: false, error: { code: 'RATE_LIMITED', message: 'Please wait before requesting another link.' } },
  }));
  await page.goto('/portal/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('client@example.test');
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await expect(page.getByRole('alert')).toHaveText('Please wait before requesting another link.');
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toHaveCount(0);
});

test('login handles a network failure and can recover on retry', async ({ page }) => {
  let attempts = 0;
  await page.route('**/.netlify/functions/auth-request-magic-link', route => {
    attempts += 1;
    return attempts === 1 ? route.abort('failed') : route.fulfill({ json: { success: true } });
  });
  await page.goto('/portal/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('client@example.test');
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await expect(page.getByRole('alert')).toHaveText('We could not connect to sign-in. Check your connection and try again.');
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
});

test('verification rejects an incomplete successful response', async ({ page }) => {
  await page.route('**/.netlify/functions/auth-verify-magic-link', route => route.fulfill({ json: { success: true, data: {} } }));
  await page.goto('/portal/login?token=test-token');
  await expect(page.getByRole('alert')).toHaveText(unavailableMessage);
  expect(await page.evaluate(() => localStorage.getItem('auth_user'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('auth_expires'))).toBeNull();
});

test('verification preserves structured expired-link errors', async ({ page }) => {
  await page.route('**/.netlify/functions/auth-verify-magic-link', route => route.fulfill({
    status: 401,
    json: { success: false, error: { code: 'TOKEN_EXPIRED', message: 'This magic link has expired. Please request a new one.' } },
  }));
  await page.goto('/portal/login?token=test-token');
  await expect(page.getByRole('alert')).toHaveText('This magic link has expired. Please request a new one.');
});

test('verification accepts a complete API session and navigates to the workspace', async ({ page }) => {
  await page.route('**/.netlify/functions/auth-verify-magic-link', route => route.fulfill({ json: {
    success: true,
    data: { user: E2E_SUPER_ADMIN, expiresAt: '2099-01-01T00:00:00.000Z' },
    message: 'Login successful',
  } }));
  await page.goto('/portal/login?token=test-token');
  await expect(page).toHaveURL(/\/portal\/?$/);
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('auth_user')!).id)).toBe('e2e-super-admin-001');
  expect(await page.evaluate(() => localStorage.getItem('auth_expires'))).toBe('2099-01-01T00:00:00.000Z');
});
