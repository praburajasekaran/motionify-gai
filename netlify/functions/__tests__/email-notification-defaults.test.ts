import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

describe('email notification defaults', () => {
  it('does not gate task emails on retired notification preferences', () => {
    const source = readFileSync(new URL('../tasks.ts', import.meta.url), 'utf8');

    assert.doesNotMatch(source, /email_task_assignment/);
    assert.doesNotMatch(source, /email_mention/);
    assert.doesNotMatch(source, /disabled in preferences/);
  });

  it('does not gate deliverable emails on retired notification preferences', () => {
    const source = readFileSync(new URL('../deliverables.ts', import.meta.url), 'utf8');

    assert.doesNotMatch(source, /email_project_update/);
    assert.doesNotMatch(source, /disabled in preferences/);
  });
});
