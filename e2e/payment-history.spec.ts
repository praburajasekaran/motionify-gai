import { test, expect } from '@playwright/test';
import { setupAuthSession } from './helpers/auth';

const projectId = 'payment-history-project';
const payment = { id: 'advance-inr', project_id: projectId, amount: '100', currency: 'INR', status: 'completed', payment_type: 'advance', created_at: '2026-10-01T17:50:26.580Z', razorpay_payment_id: 'pay_receipt' };

test('project receipts format minor units and keep paid totals separate by currency', async ({ page }) => {
  await setupAuthSession(page);
  await page.route(`**/.netlify/functions/projects/${projectId}`, route => route.fulfill({ json: {
    id: projectId, name: 'Live payment verification', status: 'in_progress', team: [],
  } }));
  await page.route(`**/.netlify/functions/payments?projectId=${projectId}`, route => route.fulfill({ json: [
    payment,
    { ...payment, id: 'balance-inr', amount: '25', payment_type: 'balance' },
    { ...payment, id: 'advance-usd', amount: '250', currency: 'USD' },
    { ...payment, id: 'pending-inr', amount: '10000', status: 'pending' },
    { ...payment, id: 'failed-usd', amount: '50000', currency: 'USD', status: 'failed' },
  ] }));
  await page.goto(`/portal/projects/${projectId}/7`);
  const history = page.getByRole('tabpanel');
  await expect(history.getByText('Transaction History', { exact: true })).toBeVisible();
  await expect(history.getByText('₹1.25', { exact: true })).toBeVisible();
  await expect(history.getByText('$2.50', { exact: true })).toHaveCount(2);
  await expect(history.getByRole('row').filter({ hasText: 'pay_receipt' }).first()).toContainText('₹1.00');
  await expect(history.getByText('Total Budget', { exact: true })).toHaveCount(0);
  await expect(history.getByText('Outstanding Balance', { exact: true })).toHaveCount(0);
});

test('project receipts show no completed payments without inventing a currency', async ({ page }) => {
  await setupAuthSession(page);
  await page.route(`**/.netlify/functions/projects/${projectId}`, route => route.fulfill({ json: {
    id: projectId, name: 'Unpaid project', status: 'in_progress', team: [],
  } }));
  await page.route(`**/.netlify/functions/payments?projectId=${projectId}`, route => route.fulfill({ json: [] }));
  await page.goto(`/portal/projects/${projectId}/7`);
  await expect(page.getByText('No completed payments', { exact: true })).toBeVisible();
  await expect(page.getByText('No payments found', { exact: true })).toBeVisible();
});

test('the primary client can open balance checkout from project payment history', async ({ page }) => {
  const proposalId = 'f260c88e-b24a-4a86-a9ba-19e7e0e40110';
  await setupAuthSession(page, { id: 'client-primary', name: 'Primary Client', email: 'client@example.test', role: 'client',
    projectTeamMemberships: { [projectId]: { projectId, isPrimaryContact: true } } });
  await page.route(`**/.netlify/functions/projects/${projectId}`, route => route.fulfill({ json: {
    id: projectId, name: 'Project with balance', proposal_id: proposalId, client_user_id: 'client-primary', status: 'active', team: [],
  } }));
  await page.route(`**/.netlify/functions/payments?projectId=${projectId}`, route => route.fulfill({ json: [payment] }));
  await page.route(`**/.netlify/functions/proposal-detail/${proposalId}`, route => route.fulfill({ json: {
    id: proposalId, status: 'accepted', balance_amount: 100, advance_amount: 100, currency: 'INR', deliverables: [],
  } }));
  await page.goto(`/portal/projects/${projectId}/7`);
  const button = page.getByRole('button', { name: 'Pay balance', exact: true });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page).toHaveURL(`/portal/payment/${proposalId}?paymentType=balance`);
});

for (const scenario of ['completed balance', 'no advance', 'zero balance', 'secondary client']) {
  test(`project history does not offer checkout for ${scenario}`, async ({ page }) => {
    const proposalId = 'f260c88e-b24a-4a86-a9ba-19e7e0e40110';
    await setupAuthSession(page, { id: 'client-primary', name: 'Client', email: 'client@example.test', role: 'client',
      projectTeamMemberships: { [projectId]: { projectId, isPrimaryContact: scenario !== 'secondary client' } } });
    await page.route(`**/.netlify/functions/projects/${projectId}`, route => route.fulfill({ json: {
      id: projectId, name: 'Payment eligibility', proposal_id: proposalId, status: 'active', team: [],
    } }));
    await page.route(`**/.netlify/functions/payments?projectId=${projectId}`, route => route.fulfill({ json:
      scenario === 'no advance' ? [] : scenario === 'completed balance' ? [payment, { ...payment, id: 'paid-balance', payment_type: 'balance' }] : [payment],
    }));
    await page.route(`**/.netlify/functions/proposal-detail/${proposalId}`, route => route.fulfill({ json: {
      id: proposalId, status: 'accepted', balance_amount: scenario === 'zero balance' ? 0 : 100,
      advance_amount: 100, currency: 'INR', deliverables: [],
    } }));
    await page.goto(`/portal/projects/${projectId}/7`);
    await expect(page.getByText('Transaction History', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay balance', exact: true })).toHaveCount(0);
  });
}
