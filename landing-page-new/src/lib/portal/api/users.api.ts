// API client for user management endpoints

import { apiGet, apiPost, apiPatch, apiDelete, buildUrlWithParams } from '../utils/api-transformers';
import { API_BASE } from '../utils/api-config';

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'super_admin' | 'support' | 'client' | 'team';
    avatar_url?: string;
    timezone?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface CreateUserData {
    email: string;
    full_name: string;
    role: 'super_admin' | 'support' | 'client' | 'team';
}

export interface UpdateUserData {
    full_name?: string;
    role?: 'super_admin' | 'support' | 'client' | 'team';
    avatar_url?: string;
}

export interface ListUsersParams {
    status?: 'active' | 'inactive';
    role?: string;
    search?: string;
}

/**
 * Create a new user (admin only)
 * POST /api/users
 */
export async function createUser(data: CreateUserData): Promise<{ success: boolean; user?: User; error?: string }> {
    return apiPost<{ success: boolean; user?: User; error?: string }>(
        `${API_BASE}/users-create`,
        data,
        {
            defaultError: 'Failed to create user',
            operationName: 'creating user',
        }
    );
}

/**
 * List all users (admin only)
 * GET /api/users
 */
export async function listUsers(params?: ListUsersParams): Promise<{ success: boolean; users?: User[]; total?: number; error?: string }> {
    return apiGet<{ success: boolean; users?: User[]; total?: number; error?: string }>(
        `${API_BASE}/users-list`,
        params as Record<string, string | number | boolean | undefined>,
        {
            defaultError: 'Failed to list users',
            operationName: 'listing users',
        }
    );
}

/**
 * Get a specific user by ID
 * GET /api/users/:id
 */
export async function getUser(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    return apiGet<{ success: boolean; user?: User; error?: string }>(
        `${API_BASE}/users-get/${userId}`,
        undefined,
        {
            defaultError: 'Failed to get user',
            operationName: 'getting user',
        }
    );
}

/**
 * Update a user
 * PATCH /api/users/:id
 */
export async function updateUser(userId: string, data: UpdateUserData): Promise<{ success: boolean; user?: User; error?: string }> {
    return apiPatch<{ success: boolean; user?: User; error?: string }>(
        `${API_BASE}/users-update/${userId}`,
        data,
        {
            defaultError: 'Failed to update user',
            operationName: 'updating user',
        }
    );
}

/**
 * Deactivate a user (soft delete, admin only)
 * DELETE /api/users/:id
 */
export async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    return apiDelete<{ success: boolean; error?: string }>(
        `${API_BASE}/users-delete/${userId}`,
        {
            defaultError: 'Failed to deactivate user',
            operationName: 'deactivating user',
        }
    );
}

/**
 * Update current user's profile
 * PATCH /api/users/me
 */
export async function updateMyProfile(data: { full_name?: string; avatar_url?: string }): Promise<{ success: boolean; user?: User; error?: string }> {
    return apiPatch<{ success: boolean; user?: User; error?: string }>(
        `${API_BASE}/users-me-update`,
        data,
        {
            defaultError: 'Failed to update profile',
            operationName: 'updating profile',
        }
    );
}
