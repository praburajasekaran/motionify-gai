/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and deployment verification.
 * Checks:
 * - Database connectivity
 * - Required environment variables
 * - External service configuration (R2, Resend, Razorpay)
 */

import {
    query,
    getCorsHeaders,
    createLogger,
    generateCorrelationId,
} from './_shared';

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
}

interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    checks: {
        database: { status: 'pass' | 'fail'; latencyMs?: number; error?: string };
        environment: { status: 'pass' | 'fail'; missing?: string[] };
        services: {
            email: { status: 'pass' | 'warn' | 'fail'; configured: boolean };
            storage: { status: 'pass' | 'warn' | 'fail'; configured: boolean };
            payment: { status: 'pass' | 'warn' | 'fail'; configured: boolean };
        };
    };
}

// Required environment variables
const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
];

// Optional but recommended environment variables
const RECOMMENDED_ENV_VARS = [
    'RESEND_API_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
];

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
    const correlationId = generateCorrelationId();
    const logger = createLogger('health', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const healthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
            database: { status: 'pass' },
            environment: { status: 'pass' },
            services: {
                email: { status: 'pass', configured: false },
                storage: { status: 'pass', configured: false },
                payment: { status: 'pass', configured: false },
            },
        },
    };

    // Check database connectivity
    try {
        const startTime = Date.now();
        await query('SELECT 1');
        const latencyMs = Date.now() - startTime;
        healthStatus.checks.database = { status: 'pass', latencyMs };
    } catch (error: any) {
        healthStatus.checks.database = {
            status: 'fail',
            error: error.message || 'Database connection failed',
        };
        healthStatus.status = 'unhealthy';
        logger.error('Health check: Database connection failed', error);
    }

    // Check required environment variables
    const missingRequired: string[] = [];
    for (const envVar of REQUIRED_ENV_VARS) {
        if (!process.env[envVar]) {
            missingRequired.push(envVar);
        }
    }

    if (missingRequired.length > 0) {
        healthStatus.checks.environment = {
            status: 'fail',
            missing: missingRequired,
        };
        healthStatus.status = 'unhealthy';
        logger.error('Health check: Missing required environment variables', undefined, { missing: missingRequired });
    }

    // Check email service (Resend)
    const resendConfigured = !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
    healthStatus.checks.services.email = {
        status: resendConfigured ? 'pass' : 'warn',
        configured: resendConfigured,
    };
    if (!resendConfigured && healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
    }

    // Check storage service (R2)
    const r2Configured = !!(
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
    );
    healthStatus.checks.services.storage = {
        status: r2Configured ? 'pass' : 'warn',
        configured: r2Configured,
    };
    if (!r2Configured && healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
    }

    // Check payment service (Razorpay)
    const razorpayConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    healthStatus.checks.services.payment = {
        status: razorpayConfigured ? 'pass' : 'warn',
        configured: razorpayConfigured,
    };
    if (!razorpayConfigured && healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
    }

    // Determine HTTP status code based on health
    const httpStatus = healthStatus.status === 'unhealthy' ? 503 : 200;

    logger.info('Health check completed', {
        status: healthStatus.status,
        database: healthStatus.checks.database.status,
    });

    return {
        statusCode: httpStatus,
        headers: {
            ...headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify(healthStatus),
    };
};
