import { existsSync, readFileSync } from 'node:fs';

const SPA_ROUTES = [
  '/verify-inquiry',
  '/proposal/*',
  '/payment/*',
  '/payments/proforma/*',
  '/inquiry-status/*',
  '/portal',
  '/portal/*',
  '/about',
  '/contact',
  '/work',
  '/login',
  '/project-access',
];

const redirectFiles = [
  'public/_redirects',
  'netlify.toml',
  ...(existsSync('dist/_redirects') ? ['dist/_redirects'] : []),
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertNoGlobalSpaFallback(file, content) {
  const redirectsCatchAll = /^\/\*\s+\/index\.html\s+200\b/m;
  const tomlCatchAll = content
    .split(/\n(?=\[\[redirects\]\])/)
    .some((block) =>
      /^\s*from\s*=\s*["']\/\*["']\s*$/m.test(block) &&
      /^\s*to\s*=\s*["']\/index\.html["']\s*$/m.test(block)
    );

  if (redirectsCatchAll.test(content) || tomlCatchAll) {
    throw new Error(`${file} contains a global SPA fallback that rewrites missing assets to index.html`);
  }
}

function assertRoutesPresent(file, content) {
  for (const route of SPA_ROUTES) {
    const redirectsRoute = new RegExp(`^${escapeRegExp(route)}\\s+/index\\.html\\s+200\\b`, 'm');
    const tomlRoute = new RegExp(`^\\s*from\\s*=\\s*["']${escapeRegExp(route)}["']\\s*$`, 'm');

    if (!redirectsRoute.test(content) && !tomlRoute.test(content)) {
      throw new Error(`${file} is missing SPA route fallback for ${route}`);
    }
  }
}

for (const file of redirectFiles) {
  const content = readFileSync(file, 'utf8');
  assertNoGlobalSpaFallback(file, content);
  assertRoutesPresent(file, content);
}

console.log(`Verified SPA redirects in ${redirectFiles.join(', ')}`);
