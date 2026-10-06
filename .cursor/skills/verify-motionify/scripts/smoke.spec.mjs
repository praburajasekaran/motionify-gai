import { test as base, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const test = base.extend({
  proof: async ({ page, context }, use, testInfo) => {
    const actions = [];
    const network = [];
    const errors = [];
    const origin = new URL(process.env.VERIFY_URL).origin;
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const allowed = url.origin === origin && request.method() === 'GET'
        && !url.pathname.startsWith('/.netlify/functions') && !url.pathname.startsWith('/api/');
      network.push({ method: request.method(), url: request.url(), decision: allowed ? 'continue' : 'abort' });
      if (allowed) await route.continue();
      else await route.abort();
    });
    context.on('response', (response) => network.push({ url: response.url(), status: response.status() }));
    page.on('pageerror', (error) => errors.push(error.message));
    const proof = {
      async action(label, execute) {
        actions.push({ label, startedAt: new Date().toISOString() });
        await test.step(label, execute);
        actions.at(-1).completedAt = new Date().toISOString();
      },
      async capture(name, locator = page.locator('body')) {
        await locator.screenshot({ path: testInfo.outputPath(`${name}.png`), animations: 'disabled' });
        writeFileSync(testInfo.outputPath(`${name}.aria.txt`), await locator.ariaSnapshot());
      },
    };
    try {
      await use(proof);
      expect(errors, 'uncaught browser errors').toEqual([]);
    } finally {
      writeFileSync(testInfo.outputPath('actions.json'), JSON.stringify(actions, null, 2));
      writeFileSync(testInfo.outputPath('network.json'), JSON.stringify(network, null, 2));
      writeFileSync(testInfo.outputPath('page-errors.json'), JSON.stringify(errors, null, 2));
    }
  },
});

test('work', async ({ page, proof }) => {
  await proof.action('Open home and choose header Work', async () => {
    await page.goto('/');
    await proof.capture('home-before');
    await page.locator('header').getByRole('link', { name: 'Work', exact: true }).click();
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.getByRole('heading', { name: /Visual stories built/ })).toBeVisible();
    await expect(page.locator('section:first-of-type article')).toHaveCount(29);
    await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(0);
  });
  await proof.action('Play Mastering the Art of Visual Storytelling', async () => {
    const play = page.getByRole('button', { name: /Play Mastering the Art of Visual Storytelling/i });
    await play.scrollIntoViewIfNeeded();
    await proof.capture('video-before', play.locator('..'));
    await play.click();
    await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(1);
    await proof.capture('video-after', page.locator('section:first-of-type article').first());
  });
  await proof.action('Choose the footer Works entry point', async () => {
    await page.goto('/contact');
    await page.locator('footer').getByRole('link', { name: 'Works', exact: true }).click();
    await expect(page).toHaveURL(/\/work$/);
  });
  await proof.action('Choose Work from the mobile menu and check width', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.locator('header').getByRole('link', { name: 'Work', exact: true }).click();
    await expect(page).toHaveURL(/\/work$/);
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
    await proof.capture('mobile-work-after');
  });
});

test('quiz', async ({ page, proof }) => {
  const quiz = page.locator('#video-style-quiz');
  await proof.action('Choose Find Your Video Style from home', async () => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Find Your Video Style', exact: true }).click();
    await expect(page).toHaveURL(/#video-style-quiz$/);
    await proof.capture('quiz-before', quiz);
    await quiz.getByRole('button', { name: 'Get Started', exact: true }).click();
    await expect(quiz.getByRole('heading', { name: "What's your niche?", exact: true })).toBeVisible();
  });
  await proof.action('Choose Tech, go Back, and confirm the selected answer', async () => {
    await quiz.getByRole('button', { name: 'Tech', exact: true }).click();
    await quiz.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(quiz.getByRole('button', { name: 'Tech', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await proof.capture('back-retains-answer', quiz);
    await quiz.getByRole('button', { name: 'Tech', exact: true }).click();
  });
  for (const answer of ['Businesses', 'Mixed Media', 'Bold', 'Explainer (1–2 min)']) {
    await proof.action(`Choose ${answer}`, async () => quiz.getByRole('button', { name: answer, exact: true }).click());
  }
  await expect(quiz.getByRole('heading', { name: 'Mixed Media Explainer', exact: true })).toBeVisible();
  await expect(quiz.getByRole('heading', { name: 'Mixed Media Explainer', exact: true }).locator('../..')).toHaveCSS('opacity', '1');
  await proof.capture('recommendation-after', quiz);
  await proof.action('Start This Project and validate missing project details', async () => {
    await quiz.getByRole('button', { name: 'Start This Project', exact: true }).click();
    await expect(quiz.getByRole('heading', { name: 'Almost There!', exact: true })).toBeVisible();
    await quiz.getByLabel('Full Name', { exact: false }).fill('Verification Runner');
    await quiz.getByLabel('Email Address', { exact: false }).fill('verification@example.test');
    const requests = [];
    page.on('request', (request) => { if (request.method() !== 'GET') requests.push(request.url()); });
    await quiz.getByRole('button', { name: 'Send Me a Proposal', exact: true }).click();
    await expect(quiz.getByText('Project details are required', { exact: true })).toBeVisible();
    expect(requests, 'invalid form must not submit a network mutation').toEqual([]);
    await proof.capture('validation-after', quiz);
  });
  await proof.action('Go Back and Retake Quiz', async () => {
    await quiz.getByRole('button', { name: 'Back', exact: true }).click();
    await quiz.getByRole('button', { name: 'Retake Quiz', exact: true }).click();
    await expect(quiz.getByRole('heading', { name: 'Create Your Perfect Video', exact: true })).toBeVisible();
    await proof.capture('reset-after', quiz);
  });
});

test('portal-entry', async ({ page, context, proof }) => {
  await proof.action('Choose Login from the public header', async () => {
    await page.goto('/work');
    const login = page.locator('header').getByRole('link', { name: 'Login', exact: true });
    await expect(login).toHaveAttribute('target', '_blank');
    await expect(login).toHaveAttribute('rel', /noopener/);
    const popupPromise = context.waitForEvent('page');
    await login.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/\/portal\/login$/);
    await expect(popup.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    await popup.screenshot({ path: test.info().outputPath('login-popup-after.png') });
    await popup.close();
  });
  await proof.action('Open protected projects while signed out', async () => {
    await page.goto('/portal/projects');
    await expect(page).toHaveURL(/\/portal\/login\?next=%2Fprojects$/);
    await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send magic link', exact: true })).toBeVisible();
    await proof.capture('protected-redirect-after');
  });
  await proof.action('Follow the legacy login alias', async () => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/portal\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    await proof.capture('login-alias-after');
  });
});
