import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.JWT_SECRET ||= 'test-jwt-secret-at-least-32-characters';

const { consumeUserInvitation } = await import('../auth-verify-magic-link');

function client(invitation: Record<string, any>, existingUsers: any[] = []) {
  const calls: string[] = [];
  return {
    calls,
    async query(text: string, params?: any[]) {
      calls.push(text);
      if (text.includes('FROM user_invitations')) return { rows: invitation ? [invitation] : [] };
      if (text.includes('FROM users') && text.includes('LOWER(email)')) return { rows: existingUsers };
      if (text.includes('INSERT INTO users')) {
        return { rows: [{ id: 'new-user', email: params?.[0], full_name: params?.[1], role: params?.[2] }] };
      }
      if (text.includes('UPDATE user_invitations')) return { rows: [{ id: invitation.id }] };
      throw new Error(`Unexpected query: ${text}`);
    },
  };
}

describe('consumeUserInvitation', () => {
  const pending = {
    id: 'invite-1',
    email: 'invitee@example.com',
    full_name: 'Invited User',
    role: 'team_member',
    status: 'pending',
    expires_at: new Date(Date.now() + 60_000),
  };

  it('creates the invited user and atomically marks the invitation accepted', async () => {
    const db = client(pending);
    const user = await consumeUserInvitation(db as any, 'token-1', 'invitee@example.com');

    assert.deepEqual(user, {
      id: 'new-user',
      email: 'invitee@example.com',
      fullName: 'Invited User',
      role: 'team_member',
      avatarUrl: null,
    });
    assert.equal(db.calls.some((sql) => sql.includes('INSERT INTO users')), true);
    assert.equal(db.calls.some((sql) => sql.includes('UPDATE user_invitations')), true);
  });

  it('rejects expired invitations before creating a user', async () => {
    const db = client({ ...pending, expires_at: new Date(Date.now() - 60_000) });

    await assert.rejects(
      () => consumeUserInvitation(db as any, 'token-1'),
      (error: any) => error.code === 'TOKEN_EXPIRED'
    );
    assert.equal(db.calls.some((sql) => sql.includes('INSERT INTO users')), false);
  });

  it('rejects replayed invitations before creating a user', async () => {
    const db = client({ ...pending, status: 'accepted' });

    await assert.rejects(
      () => consumeUserInvitation(db as any, 'token-1'),
      (error: any) => error.code === 'TOKEN_ALREADY_USED'
    );
    assert.equal(db.calls.some((sql) => sql.includes('INSERT INTO users')), false);
  });

  it('rejects conflicting existing users without accepting the invitation', async () => {
    const db = client(pending, [{ id: 'existing-user' }]);

    await assert.rejects(
      () => consumeUserInvitation(db as any, 'token-1'),
      (error: any) => error.code === 'USER_ALREADY_EXISTS' && error.statusCode === 409
    );
    assert.equal(db.calls.some((sql) => sql.includes('UPDATE user_invitations')), false);
  });
});
