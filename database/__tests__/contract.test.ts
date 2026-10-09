import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { verifyDatabaseContract } from '../contract';
import {
  canonicalColumns,
  canonicalConstraints,
  canonicalIndexes,
  createContractRunner,
} from './fixtures/database-contract';

describe('database contract verifier', () => {
  it('rejects missing delivery schema and task review stages', async () => {
    const result = await verifyDatabaseContract(createContractRunner({
      columns: canonicalColumns.filter(column => column.table_name !== 'tasks'
        && !(column.table_name === 'deliverables' && column.column_name === 'files_expired')),
      stages: [{ enumlabel: 'pending' }],
    }));
    assert.equal(result.ready, false);
    assert.ok(result.issues.some(issue => issue.code === 'missing_table' && issue.object === 'tasks'));
    assert.ok(result.issues.some(issue => issue.code === 'missing_column' && issue.object === 'deliverables.files_expired'));
    assert.ok(result.issues.some(issue => issue.code === 'invalid_constraint' && issue.object === 'task_stage.awaiting_approval'));
  });
  it('accepts the reconciled production contract using read-only catalog queries', async () => {
    const runner = createContractRunner();
    const result = await verifyDatabaseContract(runner);

    assert.equal(result.ready, true);
    assert.deepEqual(result.issues, []);
    assert.equal(result.latestMigration, '035_authentication_runtime');
    assert.ok(runner.calls.length >= 4);
    for (const statement of runner.calls) {
      assert.match(statement.trim(), /^SELECT/i);
      assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/i);
    }
  });

  it('reports a production-shaped drift fixture without mutating it', async () => {
    const columns = canonicalColumns.filter((column) =>
      column.table_name !== 'project_requests'
      && !(column.table_name === 'sessions' && column.column_name === 'jwt_token_hash')
    ).map((column) =>
      column.table_name === 'deliverables' && column.column_name === 'id'
        ? { ...column, column_default: null }
        : column
    );
    const constraints = canonicalConstraints.map((constraint) =>
      constraint.table_name === 'projects' && constraint.constraint_type === 'c'
        ? { ...constraint, definition: "CHECK (status IN ('active', 'review'))" }
        : constraint
    ).filter((constraint) => constraint.table_name !== 'project_requests');
    const indexes = canonicalIndexes.filter((index) => index.index_name !== 'idx_sessions_jwt_token_hash');
    const runner = createContractRunner({ columns, constraints, indexes, migrations: [] });

    const result = await verifyDatabaseContract(runner);
    const issueCodes = new Set(result.issues.map((issue) => issue.code));

    assert.equal(result.ready, false);
    assert.equal(issueCodes.has('missing_table'), true);
    assert.equal(issueCodes.has('missing_column'), true);
    assert.equal(issueCodes.has('invalid_default'), true);
    assert.equal(issueCodes.has('invalid_constraint'), true);
    assert.equal(issueCodes.has('missing_index'), true);
    assert.equal(issueCodes.has('missing_migration'), true);
  });

  it('requires unique ownership indexes for sessions and project-file object keys', async () => {
    const indexes = canonicalIndexes.map((index) => {
      if (index.index_name === 'idx_sessions_jwt_token_hash') {
        return { ...index, index_definition: 'CREATE INDEX idx_sessions_jwt_token_hash ON sessions (jwt_token_hash)' };
      }
      if (index.index_name === 'idx_project_files_r2_key') {
        return { ...index, index_definition: 'CREATE INDEX idx_project_files_r2_key ON project_files (r2_key)' };
      }
      return index;
    });
    const result = await verifyDatabaseContract(createContractRunner({ indexes }));

    assert.equal(result.ready, false);
    assert.deepEqual(
      result.issues.filter((issue) => issue.code === 'missing_index').map((issue) => issue.object).sort(),
      ['project_files.r2_key', 'sessions.jwt_token_hash']
    );
  });
});
