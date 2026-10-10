import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

declare global {
  interface Window {
    paymentTimeoutTiming?: { started: number; recovered: number };
  }
}

const evidenceDir = '.scratch/production-readiness/evidence/P03';
type Fixture = { proposalId: string; projectId?: string; userId: string; cookie: string };
type State = { orderCount: number; messageCount: number; payments: {
  id: string; payment_type: string; amount: string; currency: string; status: string; project_id: string;
  razorpay_order_id: string; razorpay_payment_id: string;
}[]; projects: { id: string; status: string }[]; receipts: { payment_id: string; status: string }[] };
let fixture: Fixture;

async function state(request: APIRequestContext): Promise<State> {
  return (await request.get('/__payment/state')).json();
}

async function installProvider(page: Page) {
  await page.route('**/*tawk.to/**', route => route.abort());
  await page.addInitScript(() => {
    class Checkout {
      options: { order_id: string; handler: (proof: unknown) => void; modal?: { ondismiss: () => void } };
      failed?: () => void;
      constructor(options: Checkout['options']) { this.options = options; }
      on(_event: string, failed: () => void) { this.failed = failed; }
      open() {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-label', 'Synthetic Razorpay Test Mode');
        for (const name of ['Complete synthetic payment', 'Cancel synthetic checkout', 'Decline synthetic payment']) {
          const button = document.createElement('button');
          button.textContent = name;
          button.onclick = async () => {
            dialog.remove();
            if (name === 'Cancel synthetic checkout') this.options.modal?.ondismiss();
            else if (name === 'Decline synthetic payment') {
              await fetch('/__payment/webhook', { method: 'POST', body: JSON.stringify({ orderId: this.options.order_id, event: 'payment.failed' }) });
              this.failed?.();
            } else {
              const proof = await fetch('/__payment/proof', { method: 'POST', body: JSON.stringify({ orderId: this.options.order_id }) }).then(response => response.json());
              this.options.handler(proof);
            }
          };
          dialog.append(button);
        }
        document.body.append(dialog);
      }
    }
    Object.assign(window, { Razorpay: Checkout });
  });
}

