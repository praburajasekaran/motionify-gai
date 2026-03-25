/**
 * Shared Structured Logging Module
 *
 * Provides centralized logging with:
 * - Structured JSON output for production
 * - Correlation IDs for request tracing
 * - Sensitive data redaction
 * - Log levels (debug, info, warn, error)
 */

import crypto from 'crypto';
import { addBreadcrumb } from './sentry';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log entry structure
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    correlationId?: string;
    function?: string;
    userId?: string;
    data?: Record<string, any>;
    error?: {
        message: string;
        stack?: string;
        code?: string;
    };
}

// Sensitive fields to redact
const SENSITIVE_FIELDS = [
    'password',
    'token',
    'jwt',
    'secret',
    'authorization',
    'cookie',
    'apikey',
    'api_key',
    'credit_card',
    'ssn',
    'email', // Partial redaction
];

// Environment
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')) as LogLevel;

// Log level priorities
const LOG_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
    return LOG_PRIORITY[level] >= LOG_PRIORITY[logLevel];
}

/**
 * Redact sensitive data from an object
 */
function redactSensitive(obj: any, depth = 0): any {
    if (depth > 10) return '[MAX_DEPTH]';
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => redactSensitive(item, depth + 1));
    }

    if (typeof obj === 'object') {
        const result: Record<string, any> = {};

        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();

            if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
                if (lowerKey.includes('email') && typeof value === 'string') {
                    // Partial email redaction: keep first 2 chars and domain
                    const parts = value.split('@');
                    if (parts.length === 2) {
                        result[key] = `${parts[0].slice(0, 2)}***@${parts[1]}`;
                    } else {
                        result[key] = '[REDACTED]';
                    }
                } else {
                    result[key] = '[REDACTED]';
                }
            } else {
                result[key] = redactSensitive(value, depth + 1);
            }
        }

        return result;
    }

    return obj;
}

/**
 * Format error for logging
 */
function formatError(error: unknown): LogEntry['error'] {
    if (error instanceof Error) {
        return {
            message: error.message,
            stack: isProduction ? undefined : error.stack,
            code: (error as any).code,
        };
    }

    return {
        message: String(error),
    };
}

/**
 * Generate a correlation ID
 */
export function generateCorrelationId(): string {
    return crypto.randomUUID();
}

/**
 * Extract correlation ID from headers
 */
export function getCorrelationId(headers: Record<string, string>): string {
    return headers['x-request-id'] ||
           headers['X-Request-Id'] ||
           headers['x-correlation-id'] ||
           headers['X-Correlation-Id'] ||
           generateCorrelationId();
}

/**
 * Create a logger instance for a specific function
 */
export function createLogger(functionName: string, correlationId?: string) {
    const log = (level: LogLevel, message: string, data?: Record<string, any>, error?: unknown) => {
        if (!shouldLog(level)) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            function: functionName,
        };

        if (correlationId) {
            entry.correlationId = correlationId;
        }

        if (data) {
            entry.data = redactSensitive(data);
        }

        if (error) {
            entry.error = formatError(error);
        }

        // Output format
        if (isProduction) {
            // JSON format for production (easier to parse in log aggregators)
            console.log(JSON.stringify(entry));
        } else {
            // Human-readable format for development
            const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${functionName}]`;
            const suffix = correlationId ? ` (${correlationId.slice(0, 8)})` : '';

            if (error) {
                console.log(`${prefix}${suffix} ${message}`, data || '', entry.error);
            } else if (data) {
                console.log(`${prefix}${suffix} ${message}`, data);
            } else {
                console.log(`${prefix}${suffix} ${message}`);
            }
        }

        // Add Sentry breadcrumb for context trail
        // In production, only capture warn and error level
        const shouldAddBreadcrumb = !isProduction || (level === 'warn' || level === 'error');
        if (shouldAddBreadcrumb) {
            addBreadcrumb(
                functionName,
                message,
                level === 'warn' ? 'warning' : level,
                entry.data
            );
        }
    };

    return {
        debug: (message: string, data?: Record<string, any>) => log('debug', message, data),
        info: (message: string, data?: Record<string, any>) => log('info', message, data),
        warn: (message: string, data?: Record<string, any>) => log('warn', message, data),
        error: (message: string, error?: unknown, data?: Record<string, any>) => log('error', message, data, error),

        /**
         * Set user ID for subsequent logs
         */
        withUser: (userId: string) => {
            return createLoggerWithContext(functionName, correlationId, userId);
        },
    };
}

/**
 * Create a logger with additional context
 */
function createLoggerWithContext(functionName: string, correlationId?: string, userId?: string) {
    const log = (level: LogLevel, message: string, data?: Record<string, any>, error?: unknown) => {
        if (!shouldLog(level)) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            function: functionName,
            correlationId,
            userId,
        };

        if (data) {
            entry.data = redactSensitive(data);
        }

        if (error) {
            entry.error = formatError(error);
        }

        if (isProduction) {
            console.log(JSON.stringify(entry));
        } else {
            const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${functionName}]`;
            const context = [correlationId?.slice(0, 8), userId].filter(Boolean).join('|');
            const suffix = context ? ` (${context})` : '';

            if (error) {
                console.log(`${prefix}${suffix} ${message}`, data || '', entry.error);
            } else if (data) {
                console.log(`${prefix}${suffix} ${message}`, data);
            } else {
                console.log(`${prefix}${suffix} ${message}`);
            }
        }

        // Add Sentry breadcrumb for context trail
        // In production, only capture warn and error level
        const shouldAddBreadcrumb = !isProduction || (level === 'warn' || level === 'error');
        if (shouldAddBreadcrumb) {
            addBreadcrumb(
                functionName,
                message,
                level === 'warn' ? 'warning' : level,
                entry.data
            );
        }
    };

    return {
        debug: (message: string, data?: Record<string, any>) => log('debug', message, data),
        info: (message: string, data?: Record<string, any>) => log('info', message, data),
        warn: (message: string, data?: Record<string, any>) => log('warn', message, data),
        error: (message: string, error?: unknown, data?: Record<string, any>) => log('error', message, data, error),
    };
}

/**
 * Log an API request (for consistent request logging)
 */
export function logRequest(
    logger: ReturnType<typeof createLogger>,
    event: { httpMethod: string; path?: string; queryStringParameters?: Record<string, string> | null }
) {
    logger.info('Request received', {
        method: event.httpMethod,
        path: event.path,
        query: event.queryStringParameters,
    });
}

/**
 * Log an API response
 */
export function logResponse(
    logger: ReturnType<typeof createLogger>,
    statusCode: number,
    durationMs?: number
) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger[level]('Request completed', {
        statusCode,
        durationMs,
    });
}
