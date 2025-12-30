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

interface ProposalDeliverable {
  id: string;
  name: string;
  description: string;
  estimatedCompletionWeek: number;
}

interface CreateProposalPayload {
  inquiryId: string;
  description: string;
  deliverables: ProposalDeliverable[];
  currency: 'INR' | 'USD';
  totalPrice: number;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const client = getDbClient();

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      const { inquiryId } = event.queryStringParameters || {};

      let query = 'SELECT * FROM proposals ORDER BY created_at DESC';
      const params: any[] = [];

      if (inquiryId) {
        query = 'SELECT * FROM proposals WHERE inquiry_id = $1 ORDER BY created_at DESC';
        params.push(inquiryId);
      }

      const result = await client.query(query, params);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      const payload: CreateProposalPayload = JSON.parse(event.body || '{}');

      if (!payload.inquiryId || !payload.description || !payload.deliverables || payload.deliverables.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'inquiryId, description, and deliverables are required' }),
        };
      }

      if (![40, 50, 60].includes(payload.advancePercentage)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'advancePercentage must be 40, 50, or 60' }),
        };
      }

      const result = await client.query(
        `INSERT INTO proposals (
          inquiry_id, description, deliverables, currency, total_price,
          advance_percentage, advance_amount, balance_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          payload.inquiryId,
          payload.description,
          JSON.stringify(payload.deliverables),
          payload.currency,
          payload.totalPrice,
          payload.advancePercentage,
          payload.advanceAmount,
          payload.balanceAmount,
        ]
      );

      await client.query(
        `UPDATE inquiries SET proposal_id = $1, status = 'proposal_sent' WHERE id = $2`,
        [result.rows[0].id, payload.inquiryId]
      );

      return {
        statusCode: 201,
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
    console.error('Proposals API error:', error);
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
