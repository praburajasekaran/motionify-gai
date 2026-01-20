// API client for project invitation endpoints

import { apiGet, apiPost, apiDelete } from '../utils/api-transformers';
import { API_BASE } from '../utils/api-config';

export interface ProjectInvitation {
    id: string;
    project_id: string;
    email: string;
    role: 'client' | 'team';
    status: 'pending' | 'accepted' | 'revoked' | 'expired';
    expires_at: string;
    created_at: string;
    invited_by_name?: string;
}

export interface CreateInvitationData {
    email: string;
    role: 'client' | 'team';
}

export interface AcceptInvitationData {
    full_name?: string;
}

/**
 * Create a project team invitation
 * POST /api/projects/:projectId/invitations
 */
export async function createInvitation(
    projectId: string,
    data: CreateInvitationData
): Promise<{ success: boolean; invitation?: ProjectInvitation; error?: string }> {
    return apiPost<{ success: boolean; invitation?: ProjectInvitation; error?: string }>(
        `${API_BASE}/invitations-create/${projectId}`,
        data,
        {
            defaultError: 'Failed to create invitation',
            operationName: 'creating invitation',
        }
    );
}

/**
 * List all invitations for a project
 * GET /api/projects/:projectId/invitations
 */
export async function listInvitations(
    projectId: string,
    status?: string
): Promise<{ success: boolean; invitations?: ProjectInvitation[]; total?: number; error?: string }> {
    return apiGet<{ success: boolean; invitations?: ProjectInvitation[]; total?: number; error?: string }>(
        `${API_BASE}/invitations-list/${projectId}`,
        status ? { status } : undefined,
        {
            defaultError: 'Failed to list invitations',
            operationName: 'listing invitations',
        }
    );
}

/**
 * Accept a project team invitation (public endpoint)
 * POST /api/invitations/:token/accept
 */
export async function acceptInvitation(
    token: string,
    data?: AcceptInvitationData
): Promise<{ success: boolean; project?: { id: string; name: string }; user_id?: string; error?: string; requires_signup?: boolean }> {
    return apiPost<{ success: boolean; project?: { id: string; name: string }; user_id?: string; error?: string; requires_signup?: boolean }>(
        `${API_BASE}/invitations-accept/${token}`,
        data || {},
        {
            defaultError: 'Failed to accept invitation',
            operationName: 'accepting invitation',
        }
    );
}

/**
 * Revoke a project team invitation
 * DELETE /api/invitations/:invitationId
 */
export async function revokeInvitation(
    invitationId: string
): Promise<{ success: boolean; error?: string }> {
    return apiDelete<{ success: boolean; error?: string }>(
        `${API_BASE}/invitations-revoke/${invitationId}`,
        {
            defaultError: 'Failed to revoke invitation',
            operationName: 'revoking invitation',
        }
    );
}

/**
 * Resend a project team invitation email
 * POST /api/invitations/:invitationId/resend
 */
export async function resendInvitation(
    invitationId: string
): Promise<{ success: boolean; error?: string }> {
    return apiPost<{ success: boolean; error?: string }>(
        `${API_BASE}/invitations-resend/${invitationId}/resend`,
        undefined,
        {
            defaultError: 'Failed to resend invitation',
            operationName: 'resending invitation',
        }
    );
}
