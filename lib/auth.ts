/**
 * Authentication Library
 *
 * Provides authentication utilities for the frontend:
 * - Magic link request/verification
 * - Token storage and retrieval
 * - Session management
 */

import { API_BASE } from './api-config';
import { User, UserRole } from '../types';

// Storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const EXPIRES_KEY = 'auth_expires';

// Development mode check
const isDevelopment = import.meta.env.DEV;

export interface MagicLinkRequestBody {
    email: string;
    rememberMe?: boolean;
}

export interface MagicLinkRequestResponse {
    success: boolean;
    message: string;
    error?: any;
}

export interface MagicLinkVerifyResponse {
    success: boolean;
    data?: {
        user: User;
        token?: string;  // Optional - only for backwards compatibility
        expiresAt: string;
        inquiryCreated?: boolean;
        inquiryId?: string;
        inquiryNumber?: string;
    };
    message?: string;
    error?: any;
}

export interface AuthSession {
    user: User;
    token?: string;  // Optional - now using httpOnly cookies
    expiresAt: string;
}

/**
 * Transform DB user to Frontend User
 */
function transformUser(dbUser: any): User {
    return {
        id: dbUser.id,
        name: dbUser.fullName || dbUser.full_name || dbUser.name,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        avatar:
            dbUser.avatarUrl ||
            dbUser.avatar_url ||
            dbUser.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.fullName || dbUser.full_name || dbUser.name)}`,
        projectTeamMemberships: dbUser.project_team_memberships || dbUser.projectTeamMemberships || {},
    };
}

/**
 * Get the current auth token
 */
export function getAuthToken(): string | null {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const expiresAt = localStorage.getItem(EXPIRES_KEY);

        if (!token || !expiresAt) {
            return null;
        }

        // Check if token is expired
        if (new Date(expiresAt) < new Date()) {
            clearAuthSession();
            return null;
        }

        return token;
    } catch {
        return null;
    }
}

/**
 * Get the current authenticated user
 */
export function getStoredUser(): User | null {
    try {
        const userStr = localStorage.getItem(USER_KEY);
        const expiresAt = localStorage.getItem(EXPIRES_KEY);

        if (!userStr || !expiresAt) {
            return null;
        }

        // Check if session is expired
        if (new Date(expiresAt) < new Date()) {
            clearAuthSession();
            return null;
        }

        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

/**
 * Store auth session data
 */
export function storeAuthSession(session: AuthSession): void {
    try {
        if (session.token) {
            localStorage.setItem(TOKEN_KEY, session.token);
        }
        localStorage.setItem(USER_KEY, JSON.stringify(session.user));
        localStorage.setItem(EXPIRES_KEY, session.expiresAt);
    } catch (error) {
        console.error('Failed to store auth session:', error);
    }
}

/**
 * Clear auth session data
 */
export function clearAuthSession(): void {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(EXPIRES_KEY);
        // Also clear legacy mock session
        localStorage.removeItem('mockSession');
    } catch (error) {
        console.error('Failed to clear auth session:', error);
    }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return getAuthToken() !== null;
}

/**
 * Get auth headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
    const token = getAuthToken();
    if (token) {
        return {
            Authorization: `Bearer ${token}`,
        };
    }
    return {};
}

/**
 * Request a magic link for passwordless login
 */
export async function requestMagicLink(body: MagicLinkRequestBody): Promise<MagicLinkRequestResponse> {
    try {
        const response = await fetch(`${API_BASE}/auth-request-magic-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error?.message || 'Failed to request magic link',
                error: data.error,
            };
        }

        return {
            success: true,
            message: data.message || 'Magic link sent',
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'Network error',
            error: error,
        };
    }
}

/**
 * Verify a magic link token and create session
 */
export async function verifyMagicLink(token: string, email?: string): Promise<MagicLinkVerifyResponse> {
    try {
        const response = await fetch(`${API_BASE}/auth-verify-magic-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',  // Required for browser to accept Set-Cookie
            body: JSON.stringify({ token, email }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || { message: 'Verification failed' },
                message: data.message,
            };
        }

        // The backend should return the user in the data object
        const responseData = data.data || data;
        const user = transformUser(responseData.user);

        // Store user info in localStorage (token is now in httpOnly cookie)
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(EXPIRES_KEY, responseData.expiresAt);

        return {
            success: true,
            data: {
                user,
                expiresAt: responseData.expiresAt,
                inquiryCreated: responseData.inquiryCreated,
                inquiryId: responseData.inquiryId,
                inquiryNumber: responseData.inquiryNumber,
            },
            message: data.message,
        };
    } catch (error: any) {
        console.error('Verification error:', error);
        return {
            success: false,
            error: { message: error.message },
            message: 'Verification failed',
        };
    }
}

/**
 * Logout - clear session
 */
export function logout(): void {
    clearAuthSession();
}
