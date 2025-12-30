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
      const result = await client.query(
        `SELECT * FROM inquiries ORDER BY created_at DESC`
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      const payload: CreateInquiryPayload = JSON.parse(event.body || '{}');

      if (!payload.contactName || !payload.contactEmail) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'contactName and contactEmail are required' }),
        };
      }

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
          payload.contactEmail.toLowerCase(),
          payload.companyName || null,
          payload.contactPhone || null,
          payload.projectNotes || null,
          JSON.stringify(payload.quizAnswers),
          payload.recommendedVideoType,
        ]
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
};
