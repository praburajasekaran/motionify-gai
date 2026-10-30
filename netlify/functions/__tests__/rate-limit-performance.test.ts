import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { initializeReadinessDatabase, readinessPool } from '../../../scripts/readiness-fixture';
import { closePool } from '../_shared/db';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit';

const pool = readinessPool();
const config = { windowMs: 60_000, maxRequests: 10 };

before(async () => { await initializeReadinessDatabase(pool); });
after(async () => { await closePool(); await pool.end(); });

for (const withUniqueConstraint of [false, true]) {
  test(`enforces concurrent requests with unique constraint ${withUniqueConstraint}`, async () => {
    await pool.query('TRUNCATE rate_limit_entries');
    if (withUniqueConstraint) await pool.query('ALTER TABLE rate_limit_entries ADD CONSTRAINT rate_limit_unique UNIQUE (identifier, action, created_at)');
    try {
      const results = await Promise.all(Array.from({ length: 30 }, () => checkRateLimit('same-user', 'api', config)));
      assert.equal(results.filter(result => result.allowed).length, 10);
      assert.equal(results.filter(result => !result.allowed).length, 20);
      assert.ok(results.filter(result => !result.allowed).every(result => result.retryAfter && result.retryAfter > 0));
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM rate_limit_entries WHERE identifier = $1', ['same-user'])).rows[0].n, 10);
      assert.equal((await checkRateLimit('another-user', 'api', config)).allowed, true);
      assert.equal((await checkRateLimit('same-user', 'other-action', config)).allowed, true);
      const denied = results.find(result => !result.allowed)!;
      assert.ok(Number(getRateLimitHeaders(denied)['Retry-After']) > 0);
    } finally {
      if (withUniqueConstraint) await pool.query('ALTER TABLE rate_limit_entries DROP CONSTRAINT rate_limit_unique');
    }
  });
}

test('short-window cleanup retains entries needed by longer windows', async () => {
  await pool.query('TRUNCATE rate_limit_entries');
  await pool.query(`INSERT INTO rate_limit_entries (identifier, action, created_at) VALUES
    ('long-window', 'magic_link', clock_timestamp() - interval '3 minutes'),
    ('expired', 'magic_link', clock_timestamp() - interval '3 hours')`);
  assert.equal((await checkRateLimit('short-window', 'api', config)).allowed, true);
  for (let attempt = 0; attempt < 50; attempt++) {
    const old = await pool.query('SELECT count(*)::int AS n FROM rate_limit_entries WHERE identifier = $1', ['expired']);
    if (old.rows[0].n === 0) break;
    await delay(20);
  }
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM rate_limit_entries WHERE identifier = $1', ['expired'])).rows[0].n, 0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM rate_limit_entries WHERE identifier = $1', ['long-window'])).rows[0].n, 1);
});

test('expired entries do not consume the current window', async () => {
  await pool.query('TRUNCATE rate_limit_entries');
  await pool.query("INSERT INTO rate_limit_entries (identifier, action, created_at) VALUES ('expired-window', 'api', clock_timestamp() - interval '2 minutes')");
  const first = await checkRateLimit('expired-window', 'api', config);
  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 9);
});

test('rejects transaction isolation that cannot guarantee concurrent limits', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await assert.rejects(client.query('SELECT * FROM consume_rate_limit($1, $2, $3, $4)', ['user', 'api', 60_000, 10]), /requires read committed/);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});

test('a missing table fails closed', async () => {
  await pool.query('ALTER TABLE rate_limit_entries RENAME TO rate_limit_entries_hidden');
  try {
    const result = await checkRateLimit('missing-table', 'api', config);
    assert.equal(result.allowed, false);
    assert.equal(result.retryAfter, 60);
  } finally {
    await pool.query('ALTER TABLE rate_limit_entries_hidden RENAME TO rate_limit_entries');
  }
});

test('missing database function fails closed', async () => {
  await pool.query('DROP FUNCTION consume_rate_limit(text, text, integer, integer)');
  const result = await checkRateLimit('missing-function', 'api', config);
  assert.equal(result.allowed, false);
  assert.equal(result.retryAfter, 60);
});
