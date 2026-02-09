import pg from 'pg';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
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
  withCORS(['GET', 'OPTIONS']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'dashboard-metrics')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Only super_admin or support can access dashboard metrics
  const userRole = auth?.user?.role;
  if (userRole !== 'super_admin' && userRole !== 'support') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden: Admin access required' }),
    };
  }

  const client = getDbClient();

  try {
    await client.connect();

    // GET - Fetch aggregated platform metrics
    if (event.httpMethod === 'GET') {
      // Use separate subqueries to avoid cartesian product issues
      const query = `
        SELECT
          (SELECT COUNT(*) FROM projects) as total_projects,
          (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
          (SELECT COUNT(*) FROM proposals) as total_proposals,
          (SELECT COUNT(*) FROM proposals WHERE status = 'sent') as pending_proposals,
          (SELECT COUNT(*) FROM proposals WHERE status = 'accepted') as accepted_proposals,
          (SELECT COUNT(*) FROM payments) as total_payments,
          (SELECT COUNT(*) FROM payments WHERE status = 'completed') as completed_payments,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'pending') as pending_revenue,
          (SELECT COUNT(*) FROM inquiries) as total_inquiries,
          (SELECT COUNT(*) FROM inquiries WHERE status = 'new') as new_inquiries,
          (SELECT COUNT(*) FROM deliverables WHERE status = 'awaiting_approval') as pending_deliverables
      `;

      const result = await client.query(query);
      const row = result.rows[0];

      // Transform snake_case to camelCase
      const metrics = {
        totalProjects: parseInt(row.total_projects, 10),
        activeProjects: parseInt(row.active_projects, 10),
        totalProposals: parseInt(row.total_proposals, 10),
        pendingProposals: parseInt(row.pending_proposals, 10),
        acceptedProposals: parseInt(row.accepted_proposals, 10),
        totalPayments: parseInt(row.total_payments, 10),
        completedPayments: parseInt(row.completed_payments, 10),
        totalRevenue: parseFloat(row.total_revenue),
        pendingRevenue: parseFloat(row.pending_revenue),
        totalInquiries: parseInt(row.total_inquiries, 10),
        newInquiries: parseInt(row.new_inquiries, 10),
        pendingDeliverables: parseInt(row.pending_deliverables, 10),
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(metrics),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Dashboard metrics API error:', error);
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
