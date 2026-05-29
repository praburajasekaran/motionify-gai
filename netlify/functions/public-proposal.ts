import { query as dbQuery } from './_shared/db';
import { compose, withCORS, withRateLimit, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import {
  proposalAccessAllowsPublicMutation,
  proposalAccessAllowsPublicRead,
  validateProposalReviewToken,
} from './_shared/proposal-review-access';

const PROPOSAL_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getProposalId(event: NetlifyEvent): string | null {
  const lastPart = event.path.split('/').filter(Boolean).pop();
  return lastPart && PROPOSAL_ID_RE.test(lastPart) ? lastPart : null;
}

function denied(status: string, headers: Record<string, string>) {
  const statusCode = status === 'missing' || status === 'tokenless_compatibility' ? 401 : 403;
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      error: 'Proposal review link unavailable',
      accessStatus: status,
      message: 'This proposal link is invalid, expired, or no longer available. Please request a fresh link.',
    }),
  };
}

export const handler = compose(
  withCORS(['GET', 'PATCH', 'OPTIONS']),
  withRateLimit(RATE_LIMITS.api, 'public_proposal')
)(async (event: NetlifyEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);
  const proposalId = getProposalId(event);

  if (!proposalId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Proposal ID is required' }) };
  }

  const token = event.queryStringParameters?.token || null;
  const access = await validateProposalReviewToken(proposalId, token);

  if (event.httpMethod === 'GET') {
    if (!proposalAccessAllowsPublicRead(access)) {
      return denied(access.status, headers);
    }

    const result = await dbQuery('SELECT * FROM proposals WHERE id = $1', [proposalId]);
    if (result.rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Proposal not found' }) };
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Cache-Control': 'private, max-age=300' },
      body: JSON.stringify({ proposal: result.rows[0], accessStatus: access.status }),
    };
  }

  if (event.httpMethod === 'PATCH') {
    if (!proposalAccessAllowsPublicMutation(access)) {
      return denied(access.status, headers);
    }

    const { status, feedback } = JSON.parse(event.body || '{}');
    const allowedStatuses = ['rejected', 'changes_requested'];
    if (!allowedStatuses.includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `status must be one of: ${allowedStatuses.join(', ')}` }),
      };
    }

    const params: any[] = [status, proposalId];
    const feedbackSql = feedback ? ', feedback = $3' : '';
    if (feedback) params.push(feedback);

    const result = await dbQuery(
      `UPDATE proposals
       SET status = $1, updated_at = NOW()${feedbackSql}
       WHERE id = $2
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Proposal not found' }) };
    }

    await dbQuery(
      `UPDATE inquiries SET status = $1 WHERE proposal_id = $2`,
      [status === 'changes_requested' ? 'negotiating' : 'rejected', proposalId]
    );

    return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
});
