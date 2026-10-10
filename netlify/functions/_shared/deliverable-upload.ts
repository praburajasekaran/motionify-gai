import { query } from './db';
import { AuthorizationError, getAuthRole, getAuthUserId, requireDeliverableAccess, type AuthorizationOptions, type AuthorizationUser } from './authorization';
import { isAdminLike } from './roles';

export async function requireDeliverableUpload(user: AuthorizationUser | undefined, deliverableId: string, final: boolean, runner: NonNullable<AuthorizationOptions['runner']> = { query }) {
  const deliverable = await requireDeliverableAccess(user, deliverableId, { operation: 'deliverable.upload', runner });
  const project = await runner.query('SELECT status FROM projects WHERE id = $1 FOR SHARE', [deliverable.project_id]);
  const membership = await runner.query(`SELECT pt.user_id FROM project_team pt JOIN users u ON u.id = pt.user_id
    WHERE pt.project_id = $1 AND pt.user_id = $2 AND pt.role = 'team_member' AND pt.removed_at IS NULL
      AND u.role = 'team_member' AND u.is_active = true FOR SHARE OF pt, u`, [deliverable.project_id, getAuthUserId(user)]);
  const role = getAuthRole(user);
  if (role !== 'super_admin' && ['on_hold', 'archived', 'cancelled'].includes(project.rows[0]?.status)) {
    throw new AuthorizationError(403, 'FORBIDDEN', 'Deliverable', deliverableId);
  }
  if (isAdminLike(role)) return deliverable;
  if (role !== 'team_member' || !membership.rows.length || final || deliverable.assigned_to !== getAuthUserId(user)
    || !['pending', 'in_progress', 'beta_ready', 'revision_requested'].includes(deliverable.status)) {
    throw new AuthorizationError(403, 'FORBIDDEN', 'Deliverable', deliverableId);
  }
  return deliverable;
}
