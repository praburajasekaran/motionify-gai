# Testing

**Analysis Date:** 2026-01-19

## Framework

**E2E Testing:**
- Playwright 1.57.0
- Config: `playwright.config.ts`, `playwright.payment.config.ts`
- Location: `e2e/` directory
- Browser: Chromium (default)
- Parallel execution: Enabled

**Unit Testing:**
- Jest 30.2.0 (Next.js app only)
- Config: `landing-page-new/jest.config.js`
- Transformer: SWC (`@swc/jest`)
- Location: `landing-page-new/src/**/__tests__/`

**Component Testing:**
- @testing-library/react 16.3.1
- Not actively used (no test files found)

## Structure

**E2E Tests Location:**
```
e2e/
├── admin-smoke.spec.ts        # Basic admin portal smoke tests
├── deliverable-review.spec.ts # Deliverable approval workflow
├── admin-functional.spec.ts   # Admin feature tests
└── payment-*.spec.ts          # Payment flow tests
```

**Test Organization:**
- One spec file per feature/workflow
- Descriptive test names following pattern: `TC-[AREA]-[NUMBER]`
- Test data: Inline in spec files
- Page objects: Not used (direct Playwright API)

**Unit Tests:**
- Only in Next.js app: `landing-page-new/src/app/api/payments/__tests__/`
- Mock-heavy approach (982 lines of mocks in payments.test.ts)

## Running Tests

**E2E Tests:**
```bash
# All E2E tests
npm run test:e2e

# Payment tests only
npm run test:e2e:payment
```

**Unit Tests:**
```bash
# In landing-page-new directory
npm test
```

## Coverage

**What's Tested:**
- Authentication flows (magic link)
- Deliverable approval workflow
- File upload/download
- Permission controls
- Payment processing

**What's NOT Tested:**
- Netlify Functions (no unit tests)
- Permission utilities
- Database schema
- Email delivery
- R2 file storage integration
- Task management flows

## Test Data

**Approach:**
- Hardcoded test data in spec files
- No test database seeding
- Reliance on existing dev database state

**Example Test Users:**
```typescript
// From e2e/admin-smoke.spec.ts
const ADMIN_EMAIL = 'admin@motionify.com'
const CLIENT_EMAIL = 'client@motionify.com'
```

## Mocking

**E2E Tests:**
- No mocking (tests against real backend)
- Real database operations
- Real email service (if configured)

**Unit Tests:**
- Heavy mocking of all external dependencies
- Mock Razorpay SDK
- Mock database client
- Mock email service

## CI Integration

**Current State:**
- No CI configuration detected
- Tests run manually before deployment
- Netlify doesn't run tests automatically

**Recommended:**
```yaml
# .github/workflows/test.yml (not present)
# Add GitHub Actions workflow to run tests on PR
```

---

*Testing analysis: 2026-01-19*
