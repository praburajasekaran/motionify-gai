import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.JWT_SECRET ||= 'test-jwt-secret-at-least-32-characters';

const { generateJWT, hashJWT } = await import('../jwt');
const { requireAuthFromCookie } = await import('../auth');

function runner(rows: any[]) {
  return {
    calls: [] as Array<{ text: string; params?: any[] }>,
    async query(text: string, params?: any[]) {
      this.calls.push({ text, params });
      return { rows };
    },
  };
}

describe('session-backed cookie authentication', () => {
  const token = generateJWT({
    id: '6ffef098-f889-4ff7-b31a-2227cc91ff11',
    email: 'old@example.com',
    role: 'super_admin',
    full_name: 'Old Claims',
  });
  const event = { headers: { cookie: `auth_token=${token}` } };

  it('rejects a valid JWT when no active session row exists', async () => {
    const db = runner([]);
    const result = await requireAuthFromCookie(event, db);

    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 401);
    assert.match(db.calls[0].text, /sessions/i);
  });

  it('uses current database identity and role instead of JWT claims', async () => {
    const db = runner([{
      session_id: 'session-1',
      id: '6ffef098-f889-4ff7-b31a-2227cc91ff11',
      email: 'current@example.com',
      full_name: 'Current User',
      role: 'client',
      is_active: true,
    }]);

    const result = await requireAuthFromCookie(event, db);

    assert.equal(result.authorized, true);
    assert.deepEqual(result.user, {
      userId: '6ffef098-f889-4ff7-b31a-2227cc91ff11',
      email: 'current@example.com',
      role: 'client',
      fullName: 'Current User',
      sessionId: 'session-1',
    });
  });

  it('rejects inactive users even when a session row is returned', async () => {
    const db = runner([{
      session_id: 'session-1',
      id: '6ffef098-f889-4ff7-b31a-2227cc91ff11',
      email: 'current@example.com',
      full_name: 'Current User',
      role: 'client',
      is_active: false,
    }]);

    const result = await requireAuthFromCookie(event, db);

    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 401);
  });

  it('issues a distinct revocation credential for immediate repeated logins', () => {
    const user = {
      id: '6ffef098-f889-4ff7-b31a-2227cc91ff11',
      email: 'current@example.com',
      role: 'client',
      full_name: 'Current User',
    };
    const first = generateJWT(user);
    const second = generateJWT(user);

    assert.notEqual(first, second);
    assert.notEqual(hashJWT(first), hashJWT(second));
  });
});
