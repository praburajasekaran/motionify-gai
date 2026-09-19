import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateRuntimePrerequisites } from '../health';

const COMPLETE_ENV = {
  DATABASE_URL: 'postgresql://example.invalid/motionify',
  JWT_SECRET: 'test-secret-at-least-32-characters',
  RESEND_API_KEY: 're_test',
  RESEND_FROM_EMAIL: 'Motionify <test@example.com>',
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'bucket',
  RAZORPAY_KEY_ID: 'rzp_test',
  RAZORPAY_KEY_SECRET: 'secret',
  RAZORPAY_WEBHOOK_SECRET: 'webhook-secret',
  SENTRY_DSN: 'https://server@example.invalid/1',
  VITE_SENTRY_DSN: 'https://browser@example.invalid/2',
};

describe('health runtime prerequisites', () => {
  it('passes when staging has every required integration configured', () => {
    const result = evaluateRuntimePrerequisites('staging', COMPLETE_ENV);

    assert.equal(result.status, 'healthy');
    assert.deepEqual(result.missingRequired, []);
    assert.equal(result.services.email.status, 'pass');
    assert.equal(result.services.storage.status, 'pass');
    assert.equal(result.services.payment.status, 'pass');
    assert.equal(result.services.errorTracking.status, 'pass');
  });

  it('makes missing integrations unhealthy in staging and production', () => {
    for (const environment of ['staging', 'production'] as const) {
      const result = evaluateRuntimePrerequisites(environment, {
        DATABASE_URL: COMPLETE_ENV.DATABASE_URL,
        JWT_SECRET: COMPLETE_ENV.JWT_SECRET,
      });

      assert.equal(result.status, 'unhealthy');
      assert.equal(result.services.email.status, 'fail');
      assert.equal(result.services.storage.status, 'fail');
      assert.equal(result.services.payment.status, 'fail');
      assert.equal(result.services.errorTracking.status, 'fail');
    }
  });

  it('reports missing integrations as degraded warnings in local development', () => {
    const result = evaluateRuntimePrerequisites('development', {
      DATABASE_URL: COMPLETE_ENV.DATABASE_URL,
      JWT_SECRET: COMPLETE_ENV.JWT_SECRET,
    });

    assert.equal(result.status, 'degraded');
    assert.equal(result.services.email.status, 'warn');
    assert.equal(result.services.storage.status, 'warn');
    assert.equal(result.services.payment.status, 'warn');
    assert.equal(result.services.errorTracking.status, 'warn');
  });

  it('always fails when core runtime variables are absent', () => {
    const result = evaluateRuntimePrerequisites('development', {});

    assert.equal(result.status, 'unhealthy');
    assert.deepEqual(result.missingRequired, ['DATABASE_URL', 'JWT_SECRET']);
  });
});
