import { query as dbQuery } from './db';
import { getCorsHeaders } from './cors';
import { createLogger } from './logger';
import { isAdminLike, isClientLike, isSuperAdmin, isTeamLike, normalizeRole } from './roles';

type QueryRunner = {
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount?: number | null }>;
};

export interface AuthorizationUser {
  userId?: string;
  id?: string;
  email?: string;
  role?: string;
  fullName?: string;
}

export interface AuthorizationOptions {
  operation?: string;
  runner?: QueryRunner;
}

const logger = createLogger('authorization');
const defaultRunner: QueryRunner = { query: dbQuery };

export class AuthorizationError extends Error {
  statusCode: number;
  code: 'NOT_FOUND' | 'FORBIDDEN';
  objectType: string;
  objectId?: string;

  constructor(statusCode: number, code: 'NOT_FOUND' | 'FORBIDDEN', objectType: string, objectId?: string) {
    super(code === 'NOT_FOUND' ? `${objectType} not found` : `Access denied to ${objectType}`);
    this.statusCode = statusCode;
    this.code = code;
    this.objectType = objectType;
    this.objectId = objectId;
  }
}

export function getAuthUserId(user?: AuthorizationUser | null): string | undefined {
  return user?.userId || user?.id;
}

export function getAuthRole(user?: AuthorizationUser | null) {
  return normalizeRole(user?.role);
}

export function createAuthorizationResponse(error: AuthorizationError, origin?: string) {
  return {
    statusCode: error.statusCode,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({
      error: {
        code: error.code,
        message: error.code === 'NOT_FOUND' ? `${error.objectType} not found` : 'Access denied',
      },
    }),
  };
}

export function logAuthorizationDenied(
  user: AuthorizationUser | undefined | null,
  objectType: string,
  objectId: string | undefined,
  operation = 'access'
) {
  logger.warn('Authorization denied', {
    endpoint: operation,
    objectType,
    objectId,
    userId: getAuthUserId(user),
    role: getAuthRole(user),
  });
}

function notFound(objectType: string, objectId?: string): never {
  throw new AuthorizationError(404, 'NOT_FOUND', objectType, objectId);
}

function forbidden(user: AuthorizationUser | undefined | null, objectType: string, objectId: string | undefined, operation?: string): never {
  logAuthorizationDenied(user, objectType, objectId, operation);
  throw new AuthorizationError(403, 'FORBIDDEN', objectType, objectId);
}

function runnerFrom(options?: AuthorizationOptions): QueryRunner {
  return options?.runner || defaultRunner;
}

async function hasActiveProjectMembership(runner: QueryRunner, projectId: string, userId: string): Promise<any | null> {
  const result = await runner.query(
    `SELECT role, is_primary_contact
     FROM project_team
     WHERE project_id = $1 AND user_id = $2 AND removed_at IS NULL
     LIMIT 1`,
    [projectId, userId]
  );
  return result.rows[0] || null;
}

export async function requireProjectAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  projectId: string,
  options?: AuthorizationOptions & { allowClient?: boolean; allowTeam?: boolean }
): Promise<T> {
  const runner = runnerFrom(options);
  const result = await runner.query<T>(
    `SELECT * FROM projects WHERE id = $1`,
    [projectId]
  );
  const project = result.rows[0] as any;
  if (!project) notFound('Project', projectId);

  const userId = getAuthUserId(user);
  const role = getAuthRole(user);
  if (isAdminLike(role)) return project;
  if (!userId) forbidden(user, 'Project', projectId, options?.operation);

  if (options?.allowClient !== false && isClientLike(role) && project.client_user_id === userId) {
    return project;
  }

  const membership = await hasActiveProjectMembership(runner, projectId, userId);
  if (membership) {
    const memberRole = normalizeRole(membership.role);
    if (options?.allowClient !== false && memberRole === 'client') return project;
    if (options?.allowTeam !== false && memberRole === 'team_member') return project;
    if (isAdminLike(memberRole)) return project;
  }

  forbidden(user, 'Project', projectId, options?.operation);
}

export async function requireProjectManagerAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  projectId: string,
  options?: AuthorizationOptions & { allowClientPrimary?: boolean }
): Promise<T> {
  const runner = runnerFrom(options);
  const project = await requireProjectAccess<T>(user, projectId, { ...options, allowClient: true, allowTeam: true });
  const role = getAuthRole(user);
  if (isAdminLike(role)) return project;

  const userId = getAuthUserId(user);
  if (!userId) forbidden(user, 'Project', projectId, options?.operation);

  const membership = await hasActiveProjectMembership(runner, projectId, userId);
  if (
    options?.allowClientPrimary &&
    role === 'client' &&
    membership?.is_primary_contact === true &&
    normalizeRole(membership.role) === 'client'
  ) {
    return project;
  }

  forbidden(user, 'Project', projectId, options?.operation);
}

