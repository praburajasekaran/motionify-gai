// API client for user management endpoints

import { safeJsonParse } from '../utils/api-helpers';
import { API_BASE } from '../utils/api-config';

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'super_admin' | 'project_manager' | 'client' | 'team';
    avatar_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface CreateUserData {
    email: string;
    full_name: string;
    role: 'super_admin' | 'project_manager' | 'client' | 'team';
}

export interface UpdateUserData {
    full_name?: string;
    role?: 'super_admin' | 'project_manager' | 'client' | 'team';
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
    try {
        const response = await fetch(`${API_BASE}/users-create`, {
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
                error: result.error || 'Failed to create user',
            };
        }

        return {
            success: true,
            user: result.user,
        };
    } catch (error: any) {
        console.error('Error creating user:', error);
        return {
            success: false,
            error: error.message || 'Failed to create user',
        };
    }
}

/**
 * List all users (admin only)
 * GET /api/users
 */
export async function listUsers(params?: ListUsersParams): Promise<{ success: boolean; users?: User[]; total?: number; error?: string }> {
    try {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.role) queryParams.append('role', params.role);
        if (params?.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        const url = `${API_BASE}/users-list${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
        });

        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to list users',
            };
        }

        return {
            success: true,
            users: result.users,
            total: result.total,
        };
    } catch (error: any) {
        console.error('Error listing users:', error);
        return {
            success: false,
            error: error.message || 'Failed to list users',
        };
    }
}

/**
 * Get a specific user by ID
 * GET /api/users/:id
 */
export async function getUser(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/users-get/${userId}`, {
            method: 'GET',
            credentials: 'include',
        });

        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to get user',
            };
        }

        return {
            success: true,
            user: result.user,
        };
    } catch (error: any) {
        console.error('Error getting user:', error);
        return {
            success: false,
            error: error.message || 'Failed to get user',
        };
    }
}

/**
 * Update a user
 * PATCH /api/users/:id
 */
export async function updateUser(userId: string, data: UpdateUserData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/users-update/${userId}`, {
            method: 'PATCH',
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
                error: result.error || 'Failed to update user',
            };
        }

        return {
            success: true,
            user: result.user,
        };
    } catch (error: any) {
        console.error('Error updating user:', error);
        return {
            success: false,
            error: error.message || 'Failed to update user',
        };
    }
}

/**
 * Deactivate a user (soft delete, admin only)
 * DELETE /api/users/:id
 */
export async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/users-delete/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        const result = await safeJsonParse(response);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || 'Failed to deactivate user',
            };
        }

        return {
            success: true,
        };
    } catch (error: any) {
        console.error('Error deactivating user:', error);
        return {
            success: false,
            error: error.message || 'Failed to deactivate user',
        };
    }
}

/**
 * Update current user's profile
 * PATCH /api/users/me
 */
export async function updateMyProfile(data: { full_name?: string; avatar_url?: string }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/users-me-update`, {
            method: 'PATCH',
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
                error: result.error || 'Failed to update profile',
            };
        }

        return {
            success: true,
            user: result.user,
        };
    } catch (error: any) {
        console.error('Error updating profile:', error);
        return {
            success: false,
            error: error.message || 'Failed to update profile',
        };
    }
}
