/**
 * Sentry Error Monitoring Module
 *
 * Provides centralized error tracking with:
 * - Lazy initialization (only init once per cold start)
 * - Breadcrumb logging for error context
 * - Sensitive data scrubbing
 * - Serverless-aware flush before response
 */

import * as Sentry from '@sentry/node';

let sentryInitialized = false;

// Environment detection using Netlify's CONTEXT var
const isProduction = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production';

/**
 * Initialize Sentry. Safe to call multiple times (no-op after first init).
 */
export function initSentry(): void {
  if (sentryInitialized) return;
  if (!process.env.SENTRY_DSN) {
    // Sentry not configured - skip initialization
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.CONTEXT || process.env.NODE_ENV || 'development',
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
    sendDefaultPii: false, // Don't auto-send PII

    beforeSend(event) {
      // Scrub sensitive data from user context
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      // Scrub request headers
      if (event.request?.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        for (const header of sensitiveHeaders) {
          if (event.request.headers[header]) {
            event.request.headers[header] = '[REDACTED]';
          }
        }
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      // Filter noisy console breadcrumbs in production
      if (isProduction) {
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }
      }

      // Redact sensitive data from breadcrumb messages
      if (breadcrumb.message) {
        breadcrumb.message = redactSensitiveString(breadcrumb.message);
      }

      return breadcrumb;
    },
  });

  sentryInitialized = true;
}

/**
 * Redact known sensitive patterns from strings
 */
function redactSensitiveString(str: string): string {
  // Redact JWT tokens
  str = str.replace(/eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, '[JWT_REDACTED]');
  // Redact API keys (common patterns)
  str = str.replace(/(?:api[_-]?key|apikey|secret)[=:]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi, '[API_KEY_REDACTED]');
  return str;
}

/**
 * Generate error ID for support lookup
 * Format: ERR-{timestamp-base36}-{random}
 */
export function generateErrorId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ERR-${timestamp}-${random}`;
}

/**
 * Capture an exception with error ID
 * Returns the error ID for inclusion in user-facing response
 */
export function captureError(error: unknown, context?: Record<string, any>): string {
  const errorId = generateErrorId();

  initSentry(); // Ensure initialized

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: {
        errorId,
        ...context,
      },
      tags: {
        errorId,
      },
    });
  }

  return errorId;
}

/**
 * Add a breadcrumb for context trail
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  initSentry();

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category,
      message,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

/**
 * CRITICAL: Flush Sentry before returning from serverless function
 * Must be awaited to ensure events are transmitted
 */
export async function flushSentry(timeout = 2000): Promise<void> {
  if (process.env.SENTRY_DSN && sentryInitialized) {
    await Sentry.flush(timeout);
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string, role?: string): void {
  initSentry();

  if (process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      // Note: email intentionally omitted for privacy
      ...(role && { role }),
    });
  }
}

/**
 * Clear user context (call on logout or request end)
 */
export function clearUser(): void {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

// Re-export Sentry for advanced use cases
export { Sentry };
