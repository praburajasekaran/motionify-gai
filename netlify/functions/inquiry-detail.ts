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
  withCORS(['GET', 'PUT', 'OPTIONS']),
  withRateLimit(RATE_LIMITS.api, 'inquiry_detail')
)(async (event: NetlifyEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Inquiry ID is required' }),
    };
  }

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      // Support lookup by UUID or by inquiry_number (e.g., INQ-2026-001)
      const isInquiryNumber = id.startsWith('INQ-');
      const lookupColumn = isInquiryNumber ? 'inquiry_number' : 'id';

      const result = await client.query(
        `SELECT * FROM inquiries WHERE ${lookupColumn} = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Inquiry not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    if (event.httpMethod === 'PUT') {
      const updates = JSON.parse(event.body || '{}');

      const allowedFields = [
        'status', 'contact_name', 'contact_email', 'company_name',
        'contact_phone', 'project_notes', 'proposal_id', 'assigned_to_admin_id'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(updates[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No valid fields to update' }),
        };
      }

      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE inquiries 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(id);

      const result = await client.query(query, updateValues);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Inquiry not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Inquiry detail API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await client.end();
  }
});
