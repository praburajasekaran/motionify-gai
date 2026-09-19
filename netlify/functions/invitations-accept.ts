import { transaction, type PoolClient } from './_shared/db';
import { compose, withCORS, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { normalizeProjectInvitationRole } from './_shared/roles';

type InvitationAcceptanceClient = Pick<PoolClient, 'query'>;

export async function acceptProjectInvitation(
  client: InvitationAcceptanceClient,
  token: string
) {
  const result = await client.query(
    `SELECT pi.*, p.id AS project_id, p.name AS project_name, p.project_number
     FROM project_invitations pi
     JOIN projects p ON pi.project_id = p.id
     WHERE pi.token = $1
       AND pi.status = 'pending'
       AND pi.expires_at > NOW()
     FOR UPDATE OF pi`,
    [token]
  );

  if (result.rows.length === 0) {
    throw { statusCode: 400, message: 'Invalid or expired invitation' };
  }

  const invitation = result.rows[0];
  const invitationRole = normalizeProjectInvitationRole(invitation.role);
  if (invitationRole === 'unknown') {
    throw { statusCode: 400, message: 'Invalid invitation role' };
  }

  const userCheck = await client.query(
    'SELECT id, full_name FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
    [invitation.email]
  );
  const acceptedByUserId = userCheck.rows[0]?.id || null;
  const projectName = invitation.project_name || invitation.project_number;

  if (!acceptedByUserId) {
    return {
      project: { id: invitation.project_id, name: projectName },
      email: invitation.email,
      role: invitationRole,
      user_id: null,
      requires_signup: true,
    };
  }

  const markedAccepted = await client.query(
    `UPDATE project_invitations
     SET status = 'accepted', accepted_at = NOW(), accepted_by = $2
     WHERE id = $1 AND status = 'pending'
     RETURNING id`,
    [invitation.id, acceptedByUserId]
  );
  if (markedAccepted.rows.length === 0) {
    throw { statusCode: 400, message: 'Invalid or expired invitation' };
  }

  await client.query(
    `INSERT INTO project_team (user_id, project_id, role, invitation_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, project_id) DO UPDATE SET
       role = $3, removed_at = NULL, removed_by = NULL, invitation_id = $4`,
    [acceptedByUserId, invitation.project_id, invitationRole, invitation.id]
  );

  await client.query(
    `INSERT INTO activities (type, user_id, user_name, project_id, details)
     VALUES ('TEAM_MEMBER_ADDED', $1, $2, $3, $4)`,
    [
      acceptedByUserId,
      userCheck.rows[0]?.full_name || 'Unknown',
      invitation.project_id,
      JSON.stringify({ role: invitationRole, viaInvitation: true }),
    ]
  );

  return {
    project: { id: invitation.project_id, name: projectName },
    email: invitation.email,
    role: invitationRole,
    user_id: acceptedByUserId,
    requires_signup: false,
  };
}

export const handler = compose(
  withCORS(['POST', 'OPTIONS']),
  withRateLimit(RATE_LIMITS.apiStrict, 'invitation_accept')
)(async (event: NetlifyEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Extract token from path
  // Path format: /.netlify/functions/invitations-accept/{token}
  const pathParts = event.path.split('/');
  const token = pathParts[pathParts.length - 1];

  if (!token) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invitation token is required' }),
    };
  }

  try {
    const acceptance = await transaction((client) => acceptProjectInvitation(client, token));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...acceptance,
      }),
    };
  } catch (error: any) {
    if (error?.statusCode) {
      return {
        statusCode: error.statusCode,
        headers,
        body: JSON.stringify({ error: error.message }),
      };
    }
    console.error('Accept invitation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to accept invitation',
      }),
    };
  }
});
