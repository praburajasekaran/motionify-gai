import pg from 'pg';
import { compose, withCORS, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';

const { Client } = pg;

const getDbClient = () => {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }

  return new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
};

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

  const client = getDbClient();

  try {
    await client.connect();

    // Find and validate invitation
    // Must be pending and not expired
    const result = await client.query(
      `SELECT pi.*, p.id as project_id, p.title as project_name, p.project_number
       FROM project_invitations pi
       JOIN projects p ON pi.project_id = p.id
       WHERE pi.token = $1 
       AND pi.status = 'pending' 
       AND pi.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired invitation' }),
      };
    }

    const invitation = result.rows[0];

    // Check if user already exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [invitation.email]
    );

    const requiresSignup = userCheck.rows.length === 0;
    const acceptedByUserId = userCheck.rows[0]?.id || null;

    // Mark invitation as accepted
    await client.query(
      `UPDATE project_invitations
       SET status = 'accepted', accepted_at = NOW(), accepted_by = $2
       WHERE id = $1`,
      [invitation.id, acceptedByUserId]
    );

    // If user exists, add them to project_team
    if (acceptedByUserId) {
      await client.query(
        `INSERT INTO project_team (user_id, project_id, role, invitation_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, project_id) DO UPDATE SET
           removed_at = NULL, removed_by = NULL, invitation_id = $4`,
        [acceptedByUserId, invitation.project_id, invitation.role, invitation.id]
      );

      // Log activity
      try {
        const userName = await client.query('SELECT full_name FROM users WHERE id = $1', [acceptedByUserId]);
        await client.query(
          `INSERT INTO activities (type, user_id, user_name, project_id, details)
           VALUES ('TEAM_MEMBER_ADDED', $1, $2, $3, $4)`,
          [
            acceptedByUserId,
            userName.rows[0]?.full_name || 'Unknown',
            invitation.project_id,
            JSON.stringify({ role: invitation.role, viaInvitation: true }),
          ]
        );
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        project: {
          id: invitation.project_id,
          name: invitation.project_name,
        },
        user_id: acceptedByUserId,
        requires_signup: requiresSignup,
      }),
    };
  } catch (error) {
    console.error('Accept invitation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to accept invitation',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await client.end();
  }
});
