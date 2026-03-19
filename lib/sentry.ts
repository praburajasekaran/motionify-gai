import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const isProduction = import.meta.env.PROD;

  Sentry.init({
    dsn,
    environment: isProduction ? 'production' : 'development',
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    sendDefaultPii: false,

    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (isProduction && breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      if (breadcrumb.message) {
        breadcrumb.message = breadcrumb.message
          .replace(/eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, '[JWT_REDACTED]')
          .replace(/(?:api[_-]?key|apikey|secret)[=:]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi, '[API_KEY_REDACTED]');
      }
      return breadcrumb;
    },
  });

  initialized = true;
}
