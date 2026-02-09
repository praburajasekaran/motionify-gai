import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { query, transaction } from './_shared/db';
import { maskSupportName } from './_shared/displayName';

/**
 * Project Team API
 *
 * GET  /.netlify/functions/project-team/{projectId}          - List team members + pending invitations
 * DELETE /.netlify/functions/project-team/{projectId}/{userId} - Soft-remove a team member
 */
export const handler = compose(
  withCORS(['GET', 'DELETE']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'project_team')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Parse path: /project-team/{projectId} or /project-team/{projectId}/{userId}
  const pathParts = event.path.split('/').filter(Boolean);
  // pathParts might be: [".netlify", "functions", "project-team", projectId] or [..., projectId, userId]
  const funcIndex = pathParts.findIndex(p => p === 'project-team');
  const projectId = funcIndex >= 0 ? pathParts[funcIndex + 1] : undefined;
  const targetUserId = funcIndex >= 0 ? pathParts[funcIndex + 2] : undefined;

  if (!projectId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Project ID is required' }),
    };
  }

  // ── GET: List team members and pending invitations ──
  if (event.httpMethod === 'GET') {
    try {
      // Fetch active team members
      const membersResult = await query(
        `SELECT pt.id, pt.user_id, pt.role, pt.is_primary_contact, pt.added_at,
                u.full_name, u.email, u.profile_picture_url
         FROM project_team pt
         JOIN users u ON pt.user_id = u.id
         WHERE pt.project_id = $1 AND pt.removed_at IS NULL
         ORDER BY pt.is_primary_contact DESC, pt.added_at ASC`,
        [projectId]
      );

      // Fetch pending invitations
      const invitationsResult = await query(
        `SELECT pi.id, pi.email, pi.role, pi.status, pi.created_at, pi.expires_at,
                u.full_name as invited_by_name
         FROM project_invitations pi
         LEFT JOIN users u ON pi.invited_by = u.id
         WHERE pi.project_id = $1 AND pi.status = 'pending' AND pi.expires_at > NOW()
         ORDER BY pi.created_at DESC`,
        [projectId]
      );

      const requesterRole = auth?.user?.role || '';
      const members = membersResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: maskSupportName(row.full_name || 'Unknown', row.role, requesterRole),
        email: row.email || '',
        avatar: row.profile_picture_url || '',
        role: row.role,
        isPrimaryContact: row.is_primary_contact,
        addedAt: row.added_at,
      }));

      const pendingInvitations = invitationsResult.rows.map(row => ({
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        invitedByName: row.invited_by_name,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ members, pendingInvitations }),
      };
    } catch (error) {
      console.error('Project team GET error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch project team' }),
      };
    }
  }

  // ── DELETE: Soft-remove a team member ──
  if (event.httpMethod === 'DELETE') {
    if (!targetUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID to remove is required' }),
      };
    }

    const currentUserId = auth?.user?.userId;
    const currentUserRole = auth?.user?.role;

    // Cannot remove self
    if (targetUserId === currentUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: { code: 'CANNOT_REMOVE_SELF', message: 'You cannot remove yourself from the project' },
        }),
      };
    }

    try {
      // Check target membership exists and is active
      const memberResult = await query(
        `SELECT pt.id, pt.role, pt.is_primary_contact, u.full_name
         FROM project_team pt
         JOIN users u ON pt.user_id = u.id
         WHERE pt.project_id = $1 AND pt.user_id = $2 AND pt.removed_at IS NULL`,
        [projectId, targetUserId]
      );

      if (memberResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Team member not found or already removed' }),
        };
      }

      const targetMember = memberResult.rows[0];

      // Support users are auto-assigned to all projects and cannot be removed
      if (targetMember.role === 'support') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: { code: 'CANNOT_REMOVE_SUPPORT', message: 'Support users are automatically assigned to all projects and cannot be removed.' },
          }),
        };
      }

      // Cannot remove primary contact
      if (targetMember.is_primary_contact) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: { code: 'CANNOT_REMOVE_PRIMARY', message: 'Cannot remove the primary contact. Transfer ownership first.' },
          }),
        };
      }

      // Cannot remove last PM/admin on the project
      if (targetMember.role === 'support' || targetMember.role === 'super_admin') {
        const adminCount = await query(
          `SELECT COUNT(*) as count FROM project_team
           WHERE project_id = $1 AND removed_at IS NULL
           AND role IN ('support', 'super_admin')
           AND user_id != $2`,
          [projectId, targetUserId]
        );

        if (parseInt(adminCount.rows[0].count) === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: { code: 'CANNOT_REMOVE_LAST_PM', message: 'Cannot remove the last project manager/admin from the project' },
            }),
          };
        }
      }

      // Permission check: who can remove whom
      if (currentUserRole === 'client') {
        // Client primary contact can only remove other clients
        if (targetMember.role !== 'client') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Clients can only remove other client team members' }),
          };
        }
      } else if (currentUserRole === 'team_member') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Team members cannot remove other members' }),
        };
      }
      // super_admin and support can remove anyone (already checked above constraints)

      // Soft-delete the member
      await query(
        `UPDATE project_team SET removed_at = NOW(), removed_by = $1
         WHERE project_id = $2 AND user_id = $3 AND removed_at IS NULL`,
        [currentUserId, projectId, targetUserId]
      );

      // Log activity
      try {
        await query(
          `INSERT INTO activities (type, user_id, user_name, target_user_id, target_user_name, project_id, details)
           VALUES ('TEAM_MEMBER_REMOVED', $1, $2, $3, $4, $5, $6)`,
          [
            currentUserId,
            auth?.user?.fullName || 'Unknown',
            targetUserId,
            targetMember.full_name,
            projectId,
            JSON.stringify({ role: targetMember.role }),
          ]
        );
      } catch (logError) {
        console.error('Failed to log activity:', logError);
        // Don't fail the main operation
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    } catch (error) {
      console.error('Project team DELETE error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to remove team member' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
});
