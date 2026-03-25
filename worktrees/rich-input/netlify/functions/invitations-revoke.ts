import { compose, withCORS, withSuperAdmin, withRateLimit, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { query } from './_shared/db';
import { getCorsHeaders } from './_shared/cors';

export const handler = compose(
  withCORS(['DELETE']),
  withSuperAdmin(),
  withRateLimit(RATE_LIMITS.apiStrict, 'invitation_revoke')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Extract invitationId from path
  const pathParts = event.path.split('/');
  const invitationId = pathParts[pathParts.length - 1];

  if (!invitationId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: {
          code: 'MISSING_ID',
          message: 'Invitation ID is required',
        },
      }),
    };
  }

  try {
    // Check if invitation exists and is pending
    const check = await query(
      `SELECT id, email, status FROM user_invitations WHERE id = $1`,
      [invitationId]
    );

    if (check.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Invitation not found',
          },
        }),
      };
    }

    const invitation = check.rows[0];

    if (invitation.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'ALREADY_PROCESSED',
            message: 'Invitation has already been processed',
          },
        }),
      };
    }

    // Revoke invitation
    await query(
      `UPDATE user_invitations
       SET status = 'revoked', revoked_at = NOW(), revoked_by = $1
       WHERE id = $2`,
      [auth!.user!.userId, invitationId]
    );

    console.log(`[Invitation] Revoked for ${invitation.email} by ${auth!.user!.email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Revoke invitation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to revoke invitation',
        },
      }),
    };
  }
});
