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

    // Mark invitation as accepted
    await client.query(
      `UPDATE project_invitations 
       SET status = 'accepted', accepted_at = NOW() 
       WHERE id = $1`,
      [invitation.id]
    );

    // Check if user already exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [invitation.email]
    );

    const requiresSignup = userCheck.rows.length === 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        project: {
          id: invitation.project_id,
          name: invitation.project_name,
        },
        user_id: userCheck.rows[0]?.id,
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
