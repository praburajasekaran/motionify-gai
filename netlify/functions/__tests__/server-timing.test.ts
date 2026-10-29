import assert from 'node:assert/strict';
import { test } from 'node:test';
import { measureStage, withServerTiming } from '../_shared/server-timing';
import type { NetlifyEvent } from '../_shared/middleware';

test('reports stages for each GET without changing its response', async () => {
  const handler = withServerTiming()(async event => {
    await measureStage(event, 'access', async () => 'ok');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
  });
  const makeEvent = (): NetlifyEvent => ({ httpMethod: 'GET', headers: {}, body: null, path: '/' });
  const responses = await Promise.all([handler(makeEvent()), handler(makeEvent())]);
  for (const response of responses) {
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, '[]');
    assert.match(response.headers['Server-Timing'], /^access;dur=\d+\.\d, total;dur=\d+\.\d$/);
  }
});

test('does not add timing headers to mutations', async () => {
  const handler = withServerTiming()(async () => ({ statusCode: 204, headers: {}, body: '' }));
  const response = await handler({ httpMethod: 'POST', headers: {}, body: null, path: '/' });
  assert.equal(response.headers['Server-Timing'], undefined);
});
