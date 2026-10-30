import { expect, test } from '@playwright/test';
import { setupAuthSession } from './helpers/auth';

for (const role of ['super_admin', 'support', 'client', 'team_member'] as const) {
  test(`${role} reuses the project list prefetched from navigation`, async ({ page }) => {
    const userId = `${role}-test`;
    await setupAuthSession(page, { id: userId, name: 'Test user', email: 'user@example.test', role });
    const requests: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/.netlify/functions/projects*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/.netlify/functions/projects') return route.continue();
      requests.push(url.searchParams.get('userId') ?? 'all');
      await gate;
      await route.fulfill({ json: [{ id: 'project-1', name: 'Visible project', status: 'in_progress' }] });
    });
    await page.goto('/portal');
    const link = page.getByRole('link', { name: 'Projects', exact: true });
    await link.focus();
    await expect.poll(() => requests.length).toBe(1);
    await link.click();
    release();
    await expect(page.getByText('Visible project').first()).toBeVisible();
    expect(requests).toEqual([role === 'super_admin' || role === 'support' ? 'all' : userId]);
  });
}

for (const role of ['client', 'super_admin'] as const) {
  test(`${role} shares one inquiry request between the list and summary`, async ({ page }) => {
    await setupAuthSession(page, { id: `${role}-test`, name: 'Test user', email: 'user@example.test', role });
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/.netlify/functions/inquiries*', async route => {
      calls++;
      await gate;
      await route.fulfill({ json: [{ id: 'inq-1', inquiry_number: 'INQ-1', status: 'new',
        contact_name: 'Test client', contact_email: 'client@example.test',
        recommended_video_type: 'Video', created_at: '2026-10-01T10:00:00Z' }] });
    });
    await page.goto(role === 'client' ? '/portal/inquiries' : '/portal/admin/inquiries');
    await expect(page.getByText('Loading inquiries...')).toBeVisible();
    await expect(page.getByLabel('Count unavailable')).toHaveCount(4);
    release();
    await expect(page.getByText('INQ-1')).toBeVisible();
    await expect(page.getByText('Showing 1 of 1 inquiries')).toBeVisible();
    await expect(page.getByLabel('Count unavailable')).toHaveCount(0);
    expect(calls).toBe(1);
  });
}

test('a failed inquiry request does not show an empty list', async ({ page }) => {
  await setupAuthSession(page);
  let calls = 0;
  await page.route('**/.netlify/functions/inquiries*', route => {
    calls++;
    return calls === 1 ? route.fulfill({ status: 503 }) : route.fulfill({ json: [] });
  });
  await page.goto('/portal/admin/inquiries');
  await expect(page.getByText('Failed to load inquiries. Please try again.')).toBeVisible();
  await expect(page.getByText('No inquiries found')).toHaveCount(0);
  await page.getByRole('button', { name: /try again/i }).click();
  await expect(page.getByText('No inquiries found')).toBeVisible();
});

test('a denied refresh hides inquiry data that was previously visible', async ({ page }) => {
  await setupAuthSession(page, { id: 'client-test', name: 'Client', email: 'client@example.test', role: 'client' });
  let denied = false;
  await page.route('**/.netlify/functions/inquiries*', route => denied
    ? route.fulfill({ status: 403 })
    : route.fulfill({ json: [{ id: 'inq-1', inquiry_number: 'INQ-PRIVATE', status: 'new',
        contact_name: 'Client', contact_email: 'client@example.test',
        recommended_video_type: 'Video', created_at: '2026-10-01T10:00:00Z' }] }));
  await page.goto('/portal/inquiries');
  await expect(page.getByText('INQ-PRIVATE')).toBeVisible();
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  denied = true;
  await page.getByRole('link', { name: 'Inquiries', exact: true }).click();
  await expect(page.getByText('Failed to load inquiries. Please try again.')).toBeVisible();
  await expect(page.getByText('INQ-PRIVATE')).toHaveCount(0);
});

test('project counts remain unavailable until the request succeeds or fails', async ({ page }) => {
  await setupAuthSession(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/.netlify/functions/projects', async route => {
    await gate;
    await route.fulfill({ status: 503 });
  });
  await page.goto('/portal/projects');
  await expect(page.getByText('Loading projects...', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Count unavailable')).toHaveCount(4);
  release();
  await expect(page.getByText('Projects unavailable')).toBeVisible();
  await expect(page.getByLabel('Count unavailable')).toHaveCount(4);
});

test('an expired inquiry session returns the user to sign-in', async ({ page }) => {
  await setupAuthSession(page);
  await page.route('**/.netlify/functions/inquiries*', route => route.fulfill({ status: 401 }));
  await page.goto('/portal/admin/inquiries');
  await expect(page).toHaveURL(/\/portal\/login\?session=expired/);
  expect(await page.evaluate(() => localStorage.getItem('auth_user'))).toBeNull();
});

test('focusing a project link prefetches its detail', async ({ page }) => {
  await setupAuthSession(page);
  await page.route('**/.netlify/functions/projects', route => route.fulfill({ json: [{
    id: 'prefetch-project', name: 'Prefetch project', status: 'in_progress',
  }] }));
  let detailCalls = 0;
  await page.route('**/.netlify/functions/projects/prefetch-project', route => {
    detailCalls++;
    return route.fulfill({ json: { id: 'prefetch-project', name: 'Prefetch project', status: 'in_progress', team: [] } });
  });
  await page.goto('/portal/projects');
  await page.getByRole('link', { name: /Prefetch project/ }).focus();
  await expect.poll(() => detailCalls).toBe(1);
});
