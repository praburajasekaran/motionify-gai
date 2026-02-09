/**
 * JWT Token Generation and Verification
 *
 * Provides stateless authentication using JSON Web Tokens:
 * - generateJWT: Create signed JWT with user claims
 * - verifyJWT: Validate JWT signature and expiration
 * - extractTokenFromCookie: Parse auth token from cookie header
 */

import * as jwt from 'jsonwebtoken';
import { createLogger } from './logger';

const logger = createLogger('jwt');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
const JWT_ISSUER = 'motionify-platform';
const JWT_AUDIENCE = 'motionify-users';

if (!process.env.JWT_SECRET) {
    logger.warn('JWT_SECRET not set - using default (INSECURE for production)');
}

// Token expiration times
const TOKEN_EXPIRY_DEFAULT = '24h';      // 24 hours
const TOKEN_EXPIRY_REMEMBER = '7d';      // 7 days

export interface JWTPayload {
    userId: string;
    email: string;
    role: 'super_admin' | 'support' | 'client' | 'team';
    fullName: string;
}

export interface JWTVerifyResult {
    valid: boolean;
    payload?: JWTPayload;
    error?: string;
}

/**
 * Generate a signed JWT token for authenticated user
 */
export function generateJWT(user: {
    id: string;
    email: string;
    role: string;
    full_name?: string;
    fullName?: string;
}, rememberMe: boolean = false): string {
    const payload: JWTPayload = {
        userId: user.id,
        email: user.email.toLowerCase(),
        role: user.role as any,
        fullName: user.full_name || user.fullName || user.email.split('@')[0],
    };

    const options: jwt.SignOptions = {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: rememberMe ? TOKEN_EXPIRY_REMEMBER : TOKEN_EXPIRY_DEFAULT,
    };

    return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify JWT token and extract payload
 */
export function verifyJWT(token: string): JWTVerifyResult {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        }) as JWTPayload;

        return {
            valid: true,
            payload: decoded,
        };
    } catch (error: any) {
        logger.warn('JWT verification failed', { error: error.message });

        let errorMessage = 'Invalid token';
        if (error.name === 'TokenExpiredError') {
            errorMessage = 'Token expired';
        } else if (error.name === 'JsonWebTokenError') {
            errorMessage = 'Malformed token';
        }

        return {
            valid: false,
            error: errorMessage,
        };
    }
}

/**
 * Extract auth token from Cookie header
 */
export function extractTokenFromCookie(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) return null;

    const match = cookieHeader.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Create Set-Cookie header value for auth token
 */
export function createAuthCookie(token: string, rememberMe: boolean): string {
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60; // seconds
    const isProduction = process.env.NODE_ENV === 'production';

    const cookieAttributes = [
        `auth_token=${token}`,
        'HttpOnly',
        'Path=/',
        `Max-Age=${maxAge}`,
        `Max-Age=${maxAge}`,
        `SameSite=${isProduction ? 'Strict' : 'Lax'}`,
    ];

    // Only set Secure flag in production (requires HTTPS)
    if (isProduction) {
        cookieAttributes.push('Secure');
    }

    return cookieAttributes.join('; ');
}

/**
 * Create Set-Cookie header to clear auth token (logout)
 */
export function createClearAuthCookie(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    return `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=${isProduction ? 'Strict' : 'Lax'}`;
}
