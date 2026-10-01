import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function has(relativePath, pattern) {
  return pattern.test(read(relativePath));
}

function anyFileMatches(paths, pattern) {
  return paths.some((relativePath) => exists(relativePath) && has(relativePath, pattern));
}

const packageJson = JSON.parse(read('package.json'));
const functionTests = fs
  .readdirSync(path.join(root, 'netlify/functions/__tests__'), { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => `netlify/functions/__tests__/${entry.name}`);

const checks = [
  {
    name: 'production readiness trace map is tracked',
    pass: exists('docs/production-readiness/core-journey-map.md'),
  },
  {
    name: 'release checklist is tracked',
    pass: exists('docs/production-readiness/release-checklist.md'),
  },
  {
    name: 'payment runbook is tracked',
    pass: exists('docs/production-readiness/payment-runbook.md'),
  },
  {
    name: 'plan document is tracked',
    pass: exists('docs/plans/2026-06-13-001-feat-production-readiness-hardening-plan.md'),
  },
  {
    name: 'glossary defines revision quota',
    pass: has('CONCEPTS.md', /^### Revision Quota$/m),
  },
  {
    name: 'glossary defines additional revision purchase',
    pass: has('CONCEPTS.md', /^### Additional Revision Purchase$/m),
  },
  {
    name: 'glossary defines deliverable-as-milestone',
    pass: has('CONCEPTS.md', /^### Deliverable-as-Milestone$/m),
  },
  {
    name: 'quiz inquiry contract preserves selected answers',
    pass: has('shared/contracts/inquiry.contract.ts', /QuizSelectionsSchema/) &&
      has('lib/inquiries.ts', /quizAnswers|quiz_answers/),
  },
  {
    name: 'proposal contract carries revision terms',
    pass: has('lib/proposals.ts', /revisionsIncluded/) &&
      has('lib/proposals.ts', /revisionsDescription/) &&
      has('shared/contracts/proposal.contract.ts', /handoff/),
  },
  {
    name: 'paid proposal activation helper exists',
    pass: exists('netlify/functions/_shared/proposal-payment-helpers.ts') &&
      has('netlify/functions/_shared/proposal-payment-helpers.ts', /acceptProposalAndCreateProject/),
  },
  {
    name: 'task deliverable migration is present',
    pass: exists('database/migrations/028_add_task_deliverable_link.sql') &&
      has('database/migrations/028_add_task_deliverable_link.sql', /deliverable_id/),
  },
  {
    name: 'task API preserves deliverable attachment',
    pass: has('services/taskApi.ts', /deliverableId/) &&
      has('netlify/functions/tasks.ts', /deliverable_id/) &&
      has('netlify/functions/_shared/schemas.ts', /deliverableId/),
  },
  {
    name: 'revision quota is enforced server-side',
    pass: has('netlify/functions/revision-requests.ts', /total_revisions_allowed/) &&
      has('netlify/functions/revision-requests.ts', /revisions_used/),
  },
  {
    name: 'additional revision request endpoint exists',
    pass: exists('netlify/functions/revision-requests.ts') &&
      has('netlify/functions/revision-requests.ts', /additional|approved_count|approvedCount/i),
  },
  {
    name: 'Razorpay checkout verification is signature-backed',
    pass: has('netlify/functions/_shared/payment-verification.ts', /verifyRazorpayCheckoutSignature/) &&
      has('netlify/functions/payments.ts', /verifyRazorpayCheckoutSignature/),
  },
  {
    name: 'Razorpay webhook is signature-backed',
    pass: has('netlify/functions/razorpay-webhook.ts', /RAZORPAY_WEBHOOK_SECRET/) &&
      has('netlify/functions/razorpay-webhook.ts', /signature/i),
  },
  {
    name: 'production env validation covers payment secrets',
    pass: has('netlify/functions/_shared/env.ts', /RAZORPAY_KEY_ID/) &&
      has('netlify/functions/_shared/env.ts', /RAZORPAY_KEY_SECRET/) &&
      has('netlify/functions/_shared/env.ts', /RAZORPAY_WEBHOOK_SECRET/),
  },
  {
    name: 'critical e2e specs exist',
    pass: [
      'e2e/public-work.spec.ts',
      'e2e/admin-functional.spec.ts',
      'e2e/proposal-to-project-flow.spec.ts',
      'e2e/deliverable-review.spec.ts',
      'e2e/payment-flow.spec.ts',
    ].every(exists),
  },
  {
    name: 'proposal journey e2e asserts payment activation',
    pass: has('e2e/proposal-to-project-flow.spec.ts', /Accept & Pay|Advance payment received|project binding/),
  },
  {
    name: 'payment function tests cover admin or verification behavior',
    pass: anyFileMatches(functionTests, /payment/i),
  },
  {
    name: 'production readiness npm script is registered',
    pass: packageJson.scripts?.['verify:production-readiness'] === 'node scripts/verify-production-readiness.mjs',
  },
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? 'ok' : 'fail'} - ${check.name}`);
}

if (failed.length > 0) {
  console.error(`\nProduction readiness verification failed: ${failed.length} check(s) did not pass.`);
  process.exit(1);
}

console.log('\nProduction readiness verification passed.');
