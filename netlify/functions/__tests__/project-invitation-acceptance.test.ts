import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.JWT_SECRET ||= 'test-project-invitation-secret-that-is-long-enough';
const { acceptProjectInvitation } = await import('../invitations-accept');

function invitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invitation-1',
    project_id: 'project-1',
    project_name: null,
    project_number: 'PRJ-001',
    email: 'invitee@example.com',
    role: 'team_member',
    ...overrides,
  };
}

describe('project invitation acceptance', () => {
  it('accepts an existing active user and creates membership plus activity', async () => {
    const statements: string[] = [];
    const rows = [
      [invitationRow({ project_name: 'Launch Film' })],
      [{ id: 'user-1', full_name: 'Invitee' }],
      [{ id: 'invitation-1' }],
      [],
      [],
    ];
    const client = {
      async query(text: string) {
        statements.push(text);
        return { rows: rows.shift() ?? [] };
      },
    };

    const result = await acceptProjectInvitation(client as any, 'token-1');

    assert.deepEqual(result, {
      project: { id: 'project-1', name: 'Launch Film' },
      email: 'invitee@example.com',
      role: 'team_member',
      user_id: 'user-1',
      requires_signup: false,
    });
    assert.match(statements[0], /FOR UPDATE OF pi/);
    assert.match(statements[2], /accepted_by/);
    assert.match(statements[3], /INSERT INTO project_team/);
    assert.match(statements[4], /INSERT INTO activities/);
  });

  it('preserves requires_signup for invitees without an account', async () => {
    const statements: string[] = [];
    const client = {
      async query(text: string) {
        statements.push(text);
        return statements.length === 1
          ? { rows: [invitationRow()] }
          : { rows: [] };
      },
    };

    const result = await acceptProjectInvitation(client as any, 'token-1');

    assert.equal(result.requires_signup, true);
    assert.equal(result.user_id, null);
    assert.equal(result.project.name, 'PRJ-001');
    assert.equal(statements.length, 2);
  });

  it('rejects expired, revoked, or replayed invitations before mutation', async () => {
    const client = { async query() { return { rows: [] }; } };
    await assert.rejects(
      acceptProjectInvitation(client as any, 'invalid-token'),
      (error: any) => error.statusCode === 400,
    );
  });

  it('propagates downstream failures so the enclosing transaction rolls back', async () => {
    let call = 0;
    const client = {
      async query() {
        call++;
        if (call === 1) return { rows: [invitationRow()] };
        if (call === 2) return { rows: [{ id: 'user-1', full_name: 'Invitee' }] };
        if (call === 3) return { rows: [{ id: 'invitation-1' }] };
        throw new Error('membership insert failed');
      },
    };

    await assert.rejects(
      acceptProjectInvitation(client as any, 'token-1'),
      /membership insert failed/,
    );
  });
});
