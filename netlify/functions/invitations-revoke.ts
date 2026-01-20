import pg from 'pg';

const { Client } = pg;

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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow DELETE
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Extract invitationId from path
  const pathParts = event.path.split('/');
  const invitationId = pathParts[pathParts.length - 1];

  if (!invitationId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invitation ID is required' }),
    };
  }

  const client = getDbClient();

  try {
    await client.connect();

    // Check if invitation exists and is pending
    const check = await client.query(
      `SELECT id, email, status FROM project_invitations WHERE id = $1`,
      [invitationId]
    );

    if (check.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invitation not found' }),
      };
    }

    const invitation = check.rows[0];

    if (invitation.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invitation has already been processed' }),
      };
    }

    // Revoke invitation
    await client.query(
      `UPDATE project_invitations 
       SET status = 'revoked', revoked_at = NOW() 
       WHERE id = $1`,
      [invitationId]
    );

    console.log(`Invitation revoked for ${invitation.email}`);

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
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await client.end();
  }
};
