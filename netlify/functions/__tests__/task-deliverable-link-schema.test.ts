import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createTaskSchema, updateTaskSchema } from '../_shared/schemas';

const projectId = '11111111-1111-4111-8111-111111111111';
const deliverableId = '22222222-2222-4222-8222-222222222222';

describe('task deliverable link schema', () => {
  it('accepts deliverableId when creating a task', () => {
    const result = createTaskSchema.parse({
      projectId,
      deliverableId,
      title: 'Storyboard rough cut',
    });

    assert.equal(result.deliverableId, deliverableId);
  });

  it('accepts clearing deliverableId when updating a task', () => {
    const result = updateTaskSchema.parse({
      deliverableId: null,
    });

    assert.deepEqual(result, { deliverableId: null });
  });

  it('requires linked deliverables to belong to the task project', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-characters';

    const { deliverableBelongsToProject } = await import('../tasks');
    const queries: unknown[][] = [];
    const queryRunner = async (text: string, params: unknown[]) => {
      queries.push([text, params]);
      return { rows: params[0] === deliverableId && params[1] === projectId ? [{ '?column?': 1 }] : [] };
    };

    assert.equal(await deliverableBelongsToProject(deliverableId, projectId, queryRunner), true);
    assert.equal(await deliverableBelongsToProject(deliverableId, '33333333-3333-4333-8333-333333333333', queryRunner), false);
    assert.equal(await deliverableBelongsToProject(null, projectId, queryRunner), true);
    assert.equal(queries.length, 2);
    assert.match(String(queries[0][0]), /WHERE id = \$1 AND project_id = \$2/);
  });
});
