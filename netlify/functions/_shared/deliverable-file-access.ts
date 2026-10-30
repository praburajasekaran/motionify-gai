import { query } from './db';
import { getAuthRole, type AuthorizationUser } from './authorization';

type DeliverableFileOwner = {
  project_id: string;
  status: string;
  final_delivered_at?: string | Date | null;
};
export type DeliverableFileAccess = { beta: boolean; final: boolean };
type Query = (text: string, params?: unknown[]) => Promise<{ rows: { fully_paid: boolean }[] }>;

export async function getDeliverableFileAccess(
  user: AuthorizationUser | null | undefined,
  deliverable: DeliverableFileOwner,
  runQuery: Query = query,
): Promise<DeliverableFileAccess> {
  const role = getAuthRole(user);
  if (role === 'super_admin') return { beta: true, final: true };
  if (deliverable.final_delivered_at &&
      new Date(deliverable.final_delivered_at).getTime() + 365 * 24 * 60 * 60 * 1000 < Date.now()) {
    return { beta: false, final: false };
  }
  if (role !== 'client') return { beta: true, final: true };
  const beta = ['awaiting_approval', 'revision_requested', 'approved', 'final_delivered'].includes(deliverable.status);
  if (deliverable.status !== 'final_delivered') return { beta, final: false };
  const { rows } = await runQuery(`
    SELECT CASE WHEN p.proposal_id IS NULL THEN true ELSE
      COALESCE((SELECT SUM(pay.amount) FROM payments pay
        WHERE (pay.project_id = p.id OR pay.proposal_id = p.proposal_id)
          AND pay.status = 'completed' AND pay.currency = proposal.currency), 0) >= proposal.total_price
      END AS fully_paid
    FROM projects p LEFT JOIN proposals proposal ON proposal.id = p.proposal_id
    WHERE p.id = $1
  `, [deliverable.project_id]);
  return { beta, final: rows[0]?.fully_paid === true };
}
