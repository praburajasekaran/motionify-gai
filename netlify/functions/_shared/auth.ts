/**
 * Shared Authentication Module
 *
 * Provides centralized cookie-based authentication with:
 * - JWT verification via jsonwebtoken library (see jwt.ts)
 * - Role-based authorization middleware
 */

import { getCorsHeaders } from './cors';
import { verifyJWT as verifyJWTFromLib, extractTokenFromCookie } from './jwt';
import { createLogger } from './logger';

const logger = createLogger('auth-middleware');

// User roles
export type UserRole = 'super_admin' | 'support' | 'client' | 'team';

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
        role: string;
        fullName: string;
    };
    error?: string;
    statusCode?: number;
}

export interface NetlifyEvent {
    headers: Record<string, string>;
    [key: string]: any;
}

/**
 * Extract and verify JWT from request cookies (httpOnly cookie-based auth)
 */
export async function requireAuthFromCookie(event: NetlifyEvent): Promise<CookieAuthResult> {
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

    return {
        authorized: true,
        user: {
            userId: result.payload!.userId,
            email: result.payload!.email,
            role: result.payload!.role,
            fullName: result.payload!.fullName,
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

    const allowedRoles = ['super_admin', 'support'];
    if (!allowedRoles.includes(auth.user!.role)) {
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
