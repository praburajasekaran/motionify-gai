/**
 * Transform database user object (snake_case) to frontend AuthUser format (camelCase)
 */
import type { AuthUser } from '../types/auth.types';

interface DatabaseUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    avatar_url?: string | null;
    profile_picture_url?: string | null;
    created_at?: string | Date;
    updated_at?: string | Date;
    last_login_at?: string | Date | null;
    is_active?: boolean;
    status?: string;
    preferences?: any;
}

/**
 * Transform a database user object to AuthUser format
 */
export function transformUser(dbUser: DatabaseUser | null | undefined): AuthUser | null {
    if (!dbUser) {
        return null;
    }

    return {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.full_name || '',
        role: dbUser.role as any,
        avatarUrl: dbUser.avatar_url || dbUser.profile_picture_url || null,
        preferences: dbUser.preferences || {
            emailNotifications: true,
            mentionNotifications: true,
            approvalNotifications: true,
        },
        status: (dbUser.status || (dbUser.is_active ? 'active' : 'deactivated')) as any,
        isFirstLogin: !dbUser.last_login_at,
        createdAt: dbUser.created_at ? new Date(dbUser.created_at) : new Date(),
        updatedAt: dbUser.updated_at ? new Date(dbUser.updated_at) : new Date(),
        lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : null,
        deactivatedAt: null,
        metadata: {},
    };
}


