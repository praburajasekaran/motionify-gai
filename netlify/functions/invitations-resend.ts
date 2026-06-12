import { query as dbQuery } from './_shared/db';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { absoluteProjectAccessUrl, appOriginFromEnv } from '../../shared/canonical-links';
import {
  AuthorizationError,
  createAuthorizationResponse,
  getAuthRole,
  requireProjectManagerAccess,
} from './_shared/authorization';

export const handler = compose(
  withCORS(['POST', 'OPTIONS']),
  withAuth(),
  withRateLimit(RATE_LIMITS.apiStrict, 'invitation_resend')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Extract invitationId from path
  // Path format: /.netlify/functions/invitations-resend/{invitationId}/resend
  const pathParts = event.path.split('/');
  const invitationId = pathParts[pathParts.length - 2]; // Get the second-to-last part

  if (!invitationId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invitation ID is required' }),
    };
  }

  try {
    // Find pending invitation
    const result = await dbQuery(
      `SELECT id, email, token, expires_at, project_id, role FROM project_invitations
       WHERE id = $1 AND status = 'pending'`,
      [invitationId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Pending invitation not found' }),
      };
    }

    const invitation = result.rows[0];
    const currentUserRole = getAuthRole(auth?.user);

    await requireProjectManagerAccess(auth?.user, invitation.project_id, {
      allowClientPrimary: true,
      operation: 'invitations.resend',
    });

    if (currentUserRole === 'client' && invitation.role !== 'client') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Clients can only resend client invitations' }),
      };
    }

    if (currentUserRole === 'team_member') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Team members cannot resend invitations' }),
      };
    }

    // Resend email (log in development)
    const inviteLink = absoluteProjectAccessUrl({ token: invitation.token }, appOriginFromEnv(process.env));
    console.log(`[Mock Email] Resent invitation to ${invitation.email}:`);
    console.log(`  Link: ${inviteLink}`);
    console.log(`  Expires: ${new Date(invitation.expires_at).toISOString()}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createAuthorizationResponse(error, origin);
    }
    console.error('Resend invitation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to resend invitation',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
});
