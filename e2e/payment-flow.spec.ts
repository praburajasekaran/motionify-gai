import { test, expect, type Page } from '@playwright/test';
import { setupAuthSession, E2E_SUPER_ADMIN } from './helpers/auth';

const proposalId = 'f260c88e-b24a-4a86-a9ba-19e7e0e40110';
const projectId = 'f260c88e-b24a-4a86-a9ba-19e7e0e40111';
const contact = { inquiryNumber: 'INQ-TEST-001', contactName: 'Payment Test Client', contactEmail: 'payment@example.test', contactPhone: null, companyName: null };
const proposal = { id: proposalId, inquiry_id: 'f260c88e-b24a-4a86-a9ba-19e7e0e40112', description: 'Test project', deliverables: [], currency: 'INR', total_price: 200, advance_percentage: 50, advance_amount: 100, balance_amount: 100, status: 'sent' };
const order = { id: 'f260c88e-b24a-4a86-a9ba-19e7e0e40113', razorpayKeyId: 'rzp_test_fixture', razorpayOrderId: 'order_fixture', amount: 100, currency: 'INR', name: 'Motionify Studio', description: 'Advance Payment' };
const success = { activation: { projectId, clientEmail: 'confirmed-client@example.test' } };

async function setup(page: Page, authenticated = false, mockCheckout = true) {
  if (authenticated) await setupAuthSession(page, E2E_SUPER_ADMIN);
  else await page.route('**/.netlify/functions/auth-me*', route => route.fulfill({ status: 401, json: { success: false } }));
  await page.route('**/*tawk.to/**', route => route.abort());
  await page.route('**/checkout.razorpay.com/**', route => route.abort());
  if (mockCheckout) await page.addInitScript(() => {
    class Checkout {
      options: any;
      failed: any;
      constructor(options: any) { this.options = options; }
      on(_event: string, handler: any) { this.failed = handler; }
      open() {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-label', 'Mock Razorpay checkout');
        const action = (name: string, handler: () => void) => {
          const button = document.createElement('button');
          button.textContent = name;
          button.onclick = () => { dialog.remove(); handler(); };
          dialog.append(button);
        };
        action('Complete test payment', () => this.options.handler({ razorpay_order_id: this.options.order_id, razorpay_payment_id: 'pay_fixture', razorpay_signature: 'signature_fixture' }));
        action('Fail test payment', () => this.failed({ error: { description: 'Declined' } }));
        action('Dismiss checkout', () => this.options.modal?.ondismiss());
        document.body.append(dialog);
      }
    }
    (window as any).Razorpay = Checkout;
  });
  await page.route('**/.netlify/functions/public-proposal/**', route => route.fulfill({ json: { proposal, paymentContact: contact, accessStatus: 'valid' } }));
  await page.route('**/.netlify/functions/proposal-detail/**', route => route.fulfill({ json: proposal }));
  await page.route('**/.netlify/functions/inquiry-detail/**', route => route.fulfill({ json: { inquiry_number: contact.inquiryNumber, contact_name: contact.contactName, contact_email: contact.contactEmail } }));
  const endpoint = authenticated ? 'payments' : 'payment-handoff';
  await page.route(`**/.netlify/functions/${endpoint}/create-order`, route => route.fulfill({ status: 201, json: order }));
  await page.route(`**/.netlify/functions/${endpoint}/verify`, route => route.fulfill({ json: success }));
  return endpoint;
}

async function openPayment(page: Page, authenticated = false) {
  await page.goto(`${authenticated ? '/portal' : ''}/payment/${proposalId}${authenticated ? '' : '?token=fixture-token'}`);
  await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
}

