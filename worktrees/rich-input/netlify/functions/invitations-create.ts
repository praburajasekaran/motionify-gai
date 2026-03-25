import { compose, withCORS, withSuperAdmin, withRateLimit, withValidation, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { query } from './_shared/db';
import { getCorsHeaders } from './_shared/cors';
import crypto from 'crypto';

export const handler = compose(
  withCORS(['POST']),
  withSuperAdmin(),
  withRateLimit(RATE_LIMITS.apiStrict, 'invitation_create'),
  withValidation(SCHEMAS.invitation.create)
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const data = (event as any).validatedData;
  const { email, role, full_name } = data;

  try {
    // Check if user already exists
    const existingUser = await query(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (existingUser.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: {
            code: 'USER_EXISTS',
            message: 'A user with this email already exists',
          },
        }),
      };
    }

    // Check if invitation already exists
    const existingInvitation = await query(
      `SELECT id FROM user_invitations
       WHERE LOWER(email) = LOWER($1) AND status = 'pending' AND expires_at > NOW()`,
      [email]
    );

    if (existingInvitation.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: {
            code: 'INVITATION_EXISTS',
            message: 'An invitation has already been sent to this email',
          },
        }),
      };
    }

    // Generate secure token (valid for 7 days)
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Insert invitation
    const result = await query(
      `INSERT INTO user_invitations (email, role, token, invited_by, expires_at, full_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, status, expires_at, created_at, full_name`,
      [email.toLowerCase(), role, token, auth!.user!.userId, expiresAt, full_name || null]
    );

    const invitation = result.rows[0];

    // TODO: Send email with invitation link
    // For development, log the invitation link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/invitation/accept?token=${token}`;
    console.log(`[Invitation] Sent to ${email}:`);
    console.log(`  Link: ${inviteLink}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);
    console.log(`  Invited by: ${auth!.user!.email}`);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          full_name: invitation.full_name,
          status: invitation.status,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
        },
      }),
    };
  } catch (error) {
    console.error('Create invitation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create invitation',
        },
      }),
    };
  }
});
