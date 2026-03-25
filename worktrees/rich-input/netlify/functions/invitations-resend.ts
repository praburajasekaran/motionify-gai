import pg from 'pg';
import { compose, withCORS, withSuperAdmin, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
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
  withSuperAdmin(),
  withRateLimit(RATE_LIMITS.apiStrict, 'invitation_resend')
)(async (event: NetlifyEvent) => {
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

  const client = getDbClient();

  try {
    await client.connect();

    // Find pending invitation
    const result = await client.query(
      `SELECT id, email, token, expires_at FROM project_invitations 
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

    // Resend email (log in development)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/invitation/accept?token=${invitation.token}`;
    console.log(`[Mock Email] Resent invitation to ${invitation.email}:`);
    console.log(`  Link: ${inviteLink}`);
    console.log(`  Expires: ${new Date(invitation.expires_at).toISOString()}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Resend invitation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to resend invitation',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await client.end();
  }
});
