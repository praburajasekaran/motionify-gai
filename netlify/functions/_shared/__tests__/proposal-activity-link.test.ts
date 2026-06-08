import assert from 'node:assert/strict';
import test from 'node:test';
import { linkProposalActivitiesToProject } from '../proposal-activity-link';

test('linkProposalActivitiesToProject links pre-project proposal activities to the project', async () => {
  const calls: Array<{ queryText: string; values?: any[] }> = [];
  const client = {
    async query(queryText: string, values?: any[]) {
      calls.push({ queryText, values });
      return { rows: [] };
    },
  };

  await linkProposalActivitiesToProject(client, {
    proposalId: 'proposal-123',
    projectId: 'project-456',
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].queryText, /UPDATE activities/);
  assert.match(calls[0].queryText, /WHERE proposal_id = \$2/);
  assert.match(calls[0].queryText, /AND project_id IS NULL/);
  assert.deepEqual(calls[0].values, ['project-456', 'proposal-123']);
});
