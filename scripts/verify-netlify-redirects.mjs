import { readFileSync } from 'node:fs';

const redirects = readFileSync('dist/_redirects', 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

const assetsRuleIndex = redirects.findIndex((line) => /^\/assets\/\*\s+\/404\s+404!$/.test(line));
const firstSpaRewriteIndex = redirects.findIndex((line) => /\s+\/index\.html\s+200$/.test(line));

if (assetsRuleIndex === -1) {
  throw new Error('dist/_redirects must include a forced 404 rule for /assets/*.');
}

if (firstSpaRewriteIndex === -1) {
  throw new Error('dist/_redirects must include at least one SPA rewrite rule.');
}

if (assetsRuleIndex > firstSpaRewriteIndex) {
  throw new Error('The /assets/* 404 rule must be ordered before SPA rewrites in dist/_redirects.');
}

console.log('Netlify redirects preserve missing asset 404 behavior.');
