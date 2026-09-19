import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const clientUserId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';

async function resolveTaskCreationAssignee(
  input: {
    authenticatedUserId: string;
    isClientUser: boolean;
    requestedAssigneeId?: string | null;
  },
) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-characters';
  const taskModule = await import('../tasks');
  return taskModule.resolveTaskCreationAssignee(input);
}

describe('task creation assignment', () => {
  it('persists an authenticated client self-assignment', async () => {
    assert.deepEqual(
      await resolveTaskCreationAssignee({
        authenticatedUserId: clientUserId,
        isClientUser: true,
        requestedAssigneeId: clientUserId,
      }),
      { ok: true, assignedTo: clientUserId },
    );
  });

  it('leaves an omitted client assignment unassigned', async () => {
    assert.deepEqual(
      await resolveTaskCreationAssignee({
        authenticatedUserId: clientUserId,
        isClientUser: true,
        requestedAssigneeId: undefined,
      }),
      { ok: true, assignedTo: null },
    );
  });

  it('rejects a client attempt to assign another user', async () => {
    assert.deepEqual(
      await resolveTaskCreationAssignee({
        authenticatedUserId: clientUserId,
        isClientUser: true,
        requestedAssigneeId: otherUserId,
      }),
      {
        ok: false,
        error: 'Clients may only assign tasks to themselves',
      },
    );
  });

  it('preserves a non-client assignment for project-membership validation', async () => {
    assert.deepEqual(
      await resolveTaskCreationAssignee({
        authenticatedUserId: clientUserId,
        isClientUser: false,
        requestedAssigneeId: otherUserId,
      }),
      { ok: true, assignedTo: otherUserId },
    );
  });
});
