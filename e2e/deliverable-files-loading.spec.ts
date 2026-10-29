import { expect, test } from '@playwright/test';
import { setupAuthSession } from './helpers/auth';

test('loads files alongside deliverables and shares the result with the review panel', async ({ page }) => {
  await setupAuthSession(page);
  await page.route('**/.netlify/functions/projects/loading-project', route => route.fulfill({ json: {
    id: 'loading-project', name: 'Loading project', status: 'in_progress', team: [],
  } }));

  let releaseDeliverables!: () => void;
  const deliverablesGate = new Promise<void>(resolve => { releaseDeliverables = resolve; });
  await page.route('**/api/deliverables?projectId=loading-project', async route => {
    await deliverablesGate;
    await route.fulfill({ json: [{ id: 'loading-deliverable', project_id: 'loading-project', name: 'Review', status: 'final_delivered' }] });
  });

  let releaseFiles!: () => void;
  const filesGate = new Promise<void>(resolve => { releaseFiles = resolve; });
  let requests = 0;
  await page.route('**/api/deliverable-files?*', async route => {
    requests++;
    await filesGate;
    await route.fulfill({ json: [{
      id: 'file-1', deliverable_id: 'loading-deliverable', file_key: 'video-key', file_name: 'film.mp4',
      file_size: 1234, mime_type: 'video/mp4', file_category: 'video', is_final: true,
      label: null, sort_order: 0, uploaded_at: '2026-10-27T10:00:00Z', uploaded_by: null,
    }] });
  });

  await page.goto('/portal/projects/loading-project/deliverables/loading-deliverable');
  await expect.poll(() => requests).toBe(1);
  releaseDeliverables();
  await expect(page.getByRole('status').filter({ hasText: 'Loading files...' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Files', exact: true })).toBeVisible();
  releaseFiles();
  await expect(page.getByRole('heading', { name: 'Files (1)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'film.mp4' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'File discussion' })).toBeVisible();
  expect(requests).toBe(1);
});

test('shows a retry instead of an empty file list when the request fails', async ({ page }) => {
  await setupAuthSession(page);
  await page.route('**/.netlify/functions/projects/loading-project', route => route.fulfill({ json: {
    id: 'loading-project', name: 'Loading project', status: 'in_progress', team: [],
  } }));
  await page.route('**/api/deliverables?projectId=loading-project', route => route.fulfill({ json: [{
    id: 'loading-deliverable', project_id: 'loading-project', name: 'Review', status: 'final_delivered',
  }] }));
  let requests = 0;
  await page.route('**/api/deliverable-files?*', route => {
    requests++;
    return requests === 1 ? route.fulfill({ status: 500 }) : route.fulfill({ json: [] });
  });

  await page.goto('/portal/projects/loading-project/deliverables/loading-deliverable');
  await expect(page.getByRole('alert')).toContainText('Could not load files.');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Files (0)' })).toBeVisible();
  await expect(page.getByText('No files uploaded yet.')).toBeVisible();
});

test('removes a deleted file from the list and its review panel', async ({ page }) => {
  await setupAuthSession(page);
  await page.route('**/.netlify/functions/projects/loading-project', route => route.fulfill({ json: {
    id: 'loading-project', name: 'Loading project', status: 'in_progress', team: [],
  } }));
  await page.route('**/api/deliverables?projectId=loading-project', route => route.fulfill({ json: [{
    id: 'loading-deliverable', project_id: 'loading-project', name: 'Review', status: 'in_progress',
  }] }));
  let deleted = false;
  await page.route(/\/api\/deliverable-files(?:[/?]|$)/, route => {
    if (route.request().method() === 'DELETE') {
      deleted = true;
      return route.fulfill({ json: { success: true } });
    }
    return route.fulfill({ json: deleted ? [] : [{
      id: 'file-1', deliverable_id: 'loading-deliverable', file_key: 'video-key', file_name: 'film.mp4',
      file_size: 1234, mime_type: 'video/mp4', file_category: 'video', is_final: false,
      label: null, sort_order: 0, uploaded_at: '2026-10-27T10:00:00Z', uploaded_by: null,
    }] });
  });

  await page.goto('/portal/projects/loading-project/deliverables/loading-deliverable');
  await expect(page.getByRole('heading', { name: 'File discussion' })).toBeVisible();
  await page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Files (0)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'File discussion' })).toHaveCount(0);
  expect(deleted).toBe(true);
});
