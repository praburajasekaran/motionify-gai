import crypto from 'crypto';
import { query } from './db';

export type ProposalReviewAccessStatus =
  | 'valid'
  | 'missing'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'mismatched_proposal'
  | 'tokenless_compatibility';

export interface ProposalReviewAccess {
  status: ProposalReviewAccessStatus;
  proposalId: string;
  tokenId?: string;
}

const TOKEN_BYTES = 32;
const DEFAULT_EXPIRY_DAYS = 30;

let ensured = false;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function ensureProposalReviewTokenTable() {
  if (ensured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS proposal_review_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'proposal_review',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
      expires_at TIMESTAMPTZ NOT NULL,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_proposal_review_tokens_proposal_id
    ON proposal_review_tokens(proposal_id)
  `);

  ensured = true;
}

export function isTokenlessProposalCompatibilityEnabled(): boolean {
  return process.env.PROPOSAL_TOKENLESS_COMPATIBILITY !== 'false';
}

export async function createProposalReviewToken(proposalId: string, expiresInDays = DEFAULT_EXPIRY_DAYS) {
  await ensureProposalReviewTokenTable();

  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const result = await query(
    `INSERT INTO proposal_review_tokens (proposal_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, expires_at`,
    [proposalId, tokenHash, expiresAt]
  );

  return {
    token: rawToken,
    tokenId: result.rows[0].id as string,
    expiresAt: result.rows[0].expires_at as string,
  };
}

export async function getLatestActiveProposalReviewToken(proposalId: string): Promise<string | null> {
  await ensureProposalReviewTokenTable();

  const result = await query(
    `SELECT id FROM proposal_review_tokens
     WHERE proposal_id = $1 AND status = 'active' AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [proposalId]
  );

  return result.rows[0]?.id || null;
}

export async function validateProposalReviewToken(
  proposalId: string,
  token?: string | null
): Promise<ProposalReviewAccess> {
  await ensureProposalReviewTokenTable();

  if (!token) {
    return {
      proposalId,
      status: isTokenlessProposalCompatibilityEnabled() ? 'tokenless_compatibility' : 'missing',
    };
  }

  const result = await query(
    `SELECT id, proposal_id, status, expires_at
     FROM proposal_review_tokens
     WHERE token_hash = $1 AND purpose = 'proposal_review'
     LIMIT 1`,
    [hashToken(token)]
  );

  if (result.rows.length === 0) {
    return { proposalId, status: 'invalid' };
  }

  const row = result.rows[0];
  if (row.proposal_id !== proposalId) {
    return { proposalId, tokenId: row.id, status: 'mismatched_proposal' };
  }

  if (row.status === 'revoked') {
    return { proposalId, tokenId: row.id, status: 'revoked' };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { proposalId, tokenId: row.id, status: 'expired' };
  }

  await query(`UPDATE proposal_review_tokens SET last_used_at = NOW() WHERE id = $1`, [row.id]);
  return { proposalId, tokenId: row.id, status: 'valid' };
}

export function proposalAccessAllowsPublicRead(access: ProposalReviewAccess): boolean {
  return access.status === 'valid' || access.status === 'tokenless_compatibility';
}

export function proposalAccessAllowsPublicMutation(access: ProposalReviewAccess): boolean {
  return access.status === 'valid';
}
