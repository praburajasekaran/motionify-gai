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
      const { proposalId, projectId } = event.queryStringParameters || {};

      let query = 'SELECT * FROM payments ORDER BY created_at DESC';
      const params: any[] = [];

      if (proposalId) {
        query = 'SELECT * FROM payments WHERE proposal_id = $1 ORDER BY created_at DESC';
        params.push(proposalId);
      } else if (projectId) {
        query = 'SELECT * FROM payments WHERE project_id = $1 ORDER BY created_at DESC';
        params.push(projectId);
      }

      const result = await client.query(query, params);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      const pathParts = event.path.split('/');
      const action = pathParts[pathParts.length - 1];

      if (action === 'create-order') {
        const { proposalId, paymentType } = JSON.parse(event.body || '{}');

        if (!proposalId || !paymentType) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'proposalId and paymentType are required' }),
          };
        }

        if (!['advance', 'balance'].includes(paymentType)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'paymentType must be advance or balance' }),
          };
        }

        const proposalResult = await client.query(
          'SELECT * FROM proposals WHERE id = $1',
          [proposalId]
        );

        if (proposalResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Proposal not found' }),
          };
        }

        const proposal = proposalResult.rows[0];
        const amount = paymentType === 'advance' ? proposal.advance_amount : proposal.balance_amount;

        const result = await client.query(
          `INSERT INTO payments (
            proposal_id, payment_type, amount, currency, status
          ) VALUES ($1, $2, $3, $4, 'pending')
          RETURNING *`,
          [proposalId, paymentType, amount, proposal.currency]
        );

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      }

      if (action === 'verify') {
        const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = JSON.parse(event.body || '{}');

        if (!paymentId || !razorpayPaymentId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'paymentId and razorpayPaymentId are required' }),
          };
        }

        const result = await client.query(
          `UPDATE payments 
           SET razorpay_order_id = $1, 
               razorpay_payment_id = $2, 
               razorpay_signature = $3,
               status = 'completed',
               paid_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' }),
          };
        }

        const payment = result.rows[0];

        if (payment.payment_type === 'advance') {
          await client.query(
            `UPDATE inquiries SET status = 'paid' WHERE proposal_id = $1`,
            [payment.proposal_id]
          );
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action. Use /create-order or /verify' }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Payments API error:', error);
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
