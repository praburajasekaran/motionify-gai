/**
 * Shared Modules Index
 *
 * Re-exports all shared functionality for easy importing:
 * import { getPool, getCorsHeaders, requireAuth } from './_shared';
 */

// Database
export {
    getPool,
    getDbClient,
    query,
    transaction,
    closePool,
} from './db';
export type { PoolClient } from './db';

// CORS
export {
    getAllowedOrigins,
    isOriginAllowed,
    getCorsHeaders,
    handleCorsPrelight,
    createCorsError,
    validateCors,
} from './cors';

// Authentication
export {
    createJWT,
    verifyJWT,
    extractToken,
    authenticateRequest,
    hasRole,
    createUnauthorizedResponse,
    createForbiddenResponse,
    requireAuth,
    requireRole,
    requireAuthAndRole,
} from './auth';
export type {
    UserRole,
    JwtPayload,
    AuthenticatedUser,
    AuthResult,
} from './auth';

// Rate Limiting
export {
    RATE_LIMITS,
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    createRateLimitResponse,
    rateLimitMagicLink,
    rateLimitLogin,
    rateLimitApi,
    rateLimitStrict,
} from './rateLimit';
export type { RateLimitConfig, RateLimitResult } from './rateLimit';

// Validation
export {
    // Common schemas
    emailSchema,
    uuidSchema,
    passwordSchema,
    nameSchema,
    phoneSchema,
    urlSchema,
    dateSchema,
    paginationSchema,
    userRoleSchema,
    // Request schemas
    createUserSchema,
    updateUserSchema,
    magicLinkRequestSchema,
    magicLinkVerifySchema,
    projectSchema,
    taskSchema,
    commentSchema,
    deliverableSchema,
    paymentSchema,
    // Functions
    validate,
    parseJsonBody,
    createValidationErrorResponse,
    createBadRequestResponse,
    validateRequest,
    validateQueryParams,
    z,
} from './validation';
export type { ValidationResult } from './validation';

// Logging
export {
    createLogger,
    generateCorrelationId,
    getCorrelationId,
    logRequest,
    logResponse,
} from './logger';
export type { LogLevel } from './logger';

// Sentry Error Monitoring
export {
    initSentry,
    captureError,
    addBreadcrumb,
    flushSentry,
    setUser,
    clearUser,
    generateErrorId,
} from './sentry';

// Environment Validation
export {
    env,
    envWarnings,
    envValid,
    isProduction,
    isDevelopment,
    isDeployPreview,
    isBranchDeploy,
    validateEnv,
} from './env';
export type { Env } from './env';
