import pg from 'pg';
import { compose, withCORS, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { requireAuthFromCookie, type CookieAuthResult } from './_shared/auth';

const { Client } = pg;

async function logActivity(dbClient: pg.Client, params: {
  type: string;
  userId: string;
  userName: string;
  inquiryId?: string;
  details?: Record<string, string | number>;
}) {
  try {
    await dbClient.query(
      `INSERT INTO activities (type, user_id, user_name, inquiry_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.type, params.userId, params.userName,
       params.inquiryId || null,
       JSON.stringify(params.details || {})]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

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

    // Conditional authentication: GET and PUT require auth, POST is public
    let auth: CookieAuthResult | null = null;
    if (event.httpMethod === 'GET' || event.httpMethod === 'PUT') {
      auth = await requireAuthFromCookie(event);

      if (!auth.authorized) {
        return {
          statusCode: auth.statusCode || 401,
          headers,
          body: JSON.stringify({
            error: auth.error || 'Authentication required'
          }),
        };
      }
    }
    // POST requests proceed without auth (public contact form)

    if (event.httpMethod === 'GET') {
      const { clientUserId } = event.queryStringParameters || {};

      // auth is guaranteed to be non-null and authorized for GET
      const userRole = auth!.user?.role;
      const userId = auth!.user?.userId;
      const isAdmin = userRole === 'super_admin' || userRole === 'project_manager';

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

        const inquiry = result.rows[0];

        // Ownership check for individual lookup: admins can access any, clients only their own
        if (!isAdmin && inquiry.client_user_id && inquiry.client_user_id !== userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Cannot access this inquiry' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(inquiry),
        };
      }

      // Listing inquiries - apply role-based access control
      // Listing all inquiries (no clientUserId filter) requires admin role
      if (!clientUserId && !isAdmin) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Admin access required to list all inquiries' }),
        };
      }

      // If client is filtering by clientUserId, verify it matches their own ID
      if (clientUserId && !isAdmin && clientUserId !== userId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Cannot access other users inquiries' }),
        };
      }

      // Build query based on filters
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
      const body = JSON.parse(event.body || '{}');

      // Detect if this is an admin-created inquiry (has contactName) or public form (has name)
      const isAdminPayload = 'contactName' in body;

      if (isAdminPayload) {
        // Admin-created inquiry (from NewInquiryModal)
        const validation = validateRequest(event.body, SCHEMAS.inquiry.createAdmin, origin);
        if (!validation.success) return validation.response;
        const payload = validation.data;

        const inquiryNumber = await generateInquiryNumber(client);

        const result = await client.query(
          `INSERT INTO inquiries (
            inquiry_number, contact_name, contact_email, company_name,
            contact_phone, project_notes, quiz_answers, recommended_video_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            inquiryNumber,
            payload.contactName,
            payload.contactEmail,
            payload.companyName || null,
            payload.contactPhone || null,
            payload.projectNotes || null,
            JSON.stringify(payload.quizAnswers),
            payload.recommendedVideoType,
          ]
        );

        // Log activity - try to get admin auth context
        let adminAuth: CookieAuthResult | null = null;
        try {
          adminAuth = await requireAuthFromCookie(event);
        } catch { /* public form, no auth */ }

        await logActivity(client, {
          type: 'INQUIRY_CREATED',
          userId: adminAuth?.user?.userId || '',
          userName: adminAuth?.user?.fullName || payload.contactName,
          inquiryId: result.rows[0].id,
          details: { inquiryNumber, source: 'admin' },
        });

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      } else {
        // Public contact form inquiry
        const validation = validateRequest(event.body, SCHEMAS.inquiry.create, origin);
        if (!validation.success) return validation.response;
        const payload = validation.data;

        const inquiryNumber = await generateInquiryNumber(client);

        // Create default quiz answers for public form submissions
        const defaultQuizAnswers = {
          niche: payload.projectType || 'General',
          audience: 'General',
          style: 'Professional',
          mood: 'Informative',
          duration: 'Medium (1-3 min)',
        };

        const result = await client.query(
          `INSERT INTO inquiries (
            inquiry_number, contact_name, contact_email, company_name,
            contact_phone, project_notes, quiz_answers, recommended_video_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            inquiryNumber,
            payload.name,
            payload.email,
            payload.company || null,
            null, // contact_phone - schema doesn't include phone
            payload.message || null,
            JSON.stringify(defaultQuizAnswers),
            payload.projectType || 'Explainer Video',
          ]
        );

        // Log activity for public form
        await logActivity(client, {
          type: 'INQUIRY_CREATED',
          userId: '',
          userName: payload.name,
          inquiryId: result.rows[0].id,
          details: { inquiryNumber, source: 'public' },
        });

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      }
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

      // Pre-fetch old status for activity logging
      const isInquiryNumberLookup = id.startsWith('INQ-');
      const lookupCol = isInquiryNumberLookup ? 'inquiry_number' : 'id';
      const oldInquiryResult = await client.query(
        `SELECT status, inquiry_number, id FROM inquiries WHERE ${lookupCol} = $1`,
        [id]
      );
      const oldInquiryStatus = oldInquiryResult.rows[0]?.status;
      const inquiryNumber = oldInquiryResult.rows[0]?.inquiry_number;
      const inquiryUuid = oldInquiryResult.rows[0]?.id;

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

      // Log activity if status changed
      if (updates.status && oldInquiryStatus !== updates.status) {
        await logActivity(client, {
          type: 'INQUIRY_STATUS_CHANGED',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          inquiryId: inquiryUuid || result.rows[0].id,
          details: { oldStatus: oldInquiryStatus || '', newStatus: updates.status, inquiryNumber: inquiryNumber || '' },
        });
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
