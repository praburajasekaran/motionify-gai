// API client for project invitation endpoints

import { safeJsonParse } from '../utils/api-helpers';
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
    try {
        const response = await fetch(`${API_BASE}/invitations-create/${projectId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to create invitation',
            };
        }

        return {
            success: true,
            invitation: result.invitation,
        };
    } catch (error: any) {
        console.error('Error creating invitation:', error);
        return {
            success: false,
            error: error.message || 'Failed to create invitation',
        };
    }
}

/**
 * List all invitations for a project
 * GET /api/projects/:projectId/invitations
 */
export async function listInvitations(
    projectId: string,
    status?: string
): Promise<{ success: boolean; invitations?: ProjectInvitation[]; total?: number; error?: string }> {
    try {
        const queryParams = new URLSearchParams();
        if (status) queryParams.append('status', status);

        const queryString = queryParams.toString();
        const url = `${API_BASE}/invitations-list/${projectId}${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
        });

        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to list invitations',
            };
        }

        return {
            success: true,
            invitations: result.invitations,
            total: result.total,
        };
    } catch (error: any) {
        console.error('Error listing invitations:', error);
        return {
            success: false,
            error: error.message || 'Failed to list invitations',
        };
    }
}

/**
 * Accept a project team invitation (public endpoint)
 * POST /api/invitations/:token/accept
 */
export async function acceptInvitation(
    token: string,
    data?: AcceptInvitationData
): Promise<{ success: boolean; project?: { id: string; name: string }; user_id?: string; error?: string; requires_signup?: boolean }> {
    try {
        const response = await fetch(`${API_BASE}/invitations-accept/${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data || {}),
        });

        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to accept invitation',
                requires_signup: result.requires_signup,
            };
        }

        return {
            success: true,
            project: result.project,
            user_id: result.user_id,
        };
    } catch (error: any) {
        console.error('Error accepting invitation:', error);
        return {
            success: false,
            error: error.message || 'Failed to accept invitation',
        };
    }
}

/**
 * Revoke a project team invitation
 * DELETE /api/invitations/:invitationId
 */
export async function revokeInvitation(
    invitationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/invitations-revoke/${invitationId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to revoke invitation',
            };
        }

        return {
            success: true,
        };
    } catch (error: any) {
        console.error('Error revoking invitation:', error);
        return {
            success: false,
            error: error.message || 'Failed to revoke invitation',
        };
    }
}

/**
 * Resend a project team invitation email
 * POST /api/invitations/:invitationId/resend
 */
export async function resendInvitation(
    invitationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/invitations-resend/${invitationId}/resend`, {
            method: 'POST',
            credentials: 'include',
        });

        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to resend invitation',
            };
        }

        return {
            success: true,
        };
    } catch (error: any) {
        console.error('Error resending invitation:', error);
        return {
            success: false,
            error: error.message || 'Failed to resend invitation',
        };
    }
}
