import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

// Valid client roles
const VALID_ROLES = ['client', 'team'];

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  path: string;
  queryStringParameters: Record<string, string> | null;
}

interface NetlifyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

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

export const handler = async (
  event: NetlifyEvent
): Promise<NetlifyResponse> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

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

  // Parse request body
  let payload: { email?: string; role?: string };
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { email, role } = payload;

  // Validation
  if (!email || !role) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Email and role are required' }),
    };
  }

  if (!VALID_ROLES.includes(role)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid role. Must be "client" or "team"' }),
    };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid email format' }),
    };
  }

  const client = getDbClient();

  try {
    await client.connect();

    // Check if invitation already exists
    const existingCheck = await client.query(
      `SELECT id FROM project_invitations 
       WHERE project_id = $1 AND email = $2 AND status = 'pending'
       AND expires_at > NOW()`,
      [projectId, email.toLowerCase()]
    );

    if (existingCheck.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'An invitation has already been sent to this email' }),
      };
    }

    // Generate secure token (valid for 7 days)
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Insert invitation
    const result = await client.query(
      `INSERT INTO project_invitations (project_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project_id, email, role, status, expires_at, created_at`,
      [projectId, email.toLowerCase(), role, token, null, expiresAt]
    );

    const invitation = result.rows[0];

    // TODO: Send email with invitation link
    // For development, log the invitation link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/invitation/accept?token=${token}`;
    console.log(`[Mock Email] Invitation sent to ${email}:`);
    console.log(`  Link: ${inviteLink}`);
    console.log(`  Expires: ${expiresAt.toISOString()}`);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          project_id: invitation.project_id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          invited_by_name: undefined,
        },
      }),
    };
  } catch (error) {
    console.error('Create invitation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create invitation',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await client.end();
  }
};
