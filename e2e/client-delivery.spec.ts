import { test, expect, type Browser, type BrowserContext, type APIRequestContext, type Page, type Locator } from '@playwright/test';
import type { ReadinessFixture, ReadinessActorName } from '../scripts/readiness-fixture';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

async function actorContext(browser: Browser, fixture: ReadinessFixture, actor: ReadinessActorName, videoDir?: string) {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8901',
    ...(videoDir ? { recordVideo: { dir: videoDir, size: { width: 960, height: 720 } } } : {}) });
  await context.addCookies([{ name: 'auth_token', value: fixture.actors[actor].token,
    domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  return context;
}

async function keyboardActivate(page: Page, button: Locator) {
  for (let step = 0; step < 60; step++) {
    await page.keyboard.press('Tab');
    if (await button.evaluate(element => document.activeElement === element)) break;
  }
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
}

async function api(request: APIRequestContext, method: string, endpoint: string, data?: Record<string, unknown>) {
  const response = await request.fetch(`/api/${endpoint}`, { method, data, headers: { 'x-requested-with': 'fetch' } });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

let fixture: ReadinessFixture;
let primary: BrowserContext;
let manager: BrowserContext;
test.beforeEach(async ({ browser, request }, testInfo) => {
  fixture = await (await request.post('/__readiness/fixture', { data: { fullyPaid: true } })).json();
  primary = await actorContext(browser, fixture, 'primary', testInfo.outputPath('videos'));
  manager = await actorContext(browser, fixture, 'manager', testInfo.outputPath('videos'));
});

test('released final file downloads through the signed review action', async () => {
  const content = await readFile('e2e/fixtures/readiness.mp4');
  const signed = await api(manager.request, 'POST', 'r2-presign', {
    fileName: 'readiness-final.mp4', fileType: 'video/mp4', fileSize: content.length,
    projectId: fixture.projectId, folder: 'final',
  });
  const uploaded = await manager.request.put(signed.uploadUrl, { data: content, headers: { 'Content-Type': 'video/mp4' } });
  expect(uploaded.status()).toBe(200);
  await api(manager.request, 'POST', 'deliverable-files', {
    deliverable_id: fixture.deliverableId, file_key: signed.key, file_name: 'readiness-final.mp4',
    file_size: content.length, mime_type: 'video/mp4', file_category: 'video', is_final: true,
  });
  await api(manager.request, 'PATCH', `deliverables/${fixture.deliverableId}`, { status: 'final_delivered' });
  const page = await primary.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  await expect(page.getByRole('heading', { name: 'readiness-final.mp4', exact: true }).locator('..').getByText('Now Playing', { exact: true })).toBeVisible();
  const signing = page.waitForResponse(response => response.url().includes('/r2-presign?'));
  await page.getByRole('button', { name: 'Download Final File', exact: true }).click();
  const downloadUrl = await signing;
  expect(downloadUrl.status()).toBe(200);
  const download = await primary.request.get((await downloadUrl.json()).url);
  expect(await download.body()).toEqual(content);
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P01/lane-09.png', fullPage: true });
});
test.afterEach(async () => { await primary.close(); await manager.close(); });

test('primary accepts synthetic terms and a new session reads the persisted acceptance', async ({ browser }) => {
  const page = await primary.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}`);
  await expect(page.getByRole('heading', { name: 'Synthetic delivery project', exact: true })).toBeVisible();
  const acceptance = page.waitForResponse(response => response.url().includes('/projects-accept-terms') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Accept Terms & Start Project', exact: true }).click();
  expect((await acceptance).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Accept Terms & Start Project', exact: true })).toHaveCount(0);
  const persisted = await api(primary.request, 'GET', `projects/${fixture.projectId}`);
  expect(persisted.terms_accepted_by).toBe(fixture.actors.primary.id);
  expect(persisted.terms_accepted_at).toBeTruthy();
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P01/lane-02.png', fullPage: true });
  const reconnected = await actorContext(browser, fixture, 'primary');
  try {
    const freshPage = await reconnected.newPage();
    await freshPage.goto(`/portal/projects/${fixture.projectId}`);
    await expect(freshPage.getByRole('heading', { name: 'Synthetic delivery project', exact: true })).toBeVisible();
    await expect(freshPage.getByRole('button', { name: 'Accept Terms & Start Project', exact: true })).toHaveCount(0);
  } finally { await reconnected.close(); }
});

test('manager uploads a file and client downloads its exact bytes from the review page', async () => {
  const page = await manager.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  await expect(page.getByRole('heading', { name: 'Readiness video', exact: true })).toBeVisible();
  const content = Buffer.alloc(1024 * 1024, 0x52);
  const metadataSaved = page.waitForResponse(response => response.url().includes('/api/deliverable-files') && response.request().method() === 'POST');
  await page.locator('input[type="file"]').setInputFiles({ name: 'browser-beta.pdf', mimeType: 'application/pdf', buffer: content });
  expect((await metadataSaved).status()).toBe(201);
  await expect(page.getByText('browser-beta.pdf', { exact: true })).toBeVisible();
  const files = await api(manager.request, 'GET', `deliverable-files?deliverableId=${fixture.deliverableId}`);
  const uploaded = files.find((file: { file_name: string }) => file.file_name === 'browser-beta.pdf');
  expect(uploaded.file_size).toBe(String(content.length));
  await page.getByRole('button', { name: 'Send for Client Review', exact: true }).click();
  const sent = page.waitForResponse(response => response.url().includes(`/api/deliverables/${fixture.deliverableId}`) && response.request().method() === 'PATCH');
  await page.getByRole('dialog').getByRole('button', { name: 'Send for Review', exact: true }).click();
  expect((await sent).status()).toBe(200);
  const clientPage = await primary.newPage();
  await clientPage.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  await expect(clientPage.getByText('browser-beta.pdf', { exact: true })).toBeVisible();
  const signing = clientPage.waitForResponse(response => response.url().includes('/r2-presign?'));
  await clientPage.getByRole('button', { name: 'Download browser-beta.pdf', exact: true }).click();
  const signed = await signing;
  expect(signed.status(), await signed.text()).toBe(200);
  const download = await primary.request.get((await signed.json()).url);
  expect(download.status()).toBe(200);
  expect(await download.body()).toEqual(content);
  await clientPage.reload();
  await expect(clientPage.getByText('browser-beta.pdf', { exact: true })).toBeVisible();
  await clientPage.screenshot({ path: '.scratch/production-readiness/evidence/P01/lane-04.png', fullPage: true });
});

test('real R2 validates signed requests and browser CORS', async () => {
  test.skip(!process.env.READINESS_R2_ENV_FILE, 'Requires the explicitly configured private test bucket');
  const page = await manager.newPage();
  await page.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  await expect(page.getByRole('heading', { name: 'Readiness video', exact: true })).toBeVisible();
  const content = Buffer.alloc(1024 * 1024, 0x52);
  const saved = page.waitForResponse(response => response.url().includes('/api/deliverable-files') && response.request().method() === 'POST');
  await page.locator('input[type="file"]').setInputFiles({ name: 'provider-cors.pdf', mimeType: 'application/pdf', buffer: content });
  expect((await saved).status()).toBe(201);
  await expect(page.getByText('provider-cors.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send for Client Review', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const sentForReview = page.waitForResponse(response => response.url().includes(`/api/deliverables/${fixture.deliverableId}`) && response.request().method() === 'PATCH');
  await page.getByRole('dialog').getByRole('button', { name: 'Send for Review', exact: true }).click();
  expect((await sentForReview).status()).toBe(200);
  const files = await api(manager.request, 'GET', `deliverable-files?deliverableId=${fixture.deliverableId}`);
  const file = files.find((item: { file_name: string }) => item.file_name === 'provider-cors.pdf');
  expect(file.file_size).toBe(String(content.length));
  const signed = await api(primary.request, 'GET', `r2-presign?key=${encodeURIComponent(file.file_key)}`);
  const url = new URL(signed.url);
  expect(url.hostname).toBe('f9e4805d0c08325a957feeedaeeae22a.r2.cloudflarestorage.com');
  expect(url.pathname).toContain('/motionify-readiness-test/');
  const clientPage = await primary.newPage();
  await clientPage.goto(`/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`);
  const download = await clientPage.evaluate(async downloadUrl => {
    const response = await fetch(downloadUrl);
    const bytes = await response.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return { status: response.status, size: bytes.byteLength,
      sha256: Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('') };
  }, signed.url);
  expect(download.status).toBe(200);
  expect(download.size).toBe(content.length);
  expect(download.sha256).toBe(createHash('sha256').update(content).digest('hex'));
  const signature = url.searchParams.get('X-Amz-Signature');
  expect(signature).toMatch(/^[a-f0-9]{64}$/);
  url.searchParams.set('X-Amz-Signature', `${signature![0] === '0' ? '1' : '0'}${signature!.slice(1)}`);
  const tampered = await primary.request.get(url.toString());
  expect(tampered.status()).toBe(403);
  const unsigned = await primary.request.get(`${url.origin}${url.pathname}`);
  expect(unsigned.status()).toBe(400);
  expect(await unsigned.text()).toContain('<Code>InvalidArgument</Code><Message>Authorization</Message>');
  const deniedOrigin = await primary.request.fetch(signed.url, { method: 'OPTIONS', headers: {
    Origin: 'http://127.0.0.1:9999', 'Access-Control-Request-Method': 'GET',
  } });
  expect(deniedOrigin.headers()['access-control-allow-origin']).toBeUndefined();
  await clientPage.getByText('provider-cors.pdf', { exact: true }).scrollIntoViewIfNeeded();
  await clientPage.screenshot({ path: '.scratch/production-readiness/evidence/P01/r2-browser.png', fullPage: true });
  await writeFile('.scratch/production-readiness/evidence/P01/real-storage.json', JSON.stringify({
    environment: 'real private Cloudflare R2 test bucket and disposable loopback PostgreSQL',
    origin: 'http://127.0.0.1:8901', bucket: 'motionify-readiness-test',
    browserPut: 'PASS', browserGet: download, invalidSignatureStatus: tampered.status(),
    unsignedStatus: unsigned.status(), unsignedErrorCode: 'InvalidArgument',
    disallowedOriginCorsHeader: 'absent', verdict: 'PASS',
  }, null, 2));
});

test('manager assigns a deliverable and assigned staff uploads an exact 1 MiB beta file', async ({ browser }, testInfo) => {
  const path = `/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`;
  const managerPage = await manager.newPage();
  const staff = await actorContext(browser, fixture, 'staff');
  try {
    const staffPage = await staff.newPage();
    await staffPage.goto(path);
    await expect(staffPage.getByRole('heading', { name: 'Readiness video', exact: true })).toBeVisible();
    await expect(staffPage.locator('input[type="file"]')).toHaveCount(0);
    await managerPage.goto(path);
    const assignment = managerPage.waitForResponse(response => response.url().includes(`/api/deliverables/${fixture.deliverableId}`) && response.request().method() === 'PATCH');
    await managerPage.getByLabel('Assigned staff', { exact: true }).selectOption(fixture.actors.staff.id);
    expect((await assignment).status()).toBe(200);
    await managerPage.reload();
    await expect(managerPage.getByLabel('Assigned staff', { exact: true })).toHaveValue(fixture.actors.staff.id);
    await staffPage.reload();
    const content = Buffer.alloc(1024 * 1024, 0x53);
    const saved = staffPage.waitForResponse(response => response.url().includes('/api/deliverable-files') && response.request().method() === 'POST');
    await staffPage.locator('input[type="file"]').setInputFiles({ name: 'staff-beta.pdf', mimeType: 'application/pdf', buffer: content });
    const metadata = await saved;
    expect(metadata.status()).toBe(201);
    const file = await metadata.json();
    expect(file.uploaded_by).toBe(fixture.actors.staff.id);
    expect(file.file_size).toBe(String(content.length));
    await expect(staffPage.getByText('staff-beta.pdf', { exact: true })).toBeVisible();
    await expect(staffPage.getByText('BETA READY', { exact: true })).toBeVisible();
    await staffPage.reload();
    await expect(staffPage.getByText('staff-beta.pdf', { exact: true })).toBeVisible();
    const signed = await api(staff.request, 'GET', `r2-presign?key=${encodeURIComponent(file.file_key)}`);
    expect(await (await staff.request.get(signed.url)).body()).toEqual(content);
    await staffPage.screenshot({ path: '.scratch/production-readiness/evidence/P01/lane-04-staff.png', fullPage: true });
  } finally { await staff.close(); }
});

test('manager creates an assigned client-visible task and staff updates its persisted status', async ({ browser }, testInfo) => {
  await api(primary.request, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  const page = await manager.newPage();
  const tasksPath = `/portal/projects/${fixture.projectId}/2`;
  await page.goto(tasksPath);
  await page.getByRole('button', { name: 'Add Task', exact: true }).click();
  await page.getByPlaceholder('Task title...').fill('Prepare the approved opening');
  await page.getByPlaceholder('Optional description...').fill('Use the approved client title.');
  await page.getByRole('combobox').selectOption(fixture.actors.staff.id);
  await page.getByText('Visible to Client', { exact: true }).locator('..').locator('..').getByRole('button').click();
  const createdResponse = page.waitForResponse(response => response.url().endsWith('/api/tasks') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create Task', exact: true }).click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const task = await created.json();
  expect(task.assignedTo).toBe(fixture.actors.staff.id);
  expect(task.visibleToClient).toBe(true);
  await expect(page.getByText('Prepare the approved opening', { exact: true })).toBeVisible();
  const staff = await actorContext(browser, fixture, 'staff', testInfo.outputPath('videos'));
  try {
    const staffPage = await staff.newPage();
    await staffPage.goto(tasksPath);
    await staffPage.getByTitle('Edit task', { exact: true }).click();
    const editForm = staffPage.getByRole('button', { name: 'Save Changes', exact: true }).locator('..').locator('..');
    await editForm.getByRole('combobox').first().selectOption('in_progress');
    const updateResponse = staffPage.waitForResponse(response => response.url().includes(`/api/tasks/${task.id}`) && response.request().method() === 'PATCH');
    await editForm.getByRole('button', { name: 'Save Changes', exact: true }).click();
    expect((await updateResponse).status()).toBe(200);
    await staffPage.reload();
    await expect(staffPage.getByText('In Progress', { exact: true })).toBeVisible();
    const persisted = await api(staff.request, 'GET', `tasks/${task.id}`);
    expect(persisted.status).toBe('in_progress');
    expect(persisted.assignedTo).toBe(fixture.actors.staff.id);
    await page.reload();
    await expect(page.getByText('In Progress', { exact: true })).toBeVisible();
    await page.getByTitle('Edit task', { exact: true }).click();
    const managerForm = page.getByRole('button', { name: 'Save Changes', exact: true }).locator('..').locator('..');
    await managerForm.getByPlaceholder('Optional description...').fill('The approved title is assigned to the editor.');
    const managerUpdate = page.waitForResponse(response => response.url().includes(`/api/tasks/${task.id}`) && response.request().method() === 'PATCH');
    await managerForm.getByRole('button', { name: 'Save Changes', exact: true }).click();
    expect((await managerUpdate).status()).toBe(200);
    await page.reload();
    await staffPage.reload();
    for (const actor of [manager, staff]) {
      const updatedTask = await api(actor.request, 'GET', `tasks/${task.id}`);
      expect(updatedTask.description).toBe('The approved title is assigned to the editor.');
      expect(updatedTask.status).toBe('in_progress');
      expect(updatedTask.assignedTo).toBe(fixture.actors.staff.id);
    }
    const clientPage = await primary.newPage();
    await clientPage.goto(tasksPath);
    await expect(clientPage.getByText('Prepare the approved opening', { exact: true })).toBeVisible();
    await expect(clientPage.getByText('In Progress', { exact: true })).toBeVisible();
    await clientPage.screenshot({ path: '.scratch/production-readiness/evidence/P01/lane-03.png', fullPage: true });
  } finally { await staff.close(); }
});

for (const width of [1280, 390]) test(`client revision and approval persists at ${width}px`, async () => {
  await api(primary.request, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
  const staffPage = await manager.newPage();
  const reviewPath = `/portal/projects/${fixture.projectId}/deliverables/${fixture.deliverableId}`;
  await staffPage.goto(reviewPath);
  const upload = staffPage.waitForResponse(response => response.url().includes('/api/deliverable-files') && response.request().method() === 'POST');
  await staffPage.locator('input[type="file"]').setInputFiles('e2e/fixtures/readiness.mp4');
  expect((await upload).status()).toBe(201);
  await expect(staffPage.getByRole('button', { name: 'Send for Client Review', exact: true })).toBeVisible();
  await staffPage.getByRole('button', { name: 'Send for Client Review', exact: true }).click();
  const reviewDialog = staffPage.getByRole('dialog');
  const closeReview = reviewDialog.getByRole('button', { name: 'Close', exact: true });
  await expect(closeReview).toBeFocused();
  await staffPage.keyboard.press('Shift+Tab');
  await expect(reviewDialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await staffPage.keyboard.press('Tab');
  await expect(closeReview).toBeFocused();
  await staffPage.keyboard.press('Escape');
  await expect(reviewDialog).toHaveCount(0);
  await expect(staffPage.getByRole('button', { name: 'Send for Client Review', exact: true })).toBeFocused();
  await staffPage.keyboard.press('Enter');
  await expect(closeReview).toBeFocused();
  const review = staffPage.waitForResponse(response => response.url().includes(`/deliverables/${fixture.deliverableId}`) && response.request().method() === 'PATCH');
  await staffPage.getByRole('button', { name: 'Send for Review', exact: true }).click();
  expect((await review).status()).toBe(200);
  await staffPage.screenshot({ path: `.scratch/production-readiness/evidence/P01/review-${width}.png`, fullPage: true });
  const clientPage = await primary.newPage();
  await clientPage.setViewportSize({ width, height: 844 });
  await clientPage.goto(reviewPath);
  const discussion = clientPage.getByRole('region', { name: 'File discussion' });
  await expect(discussion.getByText('No comments on this file yet.')).toBeVisible();
  await discussion.getByLabel('Video timestamp in seconds').fill('12.5');
  await discussion.getByLabel('Comment on this file').fill('Keep this note attached to the first upload.');
  await discussion.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(discussion.getByText('Keep this note attached to the first upload.', { exact: true })).toBeVisible();
  await clientPage.reload();
  await expect(discussion.getByText('Keep this note attached to the first upload.', { exact: true })).toBeVisible();
  await staffPage.reload();
  const teamDiscussion = staffPage.getByRole('region', { name: 'File discussion' });
  await teamDiscussion.getByRole('button', { name: 'Reply to comment' }).click();
  await teamDiscussion.getByLabel('Reply', { exact: true }).fill('The editor has read your first-upload note.');
  await teamDiscussion.getByRole('button', { name: 'Post reply', exact: true }).click();
  await expect(teamDiscussion.getByText('The editor has read your first-upload note.', { exact: true })).toBeVisible();
  await clientPage.reload();
  await expect(discussion.getByText('The editor has read your first-upload note.', { exact: true })).toBeVisible();
  await discussion.screenshot({ path: `.scratch/production-readiness/evidence/P01/feedback-${width}.png` });
  await expect(clientPage.getByText('2 of 2 remaining', { exact: true })).toBeVisible();
  await keyboardActivate(clientPage, clientPage.getByRole('button', { name: 'Request Revision', exact: true }));
  await clientPage.getByPlaceholder('Add any additional context or notes...').fill('Please replace the blue opening with our approved title.');
  await keyboardActivate(clientPage, clientPage.getByRole('button', { name: 'Submit Revision Request', exact: true }));
  const revision = clientPage.waitForResponse(response => response.url().includes('/revision-requests') && response.request().method() === 'POST');
  await keyboardActivate(clientPage, clientPage.getByRole('dialog').getByRole('button', { name: 'Submit Revision Request', exact: true }));
  expect((await revision).status()).toBe(201);
  await expect(clientPage.getByText('1 of 2 remaining', { exact: true })).toBeVisible();
  await clientPage.reload();
  await expect(clientPage.getByText('1 of 2 remaining', { exact: true })).toBeVisible();
  await expect(clientPage.getByRole('heading', { name: 'Review History', exact: true })).toBeVisible();
  await expect(clientPage.getByText('Please replace the blue opening with our approved title.', { exact: true })).toBeVisible();
  await clientPage.screenshot({ path: `.scratch/production-readiness/evidence/P01/revision-${width}.png`, fullPage: true });
  await staffPage.reload();
  await expect(staffPage.getByText('Please replace the blue opening with our approved title.', { exact: true })).toBeVisible();
  const revisedUpload = staffPage.waitForResponse(response => response.url().includes('/api/deliverable-files') && response.request().method() === 'POST');
  await staffPage.locator('input[type="file"]').setInputFiles({ name: 'readiness-revised.mp4', mimeType: 'video/mp4', buffer: await readFile('e2e/fixtures/readiness.mp4') });
  expect((await revisedUpload).status()).toBe(201);
  await staffPage.getByRole('button', { name: 'Send for Client Review', exact: true }).click();
  const resubmit = staffPage.waitForResponse(response => response.url().includes(`/deliverables/${fixture.deliverableId}`) && response.request().method() === 'PATCH');
  await staffPage.getByRole('button', { name: 'Send for Review', exact: true }).click();
  expect((await resubmit).status()).toBe(200);
  await clientPage.reload();
  await expect(clientPage.getByRole('heading', { name: 'readiness-revised.mp4', exact: true }).locator('..').getByText('Now Playing', { exact: true })).toBeVisible();
  await expect(discussion.getByText('No comments on this file yet.')).toBeVisible();
  await keyboardActivate(clientPage, clientPage.getByRole('button', { name: 'Preview readiness.mp4', exact: true }));
  await expect(discussion.getByText('Keep this note attached to the first upload.', { exact: true })).toBeVisible();
  await expect(discussion.getByText('The editor has read your first-upload note.', { exact: true })).toBeVisible();
  await keyboardActivate(clientPage, clientPage.getByRole('button', { name: 'Preview readiness-revised.mp4', exact: true }));
  await expect(discussion.getByText('No comments on this file yet.')).toBeVisible();
  await clientPage.screenshot({ path: `.scratch/production-readiness/evidence/P01/resubmission-${width}.png`, fullPage: true });
  await keyboardActivate(clientPage, clientPage.getByRole('button', { name: 'Approve Deliverable', exact: true }));
  await clientPage.screenshot({ path: `.scratch/production-readiness/evidence/P01/approval-dialog-${width}.png`, fullPage: true });
  const approval = clientPage.waitForResponse(response => response.url().includes(`/deliverables/${fixture.deliverableId}`) && response.request().method() === 'PATCH');
  await keyboardActivate(clientPage, clientPage.getByRole('dialog').getByRole('button', { name: 'Approve Deliverable', exact: true }));
  expect((await approval).status()).toBe(200);
  await clientPage.reload();
  await expect(clientPage.getByRole('heading', { name: 'Review History', exact: true }).locator('..').getByText('Approved', { exact: true })).toBeVisible();
  await expect(clientPage.getByText('Please replace the blue opening with our approved title.', { exact: true })).toBeVisible();
  await clientPage.getByRole('heading', { name: 'Review History', exact: true }).scrollIntoViewIfNeeded();
  await clientPage.screenshot({ path: `.scratch/production-readiness/evidence/P01/approval-${width}.png`, fullPage: true });
  await clientPage.close();
  await clientPage.video()?.saveAs(`.scratch/production-readiness/evidence/P01/review-cycle-${width}.webm`);
});
