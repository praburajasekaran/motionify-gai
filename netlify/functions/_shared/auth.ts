/**
 * Shared Authentication Module
 *
 * Provides centralized authentication with:
 * - JWT verification and creation
 * - Role-based authorization middleware
 * - Session validation
 */

import crypto from 'crypto';
import { query } from './db';
import { getCorsHeaders } from './cors';

// JWT secret - MUST be set in production
function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET environment variable is required in production');
        }
        // Development fallback - log warning
        console.warn('[AUTH] WARNING: JWT_SECRET not set, using development fallback');
        return 'dev-only-secret-do-not-use-in-production-32chars';
    }

    return secret;
}

// User roles
export type UserRole = 'super_admin' | 'project_manager' | 'client' | 'team';

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

/**
 * Create a JWT token
 */
export function createJWT(payload: Omit<JwtPayload, 'exp'>, expiresInSeconds: number): string {
    const secret = getJwtSecret();
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const iat = Math.floor(Date.now() / 1000);
    const body = Buffer.from(JSON.stringify({ ...payload, exp, iat })).toString('base64url');
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string): JwtPayload | null {
    try {
        const secret = getJwtSecret();
        const parts = token.split('.');

        if (parts.length !== 3) {
            return null;
        }

        const [header, body, signature] = parts;

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${body}`)
            .digest('base64url');

        if (signature !== expectedSignature) {
            return null;
        }

        // Decode payload
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JwtPayload;

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Extract JWT token from Authorization header
 */
export function extractToken(headers: Record<string, string>): string | null {
    const authHeader = headers.authorization || headers.Authorization;

    if (!authHeader) {
        return null;
    }

    // Support "Bearer <token>" format
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    // Support plain token
    return authHeader;
}

/**
 * Authenticate a request and return user info
 * Validates JWT and optionally checks session in database
 */
export async function authenticateRequest(
    headers: Record<string, string>,
    validateSession = false
): Promise<AuthResult> {
    const token = extractToken(headers);

    if (!token) {
        return {
            success: false,
            error: {
                code: 'AUTH_MISSING',
                message: 'Authorization header is required',
            },
        };
    }

    const payload = verifyJWT(token);

    if (!payload) {
        return {
            success: false,
            error: {
                code: 'AUTH_INVALID',
                message: 'Invalid or expired token',
            },
        };
    }

    // Optionally validate session exists in database
    if (validateSession) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const sessionResult = await query(
            `SELECT id FROM sessions
             WHERE jwt_token_hash = $1
             AND expires_at > NOW()`,
            [tokenHash]
        );

        if (sessionResult.rows.length === 0) {
            return {
                success: false,
                error: {
                    code: 'SESSION_INVALID',
                    message: 'Session has expired or been invalidated',
                },
            };
        }
    }

    return {
        success: true,
        user: {
            id: payload.userId,
            email: payload.email,
            role: payload.role,
            fullName: payload.fullName,
        },
    };
}

/**
 * Check if user has required role(s)
 */
export function hasRole(user: AuthenticatedUser, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(user.role);
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(
    error: { code: string; message: string },
    origin?: string
): {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
} {
    return {
        statusCode: 401,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
            success: false,
            error,
        }),
    };
}

/**
 * Create a forbidden response (authenticated but not authorized)
 */
export function createForbiddenResponse(
    origin?: string
): {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
} {
    return {
        statusCode: 403,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'You do not have permission to perform this action',
            },
        }),
    };
}

/**
 * Middleware: Require authentication
 * Returns error response if not authenticated, null otherwise
 */
export async function requireAuth(event: {
    headers: Record<string, string>;
}): Promise<{
    success: true;
    user: AuthenticatedUser;
} | {
    success: false;
    response: {
        statusCode: number;
        headers: Record<string, string>;
        body: string;
    };
}> {
    const origin = event.headers.origin || event.headers.Origin;
    const authResult = await authenticateRequest(event.headers);

    if (!authResult.success || !authResult.user) {
        return {
            success: false,
            response: createUnauthorizedResponse(
                authResult.error || { code: 'AUTH_FAILED', message: 'Authentication failed' },
                origin
            ),
        };
    }

    return {
        success: true,
        user: authResult.user,
    };
}

/**
 * Middleware: Require specific role(s)
 * Must be called after requireAuth
 */
export function requireRole(
    user: AuthenticatedUser,
    allowedRoles: UserRole[],
    origin?: string
): {
    success: true;
} | {
    success: false;
    response: {
        statusCode: number;
        headers: Record<string, string>;
        body: string;
    };
} {
    if (!hasRole(user, allowedRoles)) {
        return {
            success: false,
            response: createForbiddenResponse(origin),
        };
    }

    return { success: true };
}

/**
 * Combined middleware: Require authentication and specific role(s)
 */
export async function requireAuthAndRole(
    event: { headers: Record<string, string> },
    allowedRoles: UserRole[]
): Promise<{
    success: true;
    user: AuthenticatedUser;
} | {
    success: false;
    response: {
        statusCode: number;
        headers: Record<string, string>;
        body: string;
    };
}> {
    const origin = event.headers.origin || event.headers.Origin;

    // Check authentication
    const authResult = await requireAuth(event);
    if (!authResult.success) {
        return authResult;
    }

    // Check role
    const roleResult = requireRole(authResult.user, allowedRoles, origin);
    if (!roleResult.success) {
        return roleResult;
    }

    return {
        success: true,
        user: authResult.user,
    };
}
