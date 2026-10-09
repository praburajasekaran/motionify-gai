import { test, expect, type BrowserContext, type APIRequestContext } from '@playwright/test';
import type { ReadinessFixture, ReadinessActorName } from '../scripts/readiness-fixture';

let fixture: ReadinessFixture;
let contexts: Record<ReadinessActorName, BrowserContext>;
async function call(request: APIRequestContext, method: string, endpoint: string, data?: Record<string, unknown>) {
  return request.fetch(`/api/${endpoint}`, { method, data, headers: { 'x-requested-with': 'fetch' } });
}
async function success(request: APIRequestContext, method: string, endpoint: string, data?: Record<string, unknown>) {
  const result = await call(request, method, endpoint, data);
  expect(result.ok(), await result.text()).toBeTruthy();
  return result.json();
}
test.beforeEach(async ({ browser, request }) => {
  fixture = await (await request.post('/__readiness/fixture')).json();
  contexts = {} as Record<ReadinessActorName, BrowserContext>;
  for (const name of Object.keys(fixture.actors) as ReadinessActorName[]) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8901' });
    await context.addCookies([{ name: 'auth_token', value: fixture.actors[name].token,
      domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    contexts[name] = context;
  }
});
test.afterEach(async () => { for (const context of Object.values(contexts)) await context.close(); });

for (const actor of ['primary', 'secondary'] as const) {
  test(`fresh magic-link login restores ${actor} permissions without reload`, async ({ browser, request }) => {
    const loginFixture = await (await request.post('/__readiness/fixture', { data: { magicLinkActor: actor } })).json();
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8901' });
    try {
      const page = await context.newPage();
      const next = `/projects/${loginFixture.projectId}/4`;
      await page.goto(`/portal/login?token=${encodeURIComponent(loginFixture.magicLink.token)}&email=${encodeURIComponent(loginFixture.magicLink.email)}&next=${encodeURIComponent(next)}`);
      await expect(page.getByRole('heading', { name: 'Synthetic delivery project', exact: true })).toBeVisible();
      if (actor === 'primary') {
        await expect(page.getByRole('button', { name: 'Accept Terms & Start Project', exact: true })).toBeVisible();
      } else {
        await expect(page.getByText('Waiting for Primary Contact to accept', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Accept Terms & Start Project', exact: true })).toHaveCount(0);
      }
    } finally {
      await context.close();
    }
  });
}

test('terms summary uses the saved count for populated and empty projects', async () => {
  for (const [actor, projectId, count] of [
    ['primary', fixture.projectId, 1],
    ['unrelated', fixture.otherProjectId, 0],
  ] as const) {
    const detail = await success(contexts[actor].request, 'GET', `projects/${projectId}`);
    expect(detail.deliverables_count).toBe(count);
    const page = await contexts[actor].newPage();
    await page.goto(`/portal/projects/${projectId}`);
    await page.getByRole('button', { name: 'View Summary', exact: true }).click();
    await expect(page.getByText(`Production of ${count} deliverables`, { exact: true })).toBeVisible();
  }
});

for (const [suffix, index, selected] of [
  ['?tab=deliverables', 3, 'Deliverables'],
  ['?tab=files', 4, 'Files'],
  ['?tab=unknown', 1, 'Overview'],
  ['/4?tab=deliverables', 4, 'Files'],
] as const) {
  test(`project query link ${suffix} selects ${selected}`, async () => {
    const page = await contexts.primary.newPage();
    await page.goto(`/portal/projects/${fixture.projectId}${suffix}`);
    await expect(page.getByRole('tab', { name: selected, exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(new RegExp(`/portal/projects/${fixture.projectId}/${index}(?:\\?|$)`));
  });
}

test('signed-out browser returns to login and protected direct requests return no private data', async ({ page, request }) => {
  for (const endpoint of [`projects/${fixture.projectId}`, `deliverable-files?deliverableId=${fixture.deliverableId}`,
    `comments?proposalId=${fixture.proposalId}`, `payments?projectId=${fixture.projectId}`]) {
    const result = await call(request, 'GET', endpoint);
    expect(result.status()).toBe(401);
    expect(await result.text()).not.toContain('Synthetic delivery project');
  }
  await page.goto(`/portal/projects/${fixture.projectId}`);
  await expect(page).toHaveURL(/\/portal\/login/);
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-02.png', fullPage: true });
});

test('primary and unrelated browsers retain only their own project lists and deny forged identifiers', async () => {
  for (const [name, own, forbidden] of [
    ['primary', fixture.projectId, fixture.otherProjectId],
    ['unrelated', fixture.otherProjectId, fixture.projectId],
  ] as const) {
    const context = contexts[name];
    const list = await success(context.request, 'GET', 'projects');
    expect(list.map((row: { id: string }) => row.id)).toEqual([own]);
    const detail = await call(context.request, 'GET', `projects/${forbidden}`);
    expect(detail.status()).toBe(403);
    expect((await detail.json()).name).toBeUndefined();
    const page = await context.newPage();
    await page.goto(`/portal/projects/${own}`);
    await expect(page.getByRole('heading', { name: name === 'primary' ? 'Synthetic delivery project' : 'Unrelated synthetic project', exact: true })).toBeVisible();
    await page.screenshot({ path: `.scratch/production-readiness/evidence/P02/lane-03-${name}.png`, fullPage: true });
  }
});

test('cross-project browser writes leave tasks, deliverables, terms and discussion unchanged', async () => {
  const manager = contexts.manager.request;
  const task = await success(manager, 'POST', 'tasks', { projectId: fixture.projectId, title: 'Allowed shared task', visible_to_client: true });
  const beforeProject = await success(manager, 'GET', `projects/${fixture.projectId}`);
  const beforeTasks = await success(manager, 'GET', `tasks?projectId=${fixture.projectId}`);
  const beforeDeliverable = await success(manager, 'GET', `deliverables?id=${fixture.deliverableId}`);
  for (const [method, endpoint, data] of [
    ['PATCH', `tasks/${task.id}`, { title: 'Forbidden rename' }],
    ['POST', `tasks/${task.id}/comments`, { content: 'Forbidden comment' }],
    ['PATCH', `deliverables/${fixture.deliverableId}`, { name: 'Forbidden deliverable' }],
    ['POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true }],
    ['POST', 'comments', { proposalId: fixture.proposalId, content: 'Forbidden discussion' }],
  ] as const) expect((await call(contexts.unrelated.request, method, endpoint, data)).status()).toBe(403);
  expect(await success(manager, 'GET', `projects/${fixture.projectId}`)).toEqual(beforeProject);
  expect(await success(manager, 'GET', `tasks?projectId=${fixture.projectId}`)).toEqual(beforeTasks);
  expect(await success(manager, 'GET', `deliverables?id=${fixture.deliverableId}`)).toEqual(beforeDeliverable);
  const page = await contexts.unrelated.newPage();
  await page.goto(`/portal/projects/${fixture.otherProjectId}`);
  await expect(page.getByRole('heading', { name: 'Unrelated synthetic project', exact: true })).toBeVisible();
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-04.png', fullPage: true });
});

test('secondary client sees review content while primary contact alone sees and completes approval', async () => {
  const signed = await success(contexts.manager.request, 'POST', 'r2-presign', {
    projectId: fixture.projectId, fileName: 'review.pdf', fileType: 'application/pdf', fileSize: 10, folder: 'beta',
  });
  expect((await contexts.manager.request.put(signed.uploadUrl, { data: Buffer.from('test bytes'), headers: { 'Content-Type': 'application/pdf' } })).status()).toBe(200);
  await success(contexts.manager.request, 'POST', 'deliverable-files', {
    deliverable_id: fixture.deliverableId, file_key: signed.key, file_name: 'review.pdf', file_size: 10, mime_type: 'application/pdf', file_category: 'document',
  });
  await success(contexts.manager.request, 'PATCH', `deliverables/${fixture.deliverableId}`, { status: 'awaiting_approval' });
  const secondary = await contexts.secondary.newPage();
  await secondary.setViewportSize({ width: 390, height: 844 });
  await secondary.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  await expect(secondary.getByRole('heading', { name: 'Readiness video', exact: true })).toBeVisible();
  await secondary.getByRole('button', { name: 'Preview review.pdf', exact: true }).click();
  await expect(secondary.getByRole('button', { name: 'Approve Deliverable', exact: true })).toHaveCount(0);
  expect((await call(contexts.secondary.request, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true })).status()).toBe(403);
  expect((await call(contexts.secondary.request, 'PATCH', `deliverables/${fixture.deliverableId}`, { status: 'approved' })).status()).toBe(403);
  await secondary.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-05-secondary.png', fullPage: true });
  await success(contexts.primary.request, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  const primary = await contexts.primary.newPage();
  await primary.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  await primary.getByRole('button', { name: 'Preview review.pdf', exact: true }).click();
  await expect(primary.getByRole('button', { name: 'Approve Deliverable', exact: true })).toBeVisible();
  await primary.getByRole('button', { name: 'Approve Deliverable', exact: true }).click();
  const approval = primary.waitForResponse(response => response.url().includes(`/deliverables/${fixture.deliverableId}`) && response.request().method() === 'PATCH');
  await primary.getByRole('dialog').getByRole('button', { name: 'Approve Deliverable', exact: true }).click();
  const approved = await (await approval).json();
  expect(approved.approved_by).toBe(fixture.actors.primary.id);
  await primary.reload();
  await expect(primary.getByText('Approved', { exact: true }).first()).toBeVisible();
  await primary.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-05-primary.png', fullPage: true });
});

test('assigned staff uploads beta while unassigned staff retains read access and loses upload controls', async () => {
  const endpoint = `deliverables/${fixture.deliverableId}`;
  await success(contexts.manager.request, 'PATCH', endpoint, { assigned_to: fixture.actors.staff.id });
  const page = await contexts.staff.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  await expect(page.getByRole('heading', { name: 'Readiness video', exact: true })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(1);
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-06-assigned.png', fullPage: true });
  const data = { projectId: fixture.projectId, deliverableId: fixture.deliverableId, fileName: 'staff.pdf', fileType: 'application/pdf', fileSize: 10, folder: 'beta' };
  expect((await call(contexts.staff.request, 'POST', 'r2-presign', data)).status()).toBe(200);
  expect((await call(contexts.staff.request, 'POST', 'r2-presign', { ...data, folder: 'final' })).status()).toBe(403);
  expect((await call(contexts.staff.request, 'PATCH', endpoint, { status: 'awaiting_approval' })).status()).toBe(403);
  await success(contexts.manager.request, 'PATCH', endpoint, { assigned_to: null });
  expect((await call(contexts.staff.request, 'POST', 'r2-presign', data)).status()).toBe(403);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Readiness video', exact: true })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-06-unassigned.png', fullPage: true });
});

test('manager reads the directory while only super admin can edit users', async () => {
  for (const name of Object.keys(contexts) as ReadinessActorName[]) {
    const request = contexts[name].request;
    expect((await call(request, 'GET', 'users-list')).status()).toBe(['manager', 'admin'].includes(name) ? 200 : 403);
    expect((await call(request, 'PATCH', `users-update/${fixture.actors.secondary.id}`, { full_name: 'Readiness secondary edited' })).status()).toBe(name === 'admin' ? 200 : 403);
  }
  const page = await contexts.manager.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}`);
  await expect(page.getByRole('heading', { name: 'Synthetic delivery project', exact: true })).toBeVisible();
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-07.png', fullPage: true });
});

test('membership removal immediately revokes the existing secondary browser session project access', async () => {
  const page = await contexts.secondary.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}`);
  await expect(page.getByRole('heading', { name: 'Synthetic delivery project', exact: true })).toBeVisible();
  await success(contexts.manager.request, 'DELETE', `project-team/${fixture.projectId}/${fixture.actors.secondary.id}`);
  expect((await call(contexts.secondary.request, 'GET', `projects/${fixture.projectId}`)).status()).toBe(403);
  expect(await success(contexts.secondary.request, 'GET', 'projects')).toEqual([]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Synthetic delivery project', exact: true })).toHaveCount(0);
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-08.png', fullPage: true });
});

test('deactivation sends the old staff browser session back to login', async () => {
  const page = await contexts.staff.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}`);
  await expect(page.getByRole('heading', { name: 'Synthetic delivery project', exact: true })).toBeVisible();
  await success(contexts.admin.request, 'DELETE', `users-delete/${fixture.actors.staff.id}`);
  expect((await call(contexts.staff.request, 'GET', `projects/${fixture.projectId}`)).status()).toBe(401);
  await page.reload();
  await expect(page).toHaveURL(/\/portal\/login/);
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-09.png', fullPage: true });
});

test('mismatched upload identities and guessed downloads cannot return signed URLs', async () => {
  const response = await call(contexts.primary.request, 'POST', 'r2-presign', {
    projectId: fixture.otherProjectId, deliverableId: fixture.deliverableId, folder: 'beta', fileName: 'guess.pdf', fileType: 'application/pdf', fileSize: 10,
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).uploadUrl).toBeUndefined();
  const key = `projects/${fixture.otherProjectId}/deliverables/guess.pdf`;
  const download = await call(contexts.primary.request, 'GET', `r2-presign?key=${encodeURIComponent(key)}`);
  expect(download.status()).toBe(403);
  expect((await download.json()).url).toBeUndefined();
  const page = await contexts.primary.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}`);
  await expect(page.getByRole('heading', { name: 'Synthetic delivery project', exact: true })).toBeVisible();
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-10.png', fullPage: true });
});

test('manager approval override displays the authenticated actor after reload', async () => {
  const result = await success(contexts.manager.request, 'PATCH', `deliverables/${fixture.deliverableId}`, {
    status: 'approved', approved_by: fixture.actors.secondary.id,
  });
  expect(result.approved_by).toBe(fixture.actors.manager.id);
  const page = await contexts.primary.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  const history = page.getByRole('heading', { name: 'Review History', exact: true }).locator('..');
  await expect(history.getByText(/^by Readiness manager/)).toBeVisible();
  await page.reload();
  await expect(history.getByText(/^by Readiness manager/)).toBeVisible();
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P02/lane-07-approval-actor.png', fullPage: true });
});
