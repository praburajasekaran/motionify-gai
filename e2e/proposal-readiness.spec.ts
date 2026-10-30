import { test, expect } from '@playwright/test';

test('a real token-protected proposal loads and hands off to checkout', async ({ page, request }) => {
  const fixture = await (await request.post('/__readiness/fixture', { data: { proposalReview: true } })).json();
  await page.goto(`/proposal/${fixture.proposalId}?token=${fixture.token}`);
  await expect(page.getByRole('heading', { name: 'Proposal', exact: true })).toBeVisible();
  await expect(page.getByText('Payment Test Client', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Accept & Pay', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/payment/${fixture.proposalId}\\?token=`));
  await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
  const persisted = await request.get(`/api/public-proposal/${fixture.proposalId}?token=${fixture.token}`);
  expect(persisted.status()).toBe(200);
  expect((await persisted.json()).proposal.status).toBe('sent');
});

test('proposal feedback persists through the real handler and a reload', async ({ page, request }) => {
  const fixture = await (await request.post('/__readiness/fixture', { data: { proposalReview: true } })).json();
  await page.goto(`/proposal/${fixture.proposalId}?token=${fixture.token}`);
  await page.getByRole('button', { name: 'Request Changes', exact: true }).click();
  await page.getByPlaceholder('Describe the changes you would like...').fill('Please include a shorter version for the launch.');
  const saving = page.waitForResponse(response => response.url().includes('/public-proposal/') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  expect((await saving).status()).toBe(200);
  await page.reload();
  await expect(page.getByText('You have already responded to this proposal.', { exact: true })).toBeVisible();
  const persisted = await (await request.get(`/api/public-proposal/${fixture.proposalId}?token=${fixture.token}`)).json();
  expect(persisted.proposal.status).toBe('changes_requested');
  expect(persisted.proposal.feedback).toBe('Please include a shorter version for the launch.');
  await page.screenshot({ path: '.scratch/production-readiness/evidence/P01/proposal-feedback.png', fullPage: true });
});

test('an invalid proposal token denies the real public handler and hides the proposal', async ({ page, request }) => {
  const fixture = await (await request.post('/__readiness/fixture', { data: { proposalReview: true } })).json();
  const denied = await request.get(`/api/public-proposal/${fixture.proposalId}?token=invalid-token`);
  expect(denied.status()).toBe(403);
  await page.goto(`/proposal/${fixture.proposalId}?token=invalid-token`);
  await expect(page.getByRole('button', { name: 'Accept & Pay', exact: true })).toHaveCount(0);
  await expect(page.getByText('Payment Test Client', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Proposal Not Found', exact: true })).toBeVisible();
});
