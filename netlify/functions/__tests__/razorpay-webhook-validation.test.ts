import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import { createRazorpayWebhookHandler } from '../razorpay-webhook';

const secret = 'test-razorpay-webhook-secret';

const paymentEntity = {
  id: 'pay_test_123',
  order_id: 'order_test_123',
  amount: 125_000,
  currency: 'INR',
  status: 'captured',
};

function payload(event: string, includePayment = true) {
  return {
    entity: 'event',
    account_id: 'acc_test',
    event,
    contains: includePayment ? ['payment'] : [],
    payload: includePayment ? { payment: { entity: paymentEntity } } : {},
    created_at: 1_789_745_600,
  };
}

function sign(body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function event(body: string, signature: string, eventId = 'evt_test_123') {
  return {
    httpMethod: 'POST',
    body,
    headers: {
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': eventId,
    },
  } as any;
}

async function invoke(
  body: string,
  signature: string,
  overrides: Parameters<typeof createRazorpayWebhookHandler>[0] = {},
) {
  process.env.RAZORPAY_WEBHOOK_SECRET = secret;
  const handler = createRazorpayWebhookHandler(overrides);
  const response = await handler(event(body, signature), {} as any);
  assert.ok(response);
  return response;
}

describe('Razorpay webhook validation', () => {
  it('rejects a missing signature before attempting to parse malformed JSON', async () => {
    let queried = false;
    const response = await invoke('{malformed', '', {
      query: async () => {
        queried = true;
        throw new Error('query should not run');
      },
    } as any);

    assert.equal(response.statusCode, 401);
    assert.deepEqual(JSON.parse(response.body), { error: 'Invalid signature' });
    assert.equal(queried, false);
  });

  it('returns 401 for an invalid signature on otherwise valid JSON', async () => {
    const body = JSON.stringify(payload('payment.captured'));
    const response = await invoke(body, 'invalid-signature');

    assert.equal(response.statusCode, 401);
    assert.deepEqual(JSON.parse(response.body), { error: 'Invalid signature' });
  });

  it('returns 400 for validly signed invalid JSON', async () => {
    const body = '{malformed';
    const response = await invoke(body, sign(body));

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), { error: 'Invalid JSON payload' });
  });

  it('returns 400 for a validly signed payload with an invalid schema', async () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} });
    const response = await invoke(body, sign(body));

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), { error: 'Invalid webhook payload' });
  });

  it('returns 400 when a handled event has no payment entity', async () => {
    const body = JSON.stringify(payload('payment.captured', false));
    const response = await invoke(body, sign(body));

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), { error: 'Invalid webhook payload' });
  });
});

describe('Razorpay webhook acknowledgements', () => {
  it('resumes receipt delivery before acknowledging an already-processed event', async () => {
    const body = JSON.stringify(payload('payment.captured'));
    let delivered = false;
    const response = await invoke(body, sign(body), {
      isEventProcessed: async () => true,
      query: async () => ({ rows: [{ payment_id: 'payment-row-1' }] }),
      transaction: async (callback: (client: any) => Promise<unknown>) => callback({
        query: async () => ({ rows: [{ payment_id: 'payment-row-1' }] }),
      }),
      deliverPaymentReceipt: async (paymentId: string) => {
        assert.equal(paymentId, 'payment-row-1');
        delivered = true;
      },
    } as any);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { status: 'already_processed' });
    assert.equal(delivered, true);
  });

  it('acknowledges a supported event after processing it', async () => {
    const body = JSON.stringify(payload('payment.captured'));
    let handled = false;
    const response = await invoke(body, sign(body), {
      isEventProcessed: async () => false,
      transaction: async (callback: (client: any) => Promise<unknown>) => callback({}),
      handlePaymentCaptured: async () => {
        handled = true;
        return { success: true, paymentId: 'payment-row-1' };
      },
      logWebhook: async () => 'webhook-log-1',
      deliverPaymentReceipt: async () => {},
    } as any);

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).status, 'ok');
    assert.equal(handled, true);
  });

  it('acknowledges an intentionally ignored event', async () => {
    const ignoredPayload = {
      ...payload('refund.processed', false),
      payload: {
        refund: {
          entity: { id: 'rfnd_test_123', amount: 125_000 },
        },
      },
    };
    const body = JSON.stringify(ignoredPayload);
    let auditLogged = false;
    let loggedPayload: unknown;
    const response = await invoke(body, sign(body), {
      isEventProcessed: async () => false,
      transaction: async (callback: (client: any) => Promise<unknown>) => callback({}),
      logWebhook: async (_client: unknown, params: { payload: unknown }) => {
        auditLogged = true;
        loggedPayload = params.payload;
        return 'webhook-log-1';
      },
    } as any);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      status: 'ok',
      event: 'refund.processed',
      processed: true,
    });
    assert.equal(auditLogged, true);
    assert.deepEqual(loggedPayload, ignoredPayload);
  });

  it('returns a retriable sanitized response for internal processing errors', async () => {
    const body = JSON.stringify(payload('payment.captured'));
    const response = await invoke(body, sign(body), {
      isEventProcessed: async () => false,
      transaction: async () => {
        throw new Error('postgres password=super-secret');
      },
      query: async () => ({ rows: [], rowCount: 0 }),
    } as any);

    assert.equal(response.statusCode, 503);
    assert.deepEqual(JSON.parse(response.body), {
      status: 'error',
      error: 'Webhook processing failed',
    });
    assert.doesNotMatch(response.body, /super-secret|postgres/i);
  });
});
