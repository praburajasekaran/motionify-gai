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
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'proposal-detail') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Proposal ID is required' }),
    };
  }

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      const result = await client.query(
        `SELECT * FROM proposals WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Proposal not found' }),
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
        'description', 'deliverables', 'currency', 'total_price',
        'advance_percentage', 'advance_amount', 'balance_amount',
        'status', 'feedback'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          const value = key === 'deliverables' ? JSON.stringify(updates[key]) : updates[key];
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(value);
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
        UPDATE proposals 
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
          body: JSON.stringify({ error: 'Proposal not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0]),
      };
    }

    if (event.httpMethod === 'PATCH') {
      const { status, feedback } = JSON.parse(event.body || '{}');

      if (!status) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'status is required' }),
        };
      }

      const validStatuses = ['sent', 'accepted', 'rejected', 'changes_requested'];
      if (!validStatuses.includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `status must be one of: ${validStatuses.join(', ')}` }),
        };
      }

      const updateFields = ['status = $1', 'updated_at = NOW()'];
      const params: any[] = [status];
      let paramIndex = 2;

      if (status === 'accepted') {
        updateFields.push(`accepted_at = NOW()`);
      } else if (status === 'rejected') {
        updateFields.push(`rejected_at = NOW()`);
      }

      if (feedback) {
        updateFields.push(`feedback = $${paramIndex}`);
        params.push(feedback);
        paramIndex++;
      }

      params.push(id);

      const query = `
        UPDATE proposals 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Proposal not found' }),
        };
      }

      if (status === 'accepted') {
        await client.query(
          `UPDATE inquiries SET status = 'accepted' WHERE proposal_id = $1`,
          [id]
        );
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
    console.error('Proposal detail API error:', error);
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
};
