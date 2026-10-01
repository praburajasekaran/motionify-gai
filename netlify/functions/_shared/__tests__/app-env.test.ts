import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAppEnvironment, isStrictRuntimeEnvironment } from '../app-env';

describe('application environment normalization', () => {
  it('honors every supported explicit APP_ENV value', () => {
    assert.equal(getAppEnvironment({ APP_ENV: 'production' }), 'production');
    assert.equal(getAppEnvironment({ APP_ENV: 'staging' }), 'staging');
    assert.equal(getAppEnvironment({ APP_ENV: 'preview' }), 'preview');
    assert.equal(getAppEnvironment({ APP_ENV: 'development' }), 'development');
  });

  it('normalizes Netlify contexts without requiring CONTEXT overrides', () => {
    assert.equal(getAppEnvironment({ CONTEXT: 'production' }), 'production');
    assert.equal(getAppEnvironment({ CONTEXT: 'deploy-preview' }), 'preview');
    assert.equal(getAppEnvironment({ CONTEXT: 'branch-deploy' }), 'preview');
    assert.equal(getAppEnvironment({ CONTEXT: 'dev', NODE_ENV: 'production' }), 'development');
  });

  it('falls back safely when APP_ENV is invalid or absent', () => {
    assert.equal(getAppEnvironment({ APP_ENV: 'invalid', CONTEXT: 'production' }), 'production');
    assert.equal(getAppEnvironment({ NODE_ENV: 'production' }), 'production');
    assert.equal(getAppEnvironment({ NODE_ENV: 'test' }), 'development');
    assert.equal(getAppEnvironment({}), 'development');
  });

  it('treats only staging and production as strict runtime environments', () => {
    assert.equal(isStrictRuntimeEnvironment('production'), true);
    assert.equal(isStrictRuntimeEnvironment('staging'), true);
    assert.equal(isStrictRuntimeEnvironment('preview'), false);
    assert.equal(isStrictRuntimeEnvironment('development'), false);
  });
});
