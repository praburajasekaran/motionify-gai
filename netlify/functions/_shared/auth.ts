/**
 * Shared Authentication Module
 *
 * Provides centralized cookie-based authentication with:
 * - JWT verification via jsonwebtoken library (see jwt.ts)
 * - Role-based authorization middleware
 */

import { getCorsHeaders } from './cors';
import { verifyJWT as verifyJWTFromLib, extractTokenFromCookie, hashJWT } from './jwt';
import { createLogger } from './logger';
import { normalizeRole, type CanonicalUserRole } from './roles';
import { query } from './db';

const logger = createLogger('auth-middleware');

// User roles
export type UserRole = CanonicalUserRole;

// JWT payload structure
export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    fullName: string;
    exp: number;
    iat?: number;
}

// Authenticated user info
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
    sessionId: string;
}

// Auth result
export interface AuthResult {
    success: boolean;
    user?: AuthenticatedUser;
    error?: {
        code: string;
        message: string;
    };
}

// ==========================================
// Cookie-Based Authentication
// ==========================================

export interface CookieAuthResult {
    authorized: boolean;
    user?: {
        userId: string;
        email: string;
        role: UserRole;
        fullName: string;
        sessionId: string;
    };
    error?: string;
    statusCode?: number;
}

export interface NetlifyEvent {
    headers: Record<string, string>;
    [key: string]: any;
}

export interface SessionQueryRunner {
    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
}

/**
 * Extract and verify JWT from request cookies (httpOnly cookie-based auth)
 */
export async function requireAuthFromCookie(
    event: NetlifyEvent,
    runner: SessionQueryRunner = { query }
): Promise<CookieAuthResult> {
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    const token = extractTokenFromCookie(cookieHeader);

    if (!token) {
        return {
            authorized: false,
            error: 'No authentication token provided',
            statusCode: 401,
        };
    }

    const result = verifyJWTFromLib(token);

    if (!result.valid) {
        return {
            authorized: false,
            error: result.error || 'Invalid authentication token',
            statusCode: 401,
        };
    }

    let sessionResult: { rows: any[] };
    try {
        sessionResult = await runner.query(
            `SELECT
                s.id AS session_id,
                u.id,
                u.email,
                u.full_name,
                u.role,
                u.is_active
             FROM sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.jwt_token_hash = $1
               AND s.expires_at > NOW()
             LIMIT 1`,
            [hashJWT(token)]
        );
    } catch (error) {
        logger.error('Session lookup failed', error);
        return {
            authorized: false,
            error: 'Authentication service unavailable',
            statusCode: 503,
        };
    }

    const currentUser = sessionResult.rows[0];
    if (!currentUser || currentUser.is_active !== true) {
        return {
            authorized: false,
            error: 'Authentication session is invalid or expired',
            statusCode: 401,
        };
    }

    const normalizedRole = normalizeRole(currentUser.role);
    if (normalizedRole === 'unknown') {
        return {
            authorized: false,
            error: 'Invalid authentication role',
            statusCode: 401,
        };
    }

    return {
        authorized: true,
        user: {
            userId: currentUser.id,
            email: currentUser.email,
            role: normalizedRole,
            fullName: currentUser.full_name,
            sessionId: currentUser.session_id,
        },
    };
}

/**
 * Verify user is Super Admin (cookie-based)
 */
export async function requireSuperAdmin(event: NetlifyEvent): Promise<CookieAuthResult> {
    const auth = await requireAuthFromCookie(event);

    if (!auth.authorized) {
        return auth;
    }

    if (auth.user!.role !== 'super_admin') {
        logger.warn('Forbidden: Super Admin required', {
            userId: auth.user!.userId,
            role: auth.user!.role,
        });

        return {
            authorized: false,
            error: 'Forbidden: Super Admin access required',
            statusCode: 403,
        };
    }

    return auth;
}

/**
 * Verify user is Support or Super Admin (cookie-based)
 */
export async function requireSupport(event: NetlifyEvent): Promise<CookieAuthResult> {
    const auth = await requireAuthFromCookie(event);

    if (!auth.authorized) {
        return auth;
    }

    const allowedRoles: UserRole[] = ['super_admin', 'support'];
    if (!allowedRoles.includes(normalizeRole(auth.user!.role) as UserRole)) {
        logger.warn('Forbidden: Support required', {
            userId: auth.user!.userId,
            role: auth.user!.role,
        });

        return {
            authorized: false,
            error: 'Forbidden: Support or Super Admin access required',
            statusCode: 403,
        };
    }

    return auth;
}

/**
 * Create standardized unauthorized response for cookie-based auth
 */
export function createUnauthorizedResponseForCookie(auth: CookieAuthResult, origin?: string) {
    const headers = getCorsHeaders(origin);

    return {
        statusCode: auth.statusCode || 401,
        headers,
        body: JSON.stringify({
            error: {
                code: auth.statusCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
                message: auth.error || 'Authentication required',
            },
        }),
    };
}
