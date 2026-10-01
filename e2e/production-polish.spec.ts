import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupApiFallback, setupAuthSession } from './helpers/auth';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.route(/youtube|ytimg|embed\.tawk\.to/, route => route.abort());
});

for (const path of ['/', '/work', '/about', '/contact', '/portal/login', '/portal/projects', '/portal/settings', '/portal/admin/inquiries', '/portal/admin/payments', '/portal/admin/users']) {
  for (const theme of ['light', 'dark']) {
    test(`${path} is accessible in ${theme} mode on desktop and mobile`, async ({ page }) => {
      if (path.startsWith('/portal/') && path !== '/portal/login') await setupAuthSession(page);
      else await setupApiFallback(page);
      await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await expect(page.getByRole('heading').first()).toBeVisible();
        await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /light/);
        if (path === '/portal/admin/payments') await expect(page.getByText('No payments found', { exact: true })).toBeVisible();
        if (path === '/portal/admin/users') await expect(page.getByText('No team members yet', { exact: true })).toBeVisible();
        if (path === '/portal/settings') await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('E2E Super Admin');
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(results.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    });
  }
}

test('command menu traps focus, filters, navigates, and restores focus', async ({ page }) => {
  await setupAuthSession(page);
  await page.goto('/portal/projects');
  const trigger = page.getByRole('button', { name: 'Open command menu' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Command menu' });
  await expect(dialog).toBeVisible();
  const search = page.getByRole('combobox', { name: 'Search commands' });
  await expect(search).toBeFocused();
  for (let index = 0; index < 10; index++) await search.press('ArrowDown');
  await expect(dialog.getByRole('option', { name: 'Logout' })).toHaveAttribute('aria-selected', 'true');
  expect(await dialog.getByRole('option', { name: 'Logout' }).evaluate(el => {
    const option = el.getBoundingClientRect();
    const list = el.parentElement!.getBoundingClientRect();
    return option.top >= list.top && option.bottom <= list.bottom;
  })).toBe(true);
  await search.fill('does not exist');
  await expect(dialog.getByRole('status')).toHaveText('No commands found. Try a different search.');
  await search.press('ArrowDown');
  await search.fill('settings');
  await expect(dialog.getByRole('option')).toHaveCount(1);
  await search.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await search.fill('inquiries');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/portal\/admin\/inquiries$/);
});

test('mobile navigation isolates focus and closes after selection or Escape', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setupAuthSession(page);
  await page.goto('/portal/projects');
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await expect(page.getByRole('link', { name: 'Inquiries', exact: true })).toBeHidden();
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Workspace navigation' });
  await expect(drawer).toBeVisible();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await drawer.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole('link', { name: 'Inquiries', exact: true }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/inquiries$/);
  await expect(drawer).toBeHidden();
});

test('client command menu offers client routes without system actions', async ({ page }) => {
  await setupAuthSession(page, { id: 'polish-client', name: 'Client', email: 'client@example.test', role: 'client' });
  await page.goto('/portal/projects');
  await page.getByRole('button', { name: 'Open command menu' }).click();
  const search = page.getByRole('combobox', { name: 'Search commands' });
  await expect(page.getByRole('option', { name: /dashboard|payments|team/i })).toHaveCount(0);
  await search.fill('inquiries');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/portal\/inquiries$/);
});

test('login shows delivery confirmation and allows a different email', async ({ page }) => {
  await setupApiFallback(page);
  await page.route('**/.netlify/functions/auth-request-magic-link', route => route.fulfill({ json: { success: true } }));
  await page.goto('/portal/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('client@example.test');
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('client@example.test');
  await page.getByRole('button', { name: 'Use a different email' }).click();
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeFocused();
});

test('login announces send and verification failures', async ({ page }) => {
  await setupApiFallback(page);
  await page.route('**/.netlify/functions/auth-request-magic-link', route => route.fulfill({ status: 503, json: { success: false, message: 'Please try again shortly.' } }));
  await page.goto('/portal/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('client@example.test');
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send magic link' })).toBeEnabled();
  await page.route('**/.netlify/functions/auth-verify-magic-link*', route => route.fulfill({ status: 401, json: { success: false, message: 'This link has expired.' } }));
  await page.goto('/portal/login?token=expired');
  await expect(page.getByRole('alert')).toContainText('expired');
});

test('settings load failure has a persistent retry action', async ({ page }) => {
  await setupAuthSession(page);
  let attempts = 0;
  await page.route('**/.netlify/functions/users-settings', route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } })
      : route.fulfill({ json: { account: { name: 'Taylor', email: 'taylor@example.test', role: 'super_admin', organizationName: 'Motionify', timezone: null } } });
  });
  await page.goto('/portal/settings');
  await expect(page.getByRole('alert')).toContainText('Account settings are unavailable');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Taylor');
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('taylor@example.test');
  expect(attempts).toBe(2);
});

