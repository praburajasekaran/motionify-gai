/**
 * GET /api/health
 *
 * Deployment gate for runtime configuration, database connectivity, and the
 * schema contract required by the application.
 */

import { verifyDatabaseContract } from '../../database/contract';
import { getAppEnvironment, isStrictRuntimeEnvironment, type AppEnvironment } from './_shared/app-env';
import { getCorsHeaders } from './_shared/cors';
import { query } from './_shared/db';
import { createLogger, generateCorrelationId } from './_shared/logger';

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string>;
}

interface NetlifyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

type OverallHealth = 'healthy' | 'degraded' | 'unhealthy';
type ServiceHealth = 'pass' | 'warn' | 'fail';
type EnvironmentSource = Record<string, string | undefined>;

interface ServiceCheck {
  status: ServiceHealth;
  configured: boolean;
  missing?: string[];
}

interface RuntimePrerequisiteResult {
  status: OverallHealth;
  missingRequired: string[];
  services: {
    email: ServiceCheck;
    storage: ServiceCheck;
    payment: ServiceCheck;
    errorTracking: ServiceCheck;
  };
}

interface HealthStatus {
  status: OverallHealth;
  timestamp: string;
  version: string;
  environment: AppEnvironment;
  checks: {
    database: { status: 'pass' | 'fail'; latencyMs?: number; error?: string };
    schema: {
      status: ServiceHealth;
      ready: boolean;
      latestMigration: string;
      issues?: string[];
    };
    environment: { status: 'pass' | 'fail'; missing?: string[] };
    services: RuntimePrerequisiteResult['services'];
  };
}

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const;

const SERVICE_ENV_VARS = {
  email: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
  storage: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'],
  payment: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
  errorTracking: ['SENTRY_DSN', 'VITE_SENTRY_DSN'],
} as const;

function missingValues(source: EnvironmentSource, keys: readonly string[]): string[] {
  return keys.filter((key) => !source[key]?.trim());
}

export function evaluateRuntimePrerequisites(
  environment: AppEnvironment,
  source: EnvironmentSource
): RuntimePrerequisiteResult {
  const strict = isStrictRuntimeEnvironment(environment);
  const missingRequired = missingValues(source, REQUIRED_ENV_VARS);
  let status: OverallHealth = missingRequired.length > 0 ? 'unhealthy' : 'healthy';

  const serviceCheck = (keys: readonly string[]): ServiceCheck => {
    const missing = missingValues(source, keys);
    if (missing.length === 0) {
      return { status: 'pass', configured: true };
    }

    if (status === 'healthy') {
      status = strict ? 'unhealthy' : 'degraded';
    } else if (strict && status === 'degraded') {
      status = 'unhealthy';
    }

    return {
      status: strict ? 'fail' : 'warn',
      configured: false,
      missing,
    };
  };

  const services = {
    email: serviceCheck(SERVICE_ENV_VARS.email),
    storage: serviceCheck(SERVICE_ENV_VARS.storage),
    payment: serviceCheck(SERVICE_ENV_VARS.payment),
    errorTracking: serviceCheck(SERVICE_ENV_VARS.errorTracking),
  };

  return { status, missingRequired, services };
}

function degradeForSchema(current: OverallHealth, strict: boolean): OverallHealth {
  if (current === 'unhealthy') return current;
  return strict ? 'unhealthy' : 'degraded';
}

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  const correlationId = generateCorrelationId();
  const logger = createLogger('health', correlationId);
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const environment = getAppEnvironment(process.env);
  const strict = isStrictRuntimeEnvironment(environment);
  const prerequisites = evaluateRuntimePrerequisites(environment, process.env);
  const healthStatus: HealthStatus = {
    status: prerequisites.status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment,
    checks: {
      database: { status: 'pass' },
      schema: {
        status: strict ? 'fail' : 'warn',
        ready: false,
        latestMigration: 'unknown',
      },
      environment: prerequisites.missingRequired.length === 0
        ? { status: 'pass' }
        : { status: 'fail', missing: prerequisites.missingRequired },
      services: prerequisites.services,
    },
  };

  if (prerequisites.missingRequired.length > 0) {
    logger.error('Health check: Missing required environment variables', undefined, {
      missing: prerequisites.missingRequired,
    });
  }

  try {
    const startTime = Date.now();
    await query('SELECT 1');
    healthStatus.checks.database = {
      status: 'pass',
      latencyMs: Date.now() - startTime,
    };

    const contract = await verifyDatabaseContract({
      query: (text, params) => query(text, params),
    });
    healthStatus.checks.schema = {
      status: contract.ready ? 'pass' : strict ? 'fail' : 'warn',
      ready: contract.ready,
      latestMigration: contract.latestMigration,
      ...(contract.issues.length > 0
        ? { issues: contract.issues.map((issue) => `${issue.code}:${issue.object}`) }
        : {}),
    };

    if (!contract.ready) {
      healthStatus.status = degradeForSchema(healthStatus.status, strict);
      logger.warn('Health check: Database schema contract is not ready', {
        latestMigration: contract.latestMigration,
        issues: contract.issues,
      });
    }
  } catch (error) {
    healthStatus.checks.database = {
      status: 'fail',
      error: 'Database connection failed',
    };
    healthStatus.checks.schema = {
      status: strict ? 'fail' : 'warn',
      ready: false,
      latestMigration: 'unknown',
      issues: ['database_unavailable'],
    };
    healthStatus.status = 'unhealthy';
    logger.error('Health check: Database connection failed', error);
  }

  const httpStatus = healthStatus.status === 'unhealthy' ? 503 : 200;

  logger.info('Health check completed', {
    status: healthStatus.status,
    environment,
    database: healthStatus.checks.database.status,
    schema: healthStatus.checks.schema.status,
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