async function openBalance(page: Page) {
  await page.goto(`/portal/payment/${fixture.proposalId}?paymentType=balance`);
  await expect(page.getByRole('heading', { name: 'Balance Payment', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
}

async function measureTimeout(page: Page, endpoint: string) {
  await page.evaluate(endpoint => {
    const timing = { started: 0, recovered: 0 };
    Object.assign(window, { paymentTimeoutTiming: timing });
    const original = window.fetch.bind(window);
    window.fetch = (...args: Parameters<typeof fetch>) => {
      if (String(args[0]).endsWith(endpoint)) timing.started = performance.now();
      return original(...args);
    };
    const observer = new MutationObserver(() => {
      const alert = document.querySelector('[role="alert"]');
      if (timing.started && !timing.recovered && alert) {
        timing.recovered = performance.now();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }, endpoint);
}

async function timeoutElapsed(page: Page) {
  return page.evaluate(() => {
    const timing = window.paymentTimeoutTiming;
    if (!timing?.started || !timing.recovered) throw new Error('Payment timeout recovery was not measured');
    const { started, recovered } = timing;
    return recovered - started;
  });
}

test.beforeEach(async ({ context, request, page }) => {
  await mkdir(evidenceDir, { recursive: true });
  fixture = await (await request.post('/__payment/fixture', { data: { balance: true } })).json();
  await context.addCookies([{ name: 'auth_token', value: fixture.cookie, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  await installProvider(page);
});

for (const width of [1280, 390]) {
  test(`project terms acceptance persists after reload in the payment sandbox at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/portal/projects/${fixture.projectId}/6`);
    await expect(page.getByRole('heading', { name: 'No activity yet', exact: true })).toBeVisible();
    const response = page.waitForResponse(response => response.url().endsWith('/projects-accept-terms')
      && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Accept Terms & Start Project', exact: true }).click();
    const accepted = await response;
    expect(accepted.status()).toBe(200);
    const acceptance = await accepted.json();
    expect(acceptance).toMatchObject({ success: true, termsAcceptedBy: fixture.userId });
    expect(Number.isNaN(Date.parse(acceptance.termsAcceptedAt))).toBe(false);
    const status = page.getByRole('status').filter({ has: page.getByRole('heading', { name: 'Terms accepted', exact: true }) });
    await expect(status).toContainText('Accepted by Payment Test Client on');
    await expect(status.locator('time')).toHaveAttribute('dateTime', acceptance.termsAcceptedAt);
    await expect(page.getByRole('tabpanel')).toContainText('You accepted the terms', { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Project Terms Review Required', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(status).toContainText('Accepted by Payment Test Client on');
    await expect(status.locator('time')).toHaveAttribute('dateTime', acceptance.termsAcceptedAt);
    await expect(page.getByRole('tabpanel')).toContainText('You accepted the terms');
    await expect(page.getByRole('heading', { name: 'Project Terms Review Required', exact: true })).toHaveCount(0);
    const loaded = await page.request.get(`/api/projects/${fixture.projectId}`);
    expect(loaded.status()).toBe(200);
    expect(await loaded.json()).toMatchObject({ terms_accepted_at: acceptance.termsAcceptedAt,
      terms_accepted_by: fixture.userId });
    const repeated = await page.request.post('/.netlify/functions/projects-accept-terms', {
      headers: { 'X-Requested-With': 'fetch' }, data: { projectId: fixture.projectId, accepted: true },
    });
    expect(repeated.status()).toBe(200);
    expect((await repeated.json()).termsAcceptedAt).toBe(acceptance.termsAcceptedAt);
    const activityResponse = await page.request.get(`/api/activities?projectId=${fixture.projectId}`);
    expect(activityResponse.status()).toBe(200);
    const termsEvents = (await activityResponse.json()).filter((activity: { type: string }) => activity.type === 'TERMS_ACCEPTED');
    expect(termsEvents).toHaveLength(1);
    expect(termsEvents[0]).toMatchObject({ userId: fixture.userId, userName: 'Payment Test Client', projectId: fixture.projectId });
    await page.screenshot({ path: `${evidenceDir}/terms-status-${width}.png`, fullPage: true });
    await page.getByRole('tab', { name: 'Payments', exact: true }).click();
    await expect(status).toContainText('Accepted by Payment Test Client on');
    await expect(page.getByRole('heading', { name: 'Transaction History', exact: true })).toBeVisible();
    await writeFile(`${evidenceDir}/terms-status-regression-${width}.json`, JSON.stringify({ projectId: fixture.projectId,
      status: accepted.status(), termsAcceptedBy: acceptance.termsAcceptedBy, termsAcceptedAt: acceptance.termsAcceptedAt,
      persistedAfterReload: true, repeatPreservedTimestamp: true, termsActivityCount: termsEvents.length,
      immediateActivityVisible: true, width }, null, 2));
  });
}

for (const width of [1280, 390]) {
  test(`balance checkout preserves project identity and history after reload at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/portal/projects/${fixture.projectId}/7`);
    await page.getByRole('button', { name: 'Pay balance', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`payment/${fixture.proposalId}\\?paymentType=balance`));
    await page.screenshot({ path: `${evidenceDir}/balance-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
    await page.getByRole('button', { name: 'Complete synthetic payment', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Payment Successful!' })).toBeVisible();
    const captured = await state(request);
    const balance = captured.payments.find(payment => payment.payment_type === 'balance')!;
    expect(balance).toMatchObject({ amount: '100', currency: 'INR', status: 'completed', project_id: fixture.projectId });
    expect(captured.projects).toEqual([{ id: fixture.projectId, status: 'active' }]);
    const events = ['payment.captured', 'order.paid'].map(event => ({ orderId: balance.razorpay_order_id, event, eventId: `${event}-${width}` }));
    for (let replay = 0; replay < 2; replay++) {
      const responses = await Promise.all(events.map(data => request.post('/__payment/webhook', { data })));
      expect(responses.map(response => response.status())).toEqual([200, 200]);
    }
    const final = await state(request);
    expect(final.receipts).toEqual([{ payment_id: balance.id, status: 'sent', message_id: expect.any(String) }]);
    expect(final.messageCount).toBe(1);
    expect(final.orderCount).toBe(1);
    await page.getByRole('button', { name: 'Open Project', exact: true }).click();
    await page.reload();
    const history = page.getByRole('tabpanel');
    await expect(history.getByRole('row').filter({ hasText: balance.razorpay_payment_id })).toContainText('₹1.00');
    await expect(history.getByText('₹2.00', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay balance', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${evidenceDir}/history-${width}.png`, fullPage: true });
    await writeFile(`${evidenceDir}/state-${width}.json`, JSON.stringify(final, null, 2));
  });
}

test('cancelled balance checkout leaves one pending order and no receipt', async ({ page, request }) => {
  await openBalance(page);
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await page.getByRole('button', { name: 'Cancel synthetic checkout', exact: true }).click();
  await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
  const result = await state(request);
  expect(result.payments.find(p => p.payment_type === 'balance')?.status).toBe('pending');
  expect(result.receipts).toEqual([]);
  expect(result.orderCount).toBe(1);
  await page.screenshot({ path: `${evidenceDir}/lane-03-synthetic.png`, fullPage: true });
});

test('declined balance persists failure and permits a new legitimate attempt', async ({ page, request }) => {
  await openBalance(page);
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await page.getByRole('button', { name: 'Decline synthetic payment', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Payment failed. Please try again.');
  expect((await state(request)).payments.find(p => p.payment_type === 'balance')?.status).toBe('failed');
  await page.screenshot({ path: `${evidenceDir}/lane-04-synthetic.png`, fullPage: true });
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await expect(page.getByRole('button', { name: 'Cancel synthetic checkout', exact: true })).toBeVisible();
  expect((await state(request)).orderCount).toBe(2);
  await page.getByRole('button', { name: 'Cancel synthetic checkout', exact: true }).click();
  expect((await state(request)).receipts).toEqual([]);
});

test('order timeout recovers within 21 seconds without opening checkout', async ({ page, request }) => {
  test.setTimeout(45_000);
  await request.post('/__payment/fault', { data: { orderDelayMs: 21_500 } });
  await openBalance(page);
  await measureTimeout(page, '/payments/create-order');
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await expect(page.getByRole('alert')).toHaveText('Payment service took too long to respond. Please try again.', { timeout: 21_000 });
  const elapsed = await timeoutElapsed(page);
  expect(elapsed).toBeGreaterThanOrEqual(19_900);
  expect(elapsed).toBeLessThan(21_000);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDir}/lane-05.png`, fullPage: true });
  await writeFile(`${evidenceDir}/order-timeout.json`, JSON.stringify({ elapsedMs: elapsed, limitMs: 21_000 }));
  await expect.poll(async () => (await state(request)).orderCount).toBe(1);
});

test('confirmation timeout retries identical proof without another balance order', async ({ page, request }) => {
  test.setTimeout(45_000);
  await request.post('/__payment/fault', { data: { confirmationDelayMs: 21_500 } });
  await openBalance(page);
  const proofs: string[] = [];
  page.on('request', request => { if (request.url().endsWith('/payments/verify')) proofs.push(request.postData() || ''); });
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await measureTimeout(page, '/payments/verify');
  await page.getByRole('button', { name: 'Complete synthetic payment', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('without paying again', { timeout: 21_000 });
  const elapsed = await timeoutElapsed(page);
  expect(elapsed).toBeGreaterThanOrEqual(19_900);
  expect(elapsed).toBeLessThan(21_000);
  await page.screenshot({ path: `${evidenceDir}/lane-06.png`, fullPage: true });
  await request.post('/__payment/fault', { data: {} });
  await page.getByRole('button', { name: 'Retry payment confirmation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Payment Successful!' })).toBeVisible();
  expect(proofs).toHaveLength(2);
  expect(proofs[1]).toBe(proofs[0]);
  const final = await state(request);
  expect(final.orderCount).toBe(1);
  expect(final.projects).toEqual([{ id: fixture.projectId, status: 'active' }]);
  await writeFile(`${evidenceDir}/confirmation-timeout.json`, JSON.stringify({ elapsedMs: elapsed, limitMs: 21_000, orderCount: final.orderCount, identicalProof: true }));
});

test('temporary confirmation failure retains proof and leaves project activation untouched', async ({ page, request }) => {
  await request.post('/__payment/fault', { data: { failConfirmationOnce: true } });
  await openBalance(page);
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await page.getByRole('button', { name: 'Complete synthetic payment', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('without paying again');
  await page.getByRole('button', { name: 'Retry payment confirmation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Payment Successful!' })).toBeVisible();
  const result = await state(request);
  expect(result.orderCount).toBe(1);
  expect(result.projects).toEqual([{ id: fixture.projectId, status: 'active' }]);
});
