import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDatabaseSslConfig } from '../connection';

describe('database SSL configuration', () => {
  it('enforces certificate-validated TLS for staging and production APP_ENV values', () => {
    assert.equal(getDatabaseSslConfig({ APP_ENV: 'staging' }), true);
    assert.equal(getDatabaseSslConfig({ APP_ENV: 'production' }), true);
  });

  it('supports explicit local TLS and explicit operator disablement', () => {
    assert.deepEqual(
      getDatabaseSslConfig({ APP_ENV: 'development', DATABASE_SSL: 'true' }),
      { rejectUnauthorized: false }
    );
    assert.equal(
      getDatabaseSslConfig({ APP_ENV: 'staging', DATABASE_SSL: 'false' }),
      false
    );
  });
});