for (const authenticated of [false, true]) {
  const surface = authenticated ? 'authenticated' : 'public';
  test(`${surface} checkout verifies provider proof and opens exactly the activated project`, async ({ page }) => {
    const endpoint = await setup(page, authenticated);
    await openPayment(page, authenticated);
    const orderRequest = page.waitForRequest(`**/.netlify/functions/${endpoint}/create-order`);
    await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
    expect((await orderRequest).postDataJSON()).toEqual(authenticated ? { proposalId, paymentType: 'advance' } : { proposalId, token: 'fixture-token' });
    const verificationRequest = page.waitForRequest(`**/.netlify/functions/${endpoint}/verify`);
    await page.getByRole('button', { name: 'Complete test payment', exact: true }).click();
    expect((await verificationRequest).postDataJSON()).toEqual({ ...(authenticated ? {} : { proposalId, token: 'fixture-token' }), paymentId: order.id, razorpayOrderId: 'order_fixture', razorpayPaymentId: 'pay_fixture', razorpaySignature: 'signature_fixture' });
    await expect(page.getByRole('heading', { name: /Payment Successful/ })).toBeVisible();
    await page.getByRole('button', { name: 'Open Project', exact: true }).click();
    if (!authenticated) {
      await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/portal\/login\?/);
      expect(new URL(page.url()).searchParams.get('next')).toBe(`/projects/${projectId}`);
    } else {
      await expect(page).toHaveURL(new RegExp(`project-access.*projectId=${projectId}`));
    }
    expect(new URL(page.url()).searchParams.get('email')).toBe(success.activation.clientEmail);
  });

  test(`${surface} checkout dismissal restores the pay button`, async ({ page }) => {
    await setup(page, authenticated);
    await openPayment(page, authenticated);
    await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
    await page.getByRole('button', { name: 'Dismiss checkout', exact: true }).click();
    await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
    await expect(page.getByRole('heading', { name: /Payment Successful/ })).toHaveCount(0);
  });

  test(`${surface} failed confirmation retries the same proof without another charge`, async ({ page }) => {
    const endpoint = await setup(page, authenticated);
    let orders = 0;
    const proofs: object[] = [];
    await page.route(`**/.netlify/functions/${endpoint}/create-order`, route => { orders++; return route.fulfill({ json: order }); });
    await page.route(`**/.netlify/functions/${endpoint}/verify`, route => { proofs.push(route.request().postDataJSON()); return route.fulfill(proofs.length === 1 ? { status: 503, body: '' } : { json: success }); });
    await openPayment(page, authenticated);
    await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
    await page.getByRole('button', { name: 'Complete test payment', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('without paying again');
    await page.getByRole('button', { name: 'Retry payment confirmation', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Payment Successful/ })).toBeVisible();
    expect(orders).toBe(1);
    expect(proofs).toHaveLength(2);
    expect(proofs[1]).toEqual(proofs[0]);
  });
}

test('public checkout does not depend on authenticated inquiry data', async ({ page }) => {
  await setup(page);
  let inquiryRequests = 0;
  await page.route('**/.netlify/functions/inquiry-detail/**', route => { inquiryRequests++; return route.fulfill({ status: 401, json: { error: 'Authentication required' } }); });
  await openPayment(page);
  await expect(page.getByText('Proposal for Inquiry INQ-TEST-001')).toBeVisible();
  expect(inquiryRequests).toBe(0);
});

