import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  sendEmail,
  sendUserDeactivationEmail,
  summarizeEmailDelivery,
  type EmailSenderClient,
} from '../send-email';

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

describe('sendUserDeactivationEmail', () => {
  it('sends an escaped account-deactivation notice through the shared delivery layer', async () => {
    let payload: Parameters<EmailSenderClient['emails']['send']>[0] | undefined;
    const client: EmailSenderClient = {
      emails: {
        async send(message) {
          payload = message;
          return { data: { id: 'deactivation-message-1' }, error: null };
        },
      },
    };

    const result = await sendUserDeactivationEmail({
      to: 'client@example.test',
      recipientName: 'Taylor <Admin>',
      reason: 'Requested by <script>alert("x")</script>',
      correlationId: 'deactivation-email-test',
    }, { client });

    assert.deepEqual(result, { status: 'sent', messageId: 'deactivation-message-1' });
    assert.equal(payload?.subject, 'Your Motionify Studio account has been deactivated');
    assert.match(payload?.html || '', /Taylor &lt;Admin&gt;/);
    assert.match(payload?.html || '', /Requested by &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(payload?.html || '', /<script>alert/);
  });
});
