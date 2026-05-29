import fs from 'node:fs';
import path from 'node:path';

const netlifyToml = fs.readFileSync('netlify.toml', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const landingPackageJson = JSON.parse(fs.readFileSync('landing-page-new/package.json', 'utf8'));
const landingReadme = fs.readFileSync('landing-page-new/README.md', 'utf8');
const landingNetlifyToml = fs.readFileSync('landing-page-new/netlify.toml', 'utf8');
const paymentPlaywrightConfig = fs.readFileSync('playwright.payment.config.ts', 'utf8');
const paymentSpec = fs.readFileSync('e2e/payment-flow.spec.ts', 'utf8');

const rootScriptEntries = Object.entries(packageJson.scripts || {});
const rootScriptText = rootScriptEntries.map(([name, value]) => `${name}: ${value}`).join('\n');
const landingScriptValues = Object.values(landingPackageJson.scripts || {});

function pathExists(relativePath) {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

const checks = [
  {
    name: 'production build uses Vite',
    pass: /^\s*command\s*=\s*"npm run build"\s*$/m.test(netlifyToml),
  },
  {
    name: 'production publish directory is dist',
    pass: /^\s*publish\s*=\s*"dist"\s*$/m.test(netlifyToml),
  },
  {
    name: 'Netlify Functions directory remains configured',
    pass: /^\s*functions\s*=\s*"netlify\/functions"\s*$/m.test(netlifyToml),
  },
  {
    name: 'Next deploy plugin is not configured',
    pass: !netlifyToml.includes('@netlify/plugin-nextjs'),
  },
  {
    name: 'production command does not use the legacy aggregate build',
    pass: !/command\s*=\s*"[^"]*build:all/.test(netlifyToml),
  },
  {
    name: 'package build script is the Vite build',
    pass: packageJson.scripts?.build === 'vite build',
  },
  {
    name: 'legacy copy-Portal production script is removed',
    pass: !packageJson.scripts?.['copy:portal'] && !packageJson.scripts?.['build:all'],
  },
  {
    name: 'legacy Next install is not in the default install lifecycle',
    pass: !packageJson.scripts?.postinstall?.includes('landing-page-new'),
  },
  {
    name: 'root package scripts do not invoke landing-page-new',
    pass: !/landing-page-new/.test(rootScriptText),
  },
  {
    name: 'root package scripts do not expose legacy landing commands',
    pass: !rootScriptEntries.some(([name]) => /(^|:)landing(:|$)/.test(name)),
  },
  {
    name: 'root package scripts do not invoke Next framework commands',
    pass: !/\bnext\s+(dev|build|start)\b/.test(rootScriptText),
  },
  {
    name: 'API compatibility redirect is preserved',
    pass: /from\s*=\s*"\/api\/\*"\s+to\s*=\s*"\/\.netlify\/functions\/:splat"\s+status\s*=\s*200/s.test(netlifyToml),
  },
  {
    name: 'Portal direct refresh rewrites to the Vite entrypoint',
    pass: /from\s*=\s*"\/portal\/\*"\s+to\s*=\s*"\/index\.html"\s+status\s*=\s*200/s.test(netlifyToml),
  },
  {
    name: 'catch-all SPA fallback rewrites to the Vite entrypoint',
    pass: /from\s*=\s*"\/\*"\s+to\s*=\s*"\/index\.html"\s+status\s*=\s*200/s.test(netlifyToml),
  },
  {
    name: 'Vite hashed assets have immutable cache headers',
    pass: /for\s*=\s*"\/assets\/\*"\s+\[headers\.values\]\s+Cache-Control\s*=\s*"public, max-age=31536000, immutable"/s.test(netlifyToml),
  },
  {
    name: 'Vite sourcemaps are blocked',
    pass: /from\s*=\s*"\/assets\/\*\.map"\s+to\s*=\s*"\/404"\s+status\s*=\s*404\s+force\s*=\s*true/s.test(netlifyToml),
  },
  {
    name: 'legacy portal host redirects to motionify.studio',
    pass: /to\s*=\s*"https:\/\/motionify\.studio\/:splat"[\s\S]*conditions\s*=\s*\{Host\s*=\s*\["portal\.motionify\.studio"\]\}/.test(netlifyToml),
  },
  {
    name: 'legacy Next reference package is marked retired',
    pass: landingPackageJson.name === 'motionify-legacy-next-reference' &&
      /retired/i.test(landingPackageJson.version || '') &&
      /Retired non-runtime reference/i.test(landingPackageJson.description || ''),
  },
  {
    name: 'legacy Next reference package has no runtime dependencies',
    pass: !landingPackageJson.dependencies && !landingPackageJson.devDependencies,
  },
  {
    name: 'legacy Next reference package scripts intentionally fail',
    pass: landingScriptValues.length > 0 &&
      landingScriptValues.every((value) => value === 'node ./scripts/retired-runtime.mjs'),
  },
  {
    name: 'legacy Next reference README is explicit about non-runtime status',
    pass: /no longer a Motionify Studio runtime/i.test(landingReadme) &&
      /non-runtime legacy reference|non-runtime historical reference/i.test(landingReadme),
  },
  {
    name: 'legacy Next reference netlify config cannot install the Next plugin',
    pass: !landingNetlifyToml.includes('@netlify/plugin-nextjs') && !/^\s*\[build\]/m.test(landingNetlifyToml),
  },
  {
    name: 'payment Playwright config uses the Vite static server',
    pass: /baseURL:\s*'http:\/\/localhost:8899'/.test(paymentPlaywrightConfig) &&
      /vite preview --host 127\.0\.0\.1 --port 8899/.test(paymentPlaywrightConfig),
  },
  {
    name: 'payment Playwright config does not start the legacy landing runtime',
    pass: !/dev:landing|landing-page-new|localhost:5174/.test(paymentPlaywrightConfig),
  },
  {
    name: 'payment flow spec does not hardcode the legacy local Next origin',
    pass: !/localhost:5174/.test(paymentSpec),
  },
  {
    name: 'legacy generated Next build output is absent',
    pass: !pathExists('landing-page-new/.next'),
  },
  {
    name: 'legacy nested node_modules is absent',
    pass: !pathExists('landing-page-new/node_modules'),
  },
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? 'ok' : 'fail'} - ${check.name}`);
}

if (failed.length > 0) {
  console.error(`\nProduction flip verification failed: ${failed.length} check(s) did not pass.`);
  process.exit(1);
}

console.log('\nProduction flip verification passed.');