test('a signed-out client can review a token-protected proposal and proceed to checkout', async ({ page }) => {
  await setup(page);
  let inquiryRequests = 0;
  await page.route('**/.netlify/functions/inquiry-detail/**', route => {
    inquiryRequests++;
    return route.fulfill({ status: 401, json: { error: 'Authentication required' } });
  });
  await page.goto(`/proposal/${proposalId}?token=fixture-token`);
  await expect(page.getByRole('heading', { name: 'Proposal', exact: true })).toBeVisible();
  await expect(page.getByText(contact.inquiryNumber, { exact: true })).toBeVisible();
  await expect(page.getByText(contact.contactName, { exact: true })).toBeVisible();
  await expect(page.getByText('₹1.00', { exact: true })).toHaveCount(2);
  expect(inquiryRequests).toBe(0);
  await page.getByRole('button', { name: 'Accept & Pay', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/payment/${proposalId}\\?token=fixture-token`));
  await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
});

test('an invalid proposal token does not expose proposal or contact information', async ({ page }) => {
  await setup(page);
  await page.route('**/.netlify/functions/public-proposal/**', route => route.fulfill({
    status: 403,
    json: { accessStatus: 'invalid', message: 'Please request a fresh link.' },
  }));
  await page.goto(`/proposal/${proposalId}?token=invalid-token`);
  await expect(page.getByRole('heading', { name: 'Proposal Not Found' })).toBeVisible();
  await expect(page.getByText('Please request a fresh link.')).toBeVisible();
  await expect(page.getByText(contact.contactName, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Accept & Pay' })).toHaveCount(0);
});

test('a signed-out change request uses only the token-protected proposal endpoint', async ({ page }) => {
  await setup(page);
  let privateRequests = 0;
  let currentProposal = proposal;
  await page.route('**/.netlify/functions/inquiry-detail/**', route => {
    privateRequests++;
    return route.fulfill({ status: 401, json: { error: 'Authentication required' } });
  });
  await page.route('**/.netlify/functions/inquiries/**', route => {
    privateRequests++;
    return route.fulfill({ status: 401, json: { error: 'Authentication required' } });
  });
  await page.route('**/.netlify/functions/public-proposal/**', route => {
    if (route.request().method() === 'PATCH') {
      expect(route.request().postDataJSON()).toEqual({ status: 'changes_requested', feedback: 'Please update the delivery timeline.' });
      expect(new URL(route.request().url()).searchParams.get('token')).toBe('fixture-token');
      currentProposal = { ...proposal, status: 'changes_requested' };
      return route.fulfill({ json: currentProposal });
    }
    return route.fulfill({ json: { proposal: currentProposal, paymentContact: contact, accessStatus: 'valid' } });
  });
  await page.goto(`/proposal/${proposalId}?token=fixture-token`);
  await page.getByRole('button', { name: 'Request Changes', exact: true }).click();
  await page.getByPlaceholder('Describe the changes you would like...').fill('Please update the delivery timeline.');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('You have already responded to this proposal.')).toBeVisible();
  expect(privateRequests).toBe(0);
});

test('provider failure restores checkout without claiming payment success', async ({ page }) => {
  await setup(page);
  await openPayment(page);
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await page.getByRole('button', { name: 'Fail test payment', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Payment failed. Please try again.');
  await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
  await expect(page.getByRole('heading', { name: /Payment Successful/ })).toHaveCount(0);
});

test('an empty order response shows a recoverable error', async ({ page }) => {
  await setup(page);
  await page.route('**/.netlify/functions/payment-handoff/create-order', route => route.fulfill({ status: 500, body: '' }));
  await openPayment(page);
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await expect(page.getByRole('alert')).toHaveText('Payment service is temporarily unavailable. Please try again.');
  await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
});

test('incomplete activation keeps confirmation retry available', async ({ page }) => {
  await setup(page);
  await page.route('**/.netlify/functions/payment-handoff/verify', route => route.fulfill({ json: { status: 'completed', activation: { projectId: null } } }));
  await openPayment(page);
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await page.getByRole('button', { name: 'Complete test payment', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry payment confirmation' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: /Payment Successful/ })).toHaveCount(0);
});

test('checkout script failure is recoverable before any order is created', async ({ page }) => {
  await setup(page, false, false);
  let orders = 0;
  await page.route('**/.netlify/functions/payment-handoff/create-order', route => {
    orders++;
    return route.fulfill({ json: order });
  });
  await openPayment(page);
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await expect(page.getByRole('alert')).toContainText('Checkout could not load');
  await expect(page.getByRole('button', { name: /Pay .*1[.,]00/ })).toBeEnabled();
  expect(orders).toBe(0);
  await page.route('**/checkout.razorpay.com/**', route => route.fulfill({ contentType: 'application/javascript', body:
    `window.Razorpay = class { on() {} open() { const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog'); dialog.textContent = 'Checkout loaded after retry'; document.body.append(dialog); } };` }));
  await page.getByRole('button', { name: /Pay .*1[.,]00/ }).click();
  await expect(page.getByRole('dialog')).toHaveText('Checkout loaded after retry');
  expect(orders).toBe(1);
});
