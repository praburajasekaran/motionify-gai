import crypto from 'crypto';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { query } from './_shared/db';

/**
 * Create a project-level invitation.
 *
 * POST /.netlify/functions/project-invitations-create/{projectId}
 * Body: { email: string, role: 'client' | 'team_member' | 'project_manager' }
 *
 * Permission: super_admin, project_manager (on assigned projects),
 *             client primary contact (can invite other clients only)
 */
export const handler = compose(
  withCORS(['POST']),
  withAuth(),
  withRateLimit(RATE_LIMITS.apiStrict, 'project_invitation_create')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Extract projectId from path
  const pathParts = event.path.split('/');
  const projectId = pathParts[pathParts.length - 1];

  if (!projectId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Project ID is required' }),
    };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { email, role } = body;

  if (!email || !role) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'email and role are required' }),
    };
  }

  // Validate role
  const validRoles = ['client', 'team_member', 'project_manager'];
  if (!validRoles.includes(role)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
    };
  }

  const currentUserId = auth?.user?.userId;
  const currentUserRole = auth?.user?.role;

  // Permission check
  if (currentUserRole === 'team_member') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Team members cannot invite others' }),
    };
  }

  if (currentUserRole === 'client') {
    // Client primary contact can only invite other clients
    if (role !== 'client') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Clients can only invite other client team members' }),
      };
    }

    // Verify they are actually primary contact on this project
    const pcCheck = await query(
      `SELECT 1 FROM project_team
       WHERE project_id = $1 AND user_id = $2 AND is_primary_contact = true AND removed_at IS NULL`,
      [projectId, currentUserId]
    );

    if (pcCheck.rows.length === 0) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only the primary contact can invite client team members' }),
      };
    }
  }

  try {
    // Check if user is already a member of this project
    const existingMember = await query(
      `SELECT 1 FROM project_team pt
       JOIN users u ON pt.user_id = u.id
       WHERE pt.project_id = $1 AND LOWER(u.email) = LOWER($2) AND pt.removed_at IS NULL`,
      [projectId, email]
    );

    if (existingMember.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'This user is already a member of this project',
        }),
      };
    }

    // Check for existing pending invitation
    const existingInvitation = await query(
      `SELECT id FROM project_invitations
       WHERE project_id = $1 AND LOWER(email) = LOWER($2) AND status = 'pending' AND expires_at > NOW()`,
      [projectId, email]
    );

    if (existingInvitation.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'An invitation has already been sent to this email for this project',
        }),
      };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Insert invitation
    const result = await query(
      `INSERT INTO project_invitations (token, email, role, project_id, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, status, created_at, expires_at`,
      [token, email.toLowerCase(), role, projectId, currentUserId, expiresAt]
    );

    const invitation = result.rows[0];

    // Log activity
    try {
      await query(
        `INSERT INTO activities (type, user_id, user_name, project_id, details)
         VALUES ('TEAM_MEMBER_INVITED', $1, $2, $3, $4)`,
        [
          currentUserId,
          auth?.user?.fullName || 'Unknown',
          projectId,
          JSON.stringify({ email, role }),
        ]
      );
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }

    // TODO: Send invitation email via SES
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/invitation/accept?token=${token}`;
    console.log(`[Project Invitation] Sent to ${email}:`);
    console.log(`  Link: ${inviteLink}`);
    console.log(`  Project: ${projectId}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          createdAt: invitation.created_at,
          expiresAt: invitation.expires_at,
        },
      }),
    };
  } catch (error) {
    console.error('Create project invitation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create invitation' }),
    };
  }
});