export async function requireClientPrimaryContact<T = any>(
  user: AuthorizationUser | undefined | null,
  projectId: string,
  options?: AuthorizationOptions
): Promise<T> {
  const project = await requireProjectAccess<T>(user, projectId, { ...options, allowClient: true, allowTeam: false });
  const userId = getAuthUserId(user);
  const role = getAuthRole(user);

  if (!userId || role !== 'client') {
    forbidden(user, 'Project', projectId, options?.operation);
  }

  const membership = await hasActiveProjectMembership(runnerFrom(options), projectId, userId);
  if (membership?.is_primary_contact === true && normalizeRole(membership.role) === 'client') {
    return project;
  }

  forbidden(user, 'Project', projectId, options?.operation);
}

export async function requireProposalAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  proposalId: string,
  options?: AuthorizationOptions & { allowTeam?: boolean }
): Promise<T> {
  const runner = runnerFrom(options);
  const result = await runner.query<T>(
    `SELECT p.*,
            i.contact_email,
            i.client_user_id AS inquiry_client_user_id,
            pr.id AS project_id,
            pr.client_user_id AS project_client_user_id
     FROM proposals p
     LEFT JOIN inquiries i ON p.inquiry_id = i.id
     LEFT JOIN projects pr ON pr.proposal_id = p.id
     WHERE p.id = $1`,
    [proposalId]
  );
  const proposal = result.rows[0] as any;
  if (!proposal) notFound('Proposal', proposalId);

  const role = getAuthRole(user);
  if (isAdminLike(role)) return proposal;

  const userId = getAuthUserId(user);
  const email = user?.email?.toLowerCase();
  if (!userId) forbidden(user, 'Proposal', proposalId, options?.operation);

  if (
    isClientLike(role) &&
    (proposal.client_user_id === userId ||
      proposal.inquiry_client_user_id === userId ||
      proposal.project_client_user_id === userId ||
      (email && proposal.contact_email?.toLowerCase() === email))
  ) {
    return proposal;
  }

  if (options?.allowTeam !== false && proposal.project_id) {
    const membership = await hasActiveProjectMembership(runner, proposal.project_id, userId);
    if (membership && (isTeamLike(membership.role) || isAdminLike(membership.role))) {
      return proposal;
    }
  }

  forbidden(user, 'Proposal', proposalId, options?.operation);
}

export async function requireInquiryAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  inquiryIdOrNumber: string,
  options?: AuthorizationOptions & { allowTeam?: boolean }
): Promise<T> {
  const runner = runnerFrom(options);
  const lookupColumn = inquiryIdOrNumber.startsWith('INQ-') ? 'inquiry_number' : 'id';
  const result = await runner.query<T>(
    `SELECT i.*,
            p.client_user_id AS proposal_client_user_id,
            pr.id AS project_id,
            pr.client_user_id AS project_client_user_id
     FROM inquiries i
     LEFT JOIN proposals p ON p.inquiry_id = i.id OR p.id = i.proposal_id
     LEFT JOIN projects pr ON pr.inquiry_id = i.id OR pr.proposal_id = p.id
     WHERE i.${lookupColumn} = $1
     LIMIT 1`,
    [inquiryIdOrNumber]
  );
  const inquiry = result.rows[0] as any;
  if (!inquiry) notFound('Inquiry', inquiryIdOrNumber);

  const role = getAuthRole(user);
  if (isAdminLike(role)) return inquiry;

  const userId = getAuthUserId(user);
  const email = user?.email?.toLowerCase();
  if (!userId) forbidden(user, 'Inquiry', inquiryIdOrNumber, options?.operation);

  if (
    isClientLike(role) &&
    (inquiry.client_user_id === userId ||
      inquiry.proposal_client_user_id === userId ||
      inquiry.project_client_user_id === userId ||
      (email && inquiry.contact_email?.toLowerCase() === email))
  ) {
    return inquiry;
  }

  if (options?.allowTeam !== false && inquiry.project_id) {
    const membership = await hasActiveProjectMembership(runner, inquiry.project_id, userId);
    if (membership && (isTeamLike(membership.role) || isAdminLike(membership.role))) {
      return inquiry;
    }
  }

  forbidden(user, 'Inquiry', inquiryIdOrNumber, options?.operation);
}

