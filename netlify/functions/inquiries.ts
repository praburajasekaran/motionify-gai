import pg from 'pg';
import { compose, withCORS, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';

const { Client } = pg;

interface QuizSelections {
  niche?: string | null;
  audience?: string | null;
  style?: string | null;
  mood?: string | null;
  duration?: string | null;
}

interface CreateInquiryPayload {
  contactName: string;
  contactEmail: string;
  companyName?: string;
  contactPhone?: string;
  projectNotes?: string;
  quizAnswers: QuizSelections;
  recommendedVideoType: string;
  clientUserId?: string;
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

const generateInquiryNumber = async (client: pg.Client): Promise<string> => {
  const year = new Date().getFullYear();

  const result = await client.query(
    `SELECT inquiry_number FROM inquiries 
     WHERE inquiry_number LIKE $1 
     ORDER BY inquiry_number DESC LIMIT 1`,
    [`INQ-${year}-%`]
  );

  let maxNumber = 0;
  if (result.rows.length > 0) {
    const match = result.rows[0].inquiry_number.match(/INQ-\d{4}-(\d+)/);
    if (match) {
      maxNumber = parseInt(match[1], 10);
    }
  }

  const nextNumber = maxNumber + 1;
  return `INQ-${year}-${String(nextNumber).padStart(3, '0')}`;
};

export const handler = compose(
  withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
  withRateLimit(RATE_LIMITS.api, 'inquiries')
)(async (event: NetlifyEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      const { clientUserId } = event.queryStringParameters || {};

      // Check if we're fetching a specific inquiry by ID
      const pathParts = event.path.split('/');
      const potentialId = pathParts[pathParts.length - 1];

      // If the last path segment looks like an ID (UUID or inquiry number), fetch that specific inquiry
      if (potentialId && potentialId !== 'inquiries' && potentialId !== 'api') {
        const isInquiryNumber = potentialId.startsWith('INQ-');
        const lookupColumn = isInquiryNumber ? 'inquiry_number' : 'id';

        const result = await client.query(
          `SELECT * FROM inquiries WHERE ${lookupColumn} = $1`,
          [potentialId]
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

      // Otherwise, list all inquiries
      let query = 'SELECT * FROM inquiries ORDER BY created_at DESC';
      const params: any[] = [];

      if (clientUserId) {
        query = `
          SELECT i.* FROM inquiries i
          LEFT JOIN proposals p ON i.id = p.inquiry_id
          WHERE i.client_user_id = $1 OR (p.client_user_id = $1 AND i.client_user_id IS NULL)
          ORDER BY i.created_at DESC
        `;
        params.push(clientUserId);
      }

      const result = await client.query(query, params);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      const validation = validateRequest(event.body, SCHEMAS.inquiry.create, origin);
      if (!validation.success) return validation.response;
      const payload = validation.data;

      const inquiryNumber = await generateInquiryNumber(client);

      const result = await client.query(
        `INSERT INTO inquiries (
          inquiry_number, contact_name, contact_email, company_name,
          contact_phone, project_notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          inquiryNumber,
          payload.name,
          payload.email,
          payload.company || null,
          null, // contact_phone - schema doesn't include phone
          payload.message || null,
        ]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    if (event.httpMethod === 'PUT') {
      // Extract ID from path (e.g., /api/inquiries/123 or /.netlify/functions/inquiries/123)
      const pathParts = event.path.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id || id === 'inquiries') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Inquiry ID is required' }),
        };
      }

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

      // Support lookup by UUID or by inquiry_number
      const isInquiryNumber = id.startsWith('INQ-');
      const lookupColumn = isInquiryNumber ? 'inquiry_number' : 'id';

      const query = `
        UPDATE inquiries 
        SET ${updateFields.join(', ')}
        WHERE ${lookupColumn} = $${paramIndex}
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
    console.error('Inquiries API error:', error);
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
