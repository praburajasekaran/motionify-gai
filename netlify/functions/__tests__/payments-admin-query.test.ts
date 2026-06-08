import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('admin payments query', () => {
  it('resolves one project row per payment to avoid duplicate payment rows', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-characters';

    const { buildAdminPaymentsQuery } = await import('../payments');
    const query = buildAdminPaymentsQuery(undefined);

    assert.match(query.text, /LEFT JOIN LATERAL/);
    assert.match(query.text, /LIMIT 1/);
    assert.doesNotMatch(query.text, /LEFT JOIN projects proj ON proj\.id = pay\.project_id OR/);
  });

  it('keeps one canonical payment per proposal and payment type', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-characters';

    const { buildAdminPaymentsQuery } = await import('../payments');
    const query = buildAdminPaymentsQuery(undefined);

    assert.match(query.text, /WITH ranked_payments AS/);
    assert.match(query.text, /ROW_NUMBER\(\) OVER/);
    assert.match(query.text, /pay\.proposal_id::text \|\| ':' \|\| pay\.payment_type/);
    assert.match(query.text, /WHEN 'completed' THEN 0/);
    assert.match(query.text, /WHERE pay\.row_rank = 1/);
  });

  it('keeps status and project search filters parameterized', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-characters';

    const { buildAdminPaymentsQuery } = await import('../payments');
    const query = buildAdminPaymentsQuery({
      status: 'completed',
      projectSearch: 'PRJ-2026',
    });

    assert.deepEqual(query.params, ['completed', '%PRJ-2026%']);
    assert.match(query.text, /pay\.status = \$1/);
    assert.match(query.text, /proj\.project_number ILIKE \$2/);
    assert.match(query.text, /AND pay\.row_rank = 1/);
  });
});