export async function requireTaskAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  taskId: string,
  options?: AuthorizationOptions & { allowHiddenClientTask?: boolean }
): Promise<T> {
  const runner = runnerFrom(options);
  const result = await runner.query<T>(
    `SELECT t.*, p.client_user_id
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1`,
    [taskId]
  );
  const task = result.rows[0] as any;
  if (!task) notFound('Task', taskId);

  await requireProjectAccess(user, task.project_id, options);

  const role = getAuthRole(user);
  const userId = getAuthUserId(user);
  if (
    role === 'client' &&
    options?.allowHiddenClientTask !== true &&
    task.is_client_visible === false &&
    task.created_by !== userId
  ) {
    notFound('Task', taskId);
  }

  return task;
}

export async function requireCommentAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  commentId: string,
  options?: AuthorizationOptions
): Promise<T> {
  const runner = runnerFrom(options);
  const result = await runner.query<T>(
    `SELECT pc.*
     FROM proposal_comments pc
     WHERE pc.id = $1`,
    [commentId]
  );
  const comment = result.rows[0] as any;
  if (!comment) notFound('Comment', commentId);
  await requireProposalAccess(user, comment.proposal_id, options);
  return comment;
}

export async function requireDeliverableAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  deliverableId: string,
  options?: AuthorizationOptions
): Promise<T> {
  const runner = runnerFrom(options);
  const result = await runner.query<T>(
    `SELECT d.*, p.client_user_id
     FROM deliverables d
     JOIN projects p ON d.project_id = p.id
     WHERE d.id = $1`,
    [deliverableId]
  );
  const deliverable = result.rows[0] as any;
  if (!deliverable) notFound('Deliverable', deliverableId);
  await requireProjectAccess(user, deliverable.project_id, options);
  return deliverable;
}

export async function requirePaymentAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  paymentId: string,
  options?: AuthorizationOptions
): Promise<T> {
  const runner = runnerFrom(options);
  const result = await runner.query<T>(
    `SELECT pay.*,
            p.client_user_id AS proposal_client_user_id,
            i.contact_email,
            pr.id AS resolved_project_id,
            pr.client_user_id AS project_client_user_id
     FROM payments pay
     LEFT JOIN proposals p ON pay.proposal_id = p.id
     LEFT JOIN inquiries i ON p.inquiry_id = i.id
     LEFT JOIN projects pr ON pr.id = pay.project_id OR pr.proposal_id = p.id
     WHERE pay.id = $1
     LIMIT 1`,
    [paymentId]
  );
  const payment = result.rows[0] as any;
  if (!payment) notFound('Payment', paymentId);

  const role = getAuthRole(user);
  if (isAdminLike(role)) return payment;

  const userId = getAuthUserId(user);
  const email = user?.email?.toLowerCase();
  if (!userId) forbidden(user, 'Payment', paymentId, options?.operation);

  if (
    isClientLike(role) &&
    (payment.proposal_client_user_id === userId ||
      payment.project_client_user_id === userId ||
      (email && payment.contact_email?.toLowerCase() === email))
  ) {
    return payment;
  }

  const projectId = payment.project_id || payment.resolved_project_id;
  if (projectId) {
    await requireProjectAccess(user, projectId, options);
    return payment;
  }

  forbidden(user, 'Payment', paymentId, options?.operation);
}

export async function requireCommentAttachmentAccess<T = any>(
  user: AuthorizationUser | undefined | null,
  attachmentId: string,
  options?: AuthorizationOptions
): Promise<T> {
  const runner = runnerFrom(options);
  const result = await runner.query<T>(
    `SELECT ca.*, pc.proposal_id
     FROM comment_attachments ca
     JOIN proposal_comments pc ON ca.comment_id = pc.id
     WHERE ca.id = $1`,
    [attachmentId]
  );
  const attachment = result.rows[0] as any;
  if (!attachment) notFound('Attachment', attachmentId);
  await requireProposalAccess(user, attachment.proposal_id, options);
  return attachment;
}

export function assertAdminLike(user: AuthorizationUser | undefined | null, operation?: string) {
  if (!isAdminLike(user?.role)) {
    forbidden(user, 'Admin surface', undefined, operation);
  }
}

export function assertSuperAdmin(user: AuthorizationUser | undefined | null, operation?: string) {
  if (!isSuperAdmin(user?.role)) {
    forbidden(user, 'Super admin surface', undefined, operation);
  }
}
