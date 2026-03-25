import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { query } from './_shared/db';
import { getCorsHeaders } from './_shared/cors';

/**
 * Revoke a project-level invitation.
 *
 * DELETE /.netlify/functions/invitations-revoke/{invitationId}
 *
 * Permission: super_admin, admin, support (on assigned projects),
 *             client primary contact (can revoke client invitations only)
 */
export const handler = compose(
  withCORS(['DELETE']),
  withAuth(),
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
        error: 'Invitation ID is required',
      }),
    };
  }

  try {
    // Check if invitation exists and is pending
    const check = await query(
      `SELECT id, email, status, project_id, role FROM project_invitations WHERE id = $1`,
      [invitationId]
    );

    if (check.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Invitation not found',
        }),
      };
    }

    const invitation = check.rows[0];

    if (invitation.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invitation has already been processed',
        }),
      };
    }

    const currentUserRole = auth?.user?.role;
    const currentUserId = auth?.user?.userId;

    // Permission check: clients can only revoke client invitations on their own projects
    if (currentUserRole === 'client') {
      if (invitation.role !== 'client') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Clients can only revoke client invitations' }),
        };
      }

      // Verify they are primary contact on this project
      const pcCheck = await query(
        `SELECT 1 FROM project_team
         WHERE project_id = $1 AND user_id = $2 AND is_primary_contact = true AND removed_at IS NULL`,
        [invitation.project_id, currentUserId]
      );

      if (pcCheck.rows.length === 0) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only the primary contact can revoke invitations' }),
        };
      }
    } else if (currentUserRole === 'team_member') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Team members cannot revoke invitations' }),
      };
    }

    // Revoke invitation
    await query(
      `UPDATE project_invitations
       SET status = 'revoked', updated_at = NOW()
       WHERE id = $1`,
      [invitationId]
    );

    console.log(`[Project Invitation] Revoked invitation ${invitationId} for ${invitation.email} by ${auth?.user?.email}`);

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
        error: 'Failed to revoke invitation',
      }),
    };
  }
});