test('the team invitation dialog traps focus, labels fields, and closes with Escape', async ({ page }) => {
  await setupAuthSession(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/portal/admin/users');
  const trigger = page.getByRole('button', { name: 'Add User', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Add New User' });
  await expect(dialog.getByRole('textbox', { name: 'Email Address' })).toBeFocused();
  await expect(dialog.getByRole('textbox', { name: 'Full Name' })).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Role' })).toBeVisible();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the deactivation dialog restores focus without changing the user', async ({ page }) => {
  await setupAuthSession(page);
  await page.route('**/.netlify/functions/users-list*', route => route.fulfill({ json: { success: true, users: [
    { id: 'polish-user', full_name: 'Taylor', email: 'taylor@example.test', role: 'client', is_active: true, created_at: '2026-09-29T10:00:00Z' },
  ] } }));
  let mutations = 0;
  page.on('request', request => { if (request.method() !== 'GET') mutations += 1; });
  await page.goto('/portal/admin/users');
  const trigger = page.getByRole('button', { name: 'Deactivate', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Deactivate User' });
  await expect(dialog.getByRole('textbox', { name: 'Reason for deactivation' })).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Deactivate User', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  expect(mutations).toBe(0);
});

test('a repeated chunk failure reaches recovery instead of a reload loop', async ({ page }) => {
  await setupApiFallback(page);
  await page.addInitScript(() => sessionStorage.setItem('motionify:stale-chunk-reload-at', String(Date.now())));
  await page.route('**/assets/Login-*.js', route => route.abort());
  await page.goto('/portal/login');
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
  await page.getByRole('button', { name: 'Go home' }).click();
  await expect(page).toHaveURL(/\/portal$/);
});

test('blocked session storage leaves chunk recovery available', async ({ page }) => {
  await setupApiFallback(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
  });
  await page.route('**/assets/Login-*.js', route => route.abort());
  await page.goto('/portal/login');
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
});

test('unknown portal links show a useful missing-page screen and no development tools', async ({ page }) => {
  await setupAuthSession(page);
  await page.goto('/portal/test/permissions');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Permission System Test' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to workspace' }).click();
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('a stale route chunk reloads once and recovers', async ({ page }) => {
  await setupApiFallback(page);
  let requests = 0;
  await page.route('**/assets/Login-*.js', route => {
    requests += 1;
    return requests === 1 ? route.abort() : route.continue();
  });
  await page.goto('/portal/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(requests).toBe(2);
  expect(await page.evaluate(() => Number(sessionStorage.getItem('motionify:stale-chunk-reload-at')))).toBeGreaterThan(0);
});

for (const policy of [
  { path: '/terms', title: 'Terms and Conditions', link: 'Terms and Conditions', text: '50% advance payment is mandatory' },
  { path: '/privacy', title: 'Privacy Policy', link: 'Privacy Policy', text: 'We do not sell or rent your data' },
  { path: '/shipping', title: 'Shipping / Delivery Policy', link: 'Shipping Policy', text: 'there is no physical shipping' },
  { path: '/cancellation-refund', title: 'Cancellation & Refund Policy', link: 'Cancellation & Refunds', text: 'Approved refunds are processed within 7–10 business days' },
]) {
  test(`${policy.path} restores its policy content and footer navigation`, async ({ page }) => {
    await setupApiFallback(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/work');
    await page.locator('footer').getByRole('link', { name: policy.link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${policy.path}$`));
    await page.reload();
    await expect(page.getByRole('heading', { name: policy.title, exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText(policy.text);
    await expect(page).toHaveTitle(`${policy.title} - Motionify Studio`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
    await page.getByRole('link', { name: 'Back to Home', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });
}

test('review history renders feedback with timestamped comments from the API', async ({ page }) => {
  await setupAuthSession(page);
  await page.route('**/.netlify/functions/projects/polish-project', route => route.fulfill({ json: {
    id: 'polish-project', name: 'Brand Film', status: 'in_progress',
    team: [], total_revisions_allowed: 3, revisions_used: 1,
  } }));
  await page.route('**/api/deliverables?projectId=polish-project', route => route.fulfill({ json: [{
    id: 'polish-deliverable', project_id: 'polish-project', name: 'Film review',
    status: 'revision_requested', dominant_file_category: 'video',
    approval_history: [{
      id: 'review-1', deliverableId: 'polish-deliverable', action: 'rejected',
      timestamp: '2026-09-29T10:00:00Z', userId: 'reviewer', userName: 'Taylor', userEmail: 'taylor@example.test',
      feedback: 'Please slow down the closing scene.', issueCategories: ['timing'],
      timestampedComments: [{ id: 'comment-1', timestamp: 92, comment: 'Hold this frame longer.', resolved: false,
        userId: 'reviewer', userName: 'Taylor', createdAt: '2026-09-29T10:00:00Z' }],
      attachments: [{ id: 'attachment-1', fileName: 'reference.png', fileSize: 1048576, fileType: 'image/png', url: '/reference.png' }],
    }],
  }] }));
  await page.route('**/api/deliverable-files*', route => route.fulfill({ json: [] }));
  await page.goto('/portal/projects/polish-project/deliverables/polish-deliverable');
  await expect(page.getByRole('heading', { name: 'Film review', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review History' })).toBeVisible();
  await expect(page.getByText('Please slow down the closing scene.', { exact: true })).toBeVisible();
  await expect(page.getByText('Hold this frame longer.', { exact: true })).toBeVisible();
  await expect(page.getByText('1:32', { exact: true })).toBeVisible();
  await expect(page.getByText('Timing/Pacing', { exact: true })).toBeVisible();
  await expect(page.getByText('reference.png', { exact: true })).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('theme', theme), theme);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Review History' })).toBeVisible();
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /light/);
    const results = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
  }
});
