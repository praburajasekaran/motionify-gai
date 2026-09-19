import type { PoolConfig } from 'pg';
import { getAppEnvironment, isStrictRuntimeEnvironment } from '../netlify/functions/_shared/app-env';

type EnvironmentSource = Record<string, string | undefined>;

/**
 * Keep migration and contract-verification transport behavior aligned with the
 * normalized application environment. Staging and production always validate
 * the database certificate unless an operator explicitly disables TLS.
 */
export function getDatabaseSslConfig(
  env: EnvironmentSource = process.env
): PoolConfig['ssl'] {
  if (env.DATABASE_SSL === 'false') return false;

  const environment = getAppEnvironment(env);
  if (isStrictRuntimeEnvironment(environment)) return true;

  return env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined;
}
