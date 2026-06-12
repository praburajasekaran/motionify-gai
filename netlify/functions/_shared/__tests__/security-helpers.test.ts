import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import crypto from 'node:crypto';
import { isAdminLike, isTeamLike, normalizeProjectInvitationRole, normalizeRole } from '../roles';
import { verifyRazorpayCheckoutSignature } from '../payment-verification';
import { AuthorizationError, requireClientPrimaryContact, requirePaymentAccess, requireProjectAccess } from '../authorization';

function createRunner(handler: (text: string, params?: any[]) => any[]) {
  return {
    calls: [] as Array<{ text: string; params?: any[] }>,
    async query(text: string, params?: any[]) {
      this.calls.push({ text, params });
      return { rows: handler(text, params) };
    },
  };
}

describe('role helpers', () => {
  it('normalizes legacy and canonical team roles consistently', () => {
    assert.equal(normalizeRole('team'), 'team_member');
    assert.equal(normalizeRole('team_member'), 'team_member');
    assert.equal(isTeamLike('team'), true);
    assert.equal(isTeamLike('team_member'), true);
  });

  it('recognizes support and super admin as admin-like', () => {
    assert.equal(isAdminLike('support'), true);
    assert.equal(isAdminLike('super_admin'), true);
    assert.equal(isAdminLike('client'), false);
  });

  it('normalizes project invitation role aliases without allowing admin roles', () => {
    assert.equal(normalizeProjectInvitationRole('team'), 'team_member');
    assert.equal(normalizeProjectInvitationRole('team_member'), 'team_member');
    assert.equal(normalizeProjectInvitationRole('client'), 'client');
    assert.equal(normalizeProjectInvitationRole('support'), 'unknown');
    assert.equal(normalizeProjectInvitationRole('super_admin'), 'unknown');
  });
});

describe('Razorpay checkout verification', () => {
  it('accepts the HMAC over the server order id and provider payment id', () => {
    const secret = 'test_secret';
    const orderId = 'order_123';
    const paymentId = 'pay_456';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.equal(
      verifyRazorpayCheckoutSignature({ orderId, paymentId, signature, secret }),
      true
    );
  });

  it('rejects a signature generated for a different order binding', () => {
    const secret = 'test_secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update('order_other|pay_456')
      .digest('hex');

    assert.equal(
      verifyRazorpayCheckoutSignature({
        orderId: 'order_123',
        paymentId: 'pay_456',
        signature,
        secret,
      }),
      false
    );
  });
});

describe('provider client initialization', () => {
  it('does not throw at module import when optional providers are not configured', async () => {
    const previousEnv = {
      jwt: process.env.JWT_SECRET,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
      resendApiKey: process.env.RESEND_API_KEY,
    };

    process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters';
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RESEND_API_KEY;

    try {
      await import('../../payments');
      await import('../../payment-handoff');
      await import('../../comments');
      await import('../../send-email');
    } finally {
      if (previousEnv.jwt === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousEnv.jwt;
      if (previousEnv.razorpayKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
      else process.env.RAZORPAY_KEY_ID = previousEnv.razorpayKeyId;
      if (previousEnv.razorpayKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
      else process.env.RAZORPAY_KEY_SECRET = previousEnv.razorpayKeySecret;
      if (previousEnv.resendApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousEnv.resendApiKey;
    }
  });
});

describe('authorization helpers', () => {
  it('denies a client using another client project id', async () => {
    const runner = createRunner((text) => {
      if (text.includes('FROM projects WHERE id')) {
        return [{ id: 'project-1', client_user_id: 'client-a' }];
      }
      if (text.includes('FROM project_team')) return [];
      throw new Error(`Unexpected query: ${text}`);
    });

    await assert.rejects(
      () => requireProjectAccess(
        { userId: 'client-b', role: 'client', email: 'client-b@example.com' },
        'project-1',
        { runner, operation: 'test.projectAccess' }
      ),
      (error) => error instanceof AuthorizationError && error.statusCode === 403
    );
  });

  it('allows an assigned team member to access a project', async () => {
    const runner = createRunner((text) => {
      if (text.includes('FROM projects WHERE id')) {
        return [{ id: 'project-1', client_user_id: 'client-a' }];
      }
      if (text.includes('FROM project_team')) {
        return [{ role: 'team_member', is_primary_contact: false }];
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const project = await requireProjectAccess(
      { userId: 'team-1', role: 'team_member', email: 'team@example.com' },
      'project-1',
      { runner, operation: 'test.projectAccess' }
    );

    assert.equal((project as any).id, 'project-1');
  });

  it('uses a payment proposal project to authorize team payment access', async () => {
    const runner = createRunner((text) => {
      if (text.includes('FROM payments pay')) {
        return [{
          id: 'payment-1',
          project_id: null,
          resolved_project_id: 'project-1',
          proposal_client_user_id: 'client-a',
          project_client_user_id: 'client-a',
          contact_email: 'client@example.com',
        }];
      }
      if (text.includes('FROM projects WHERE id')) {
        return [{ id: 'project-1', client_user_id: 'client-a' }];
      }
      if (text.includes('FROM project_team')) {
        return [{ role: 'team_member', is_primary_contact: false }];
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const payment = await requirePaymentAccess(
      { userId: 'team-1', role: 'team_member', email: 'team@example.com' },
      'payment-1',
      { runner, operation: 'test.paymentAccess' }
    );

    assert.equal((payment as any).id, 'payment-1');
  });

  it('allows only an active client primary contact through the primary-contact guard', async () => {
    const runner = createRunner((text) => {
      if (text.includes('FROM projects WHERE id')) {
        return [{ id: 'project-1', client_user_id: 'client-a' }];
      }
      if (text.includes('FROM project_team')) {
        return [{ role: 'client', is_primary_contact: true }];
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const project = await requireClientPrimaryContact(
      { userId: 'client-a', role: 'client', email: 'client@example.com' },
      'project-1',
      { runner, operation: 'test.primaryContact' }
    );

    assert.equal((project as any).id, 'project-1');
  });

  it('denies regular client members through the primary-contact guard', async () => {
    const runner = createRunner((text) => {
      if (text.includes('FROM projects WHERE id')) {
        return [{ id: 'project-1', client_user_id: 'client-a' }];
      }
      if (text.includes('FROM project_team')) {
        return [{ role: 'client', is_primary_contact: false }];
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    await assert.rejects(
      () => requireClientPrimaryContact(
        { userId: 'client-a', role: 'client', email: 'client@example.com' },
        'project-1',
        { runner, operation: 'test.primaryContact' }
      ),
      (error) => error instanceof AuthorizationError && error.statusCode === 403
    );
  });
});
