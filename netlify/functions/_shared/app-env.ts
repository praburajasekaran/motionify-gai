export type AppEnvironment = 'production' | 'staging' | 'preview' | 'development';

type EnvironmentSource = Record<string, string | undefined>;

const APP_ENVIRONMENTS = new Set<AppEnvironment>([
  'production',
  'staging',
  'preview',
  'development',
]);

/**
 * Resolve a stable application environment without changing Netlify's reserved
 * CONTEXT variable. APP_ENV is authoritative when it contains a supported
 * value; platform variables are compatibility fallbacks for local tools and
 * older deploys.
 */
export function getAppEnvironment(source: EnvironmentSource = process.env): AppEnvironment {
  const configured = source.APP_ENV?.trim().toLowerCase() as AppEnvironment | undefined;
  if (configured && APP_ENVIRONMENTS.has(configured)) {
    return configured;
  }

  const netlifyContext = source.CONTEXT?.trim().toLowerCase();
  if (netlifyContext === 'production') return 'production';
  if (netlifyContext === 'staging') return 'staging';
  if (netlifyContext === 'deploy-preview' || netlifyContext === 'branch-deploy') return 'preview';
  if (netlifyContext === 'dev' || netlifyContext === 'development') return 'development';

  return source.NODE_ENV === 'production' ? 'production' : 'development';
}

export function isStrictRuntimeEnvironment(environment: AppEnvironment): boolean {
  return environment === 'production' || environment === 'staging';
}
