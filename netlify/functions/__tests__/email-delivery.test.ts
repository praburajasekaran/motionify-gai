import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sendEmail, summarizeEmailDelivery, type EmailSenderClient } from '../send-email';

describe('sendEmail', () => {
  const options = {
    to: 'controlled-inbox@example.com',
    subject: 'Delivery contract',
    html: '<p>Hello</p>',
    correlationId: 'corr-123',
  };

  it('returns a sent result with the provider message id', async () => {
    const client: EmailSenderClient = {
      emails: {
        async send() {
          return { data: { id: 'resend-message-1' }, error: null };
        },
      },
    };

    assert.deepEqual(await sendEmail(options, { client }), {
      status: 'sent',
      messageId: 'resend-message-1',
    });
  });

  it('returns a sanitized retryable failure for provider throttling', async () => {
    const client: EmailSenderClient = {
      emails: {
        async send() {
          return {
            data: null,
            error: {
              name: 'rate_limit_exceeded',
              message: 'sensitive provider detail',
              statusCode: 429,
              requestId: 'provider-correlation-1',
            },
          };
        },
      },
    };

    assert.deepEqual(await sendEmail(options, { client }), {
      status: 'failed',
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
    });
  });

  it('does not expose thrown provider diagnostics', async () => {
    const client: EmailSenderClient = {
      emails: {
        async send() {
          throw new Error('api key and recipient suppression details');
        },
      },
    };

    assert.deepEqual(await sendEmail(options, { client }), {
      status: 'failed',
      code: 'PROVIDER_EXCEPTION',
      retryable: true,
    });
  });
});

describe('summarizeEmailDelivery', () => {
  it('omits metadata when no delivery was attempted', () => {
    assert.equal(summarizeEmailDelivery([]), undefined);
  });

  it('reports failure when any attempted delivery failed', () => {
    assert.deepEqual(summarizeEmailDelivery([
      { status: 'sent', messageId: 'message-1' },
      { status: 'failed', code: 'RATE_LIMIT_EXCEEDED', retryable: true },
    ]), { status: 'failed' });
  });
});
