import { query as dbQuery } from './_shared/db';
import crypto from 'crypto';
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
import { sendProjectInvitationEmail } from './send-email';
import { createLogger, getCorrelationId } from './_shared/logger';
import { getAppEnvironment } from './_shared/app-env';

export const handler = compose(
  withCORS(['POST', 'OPTIONS']),
  withAuth(),
  withRateLimit(RATE_LIMITS.apiStrict, 'invitation_resend')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const correlationId = getCorrelationId(event.headers);
  const logger = createLogger('invitations-resend', correlationId);
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
      `SELECT
         pi.id,
         pi.email,
         pi.token,
         pi.expires_at,
         pi.project_id,
         pi.role,
         p.name AS project_name,
         p.project_number,
         inviter.full_name AS invited_by_name
       FROM project_invitations pi
       JOIN projects p ON p.id = pi.project_id
       LEFT JOIN users inviter ON inviter.id = pi.invited_by
       WHERE pi.id = $1 AND pi.status = 'pending'`,
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

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await dbQuery(
      `UPDATE project_invitations
       SET token = $2,
           expires_at = $3,
           resent_at = NOW(),
           resent_count = COALESCE(resent_count, 0) + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [invitation.id, token, expiresAt]
    );

    const inviteLink = absoluteProjectAccessUrl({ token }, appOriginFromEnv(process.env));
    const emailResult = await sendProjectInvitationEmail({
      to: invitation.email,
      inviteLink,
      projectName: invitation.project_name || invitation.project_number || invitation.project_id,
      role: invitation.role,
      invitedByName: invitation.invited_by_name || auth?.user?.fullName || 'A team member',
      correlationId,
    });

    if (getAppEnvironment(process.env) === 'development') {
      logger.debug('Project invitation resend link generated for local development', { inviteLink });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, emailDelivery: { status: emailResult.status } }),
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createAuthorizationResponse(error, origin);
    }
    logger.error('Resend invitation failed', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to resend invitation',
      }),
    };
  }
});
