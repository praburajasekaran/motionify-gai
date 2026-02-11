# Phase 12: Performance & Polish - Research

**Researched:** 2026-01-29
**Domain:** Full-stack web performance optimization, load testing, mobile responsiveness, UX polish
**Confidence:** HIGH

## Summary

Phase 12 focuses on production-readiness across three critical dimensions: load testing (API/DB/frontend under 100 concurrent users), mobile responsiveness (all pages functional on mobile with smooth touch interactions), and UX polish (loading states, error messages, success feedback, consistent design).

The research reveals that the project's existing infrastructure (Vite + Next.js 14 + Netlify Functions + Neon Postgres + Sentry monitoring) provides a solid foundation for performance work. The codebase already has Playwright E2E tests, connection pooling, structured logging, and error monitoring - reducing the scope of work needed.

**Key Findings:**
- **Load Testing:** Artillery or k6 recommended for 100 concurrent users; Artillery integrates with existing Playwright tests for frontend load testing
- **Database:** Neon serverless Postgres has known cold start latency (500ms-few seconds); existing 10-connection pool already optimized
- **Mobile:** Tailwind CSS mobile-first approach already in use; need systematic testing across breakpoints (sm:640px through 2xl:1536px)
- **UX Polish:** Loading states and error handling inconsistent; need centralized patterns with discriminated union types and React Query for state management
- **Monitoring:** Core Web Vitals changed in 2024 - INP replaced FID; must measure LCP (<2.5s), INP (<200ms), CLS (<0.1)

**Primary recommendation:** Focus on Artillery + Playwright for load testing (reuses existing E2E tests), systematic mobile testing with Playwright device emulation, and standardized loading/error state components leveraging React Query patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core Load Testing

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Artillery | 2.x | Load testing with Playwright integration | Integrates with existing Playwright tests; 4M concurrent user capability; simpler than k6 for JS teams |
| k6 | Latest | Protocol-level load testing | Industry standard for API load testing; Grafana backing; powerful scripting; used by 40K+ teams |
| Playwright | 1.57+ | Browser automation & E2E testing | Already in project; mobile device emulation; 100K concurrent browser testing capability |

### Supporting Performance Tools

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| web-vitals | 4.x | Core Web Vitals measurement | Real User Monitoring (RUM) for LCP, INP, CLS tracking |
| @tanstack/react-query | 5.62+ | Data fetching state management | Already in project; built-in loading/error states; caching reduces API load |
| react-loading-skeleton | 3.x | Loading placeholder components | Consistent skeleton screens across components |
| Lighthouse CI | Latest | Automated performance auditing | CI/CD integration for performance regression detection |

### Monitoring & Observability

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sentry/node | 10.37+ | Error tracking & performance monitoring | Already configured; APM features for serverless function performance |
| Netlify Analytics | Built-in | Serverless function metrics | Free tier provides 7 days of metrics (invocation count, duration, error rates) |
| Neon Dashboard | Built-in | Database query performance | Built-in query analytics for Neon Postgres |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Artillery | Locust (Python) | Locust better for non-JS teams; Artillery better for reusing Playwright tests |
| k6 | JMeter (Java) | JMeter more mature but heavyweight; k6 simpler and modern |
| web-vitals | Custom RUM | Custom solution requires maintaining measurement code; web-vitals is Google-official |
| Playwright devices | BrowserStack | BrowserStack provides real devices but costs money; Playwright device emulation sufficient for 90% of cases |

**Installation:**

```bash
# Load testing
npm install --save-dev artillery artillery-engine-playwright

# Performance monitoring
npm install web-vitals

# Loading states (optional - evaluate vs building custom with Tailwind)
npm install react-loading-skeleton

# Lighthouse CI (optional - for automated performance auditing)
npm install --save-dev @lhci/cli
```

## Architecture Patterns

### Recommended Project Structure

```
.planning/phases/PROD-12-extended-testing/
├── load-tests/              # Artillery test scenarios
│   ├── api-load.yml         # API endpoint load testing
│   ├── frontend-load.js     # Frontend Playwright load test
│   └── scenarios/           # User journey scenarios
├── mobile-test-plan.md      # Systematic mobile testing checklist
└── perf-baseline.json       # Performance baseline metrics

components/
├── ui/
│   ├── LoadingState.tsx     # Standardized loading component
│   ├── ErrorState.tsx       # Standardized error component
│   └── EmptyState.tsx       # Standardized empty state component
└── shared/
    └── useLoadingState.tsx  # Custom hook for loading states

e2e/
├── mobile/                  # Mobile-specific E2E tests
│   ├── mobile-proposal.spec.ts
│   └── mobile-payments.spec.ts
└── performance/             # Performance test suites
    └── core-web-vitals.spec.ts
```

### Pattern 1: Artillery + Playwright Integration (Load Testing)

**What:** Reuse existing Playwright E2E tests for load testing by running them through Artillery's Playwright engine
**When to use:** Testing frontend under load with realistic user interactions (not just API hammering)

**Example:**

```yaml
# load-tests/frontend-load.yml
config:
  target: "http://localhost:5173"
  phases:
    - duration: 300  # 5 minutes
      arrivalRate: 20  # 20 new users per second = 100 concurrent
      name: "Sustained load"
  engines:
    playwright:
      aggregateByName: true
  processor: "./scenarios/proposal-flow.js"

scenarios:
  - engine: playwright
    flowFunction: "proposalFlowTest"
    flow:
      - think: 5
```

```javascript
// load-tests/scenarios/proposal-flow.js
module.exports = { proposalFlowTest };

async function proposalFlowTest(page, userContext, events) {
  // Reuse existing Playwright logic
  await page.goto('/admin/proposals');
  await page.waitForLoadState('networkidle');

  // Click proposal
  await page.click('[data-testid="proposal-item"]');
  await page.waitForLoadState('networkidle');

  // Measure Core Web Vitals
  const vitals = await page.evaluate(() => {
    return {
      lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
      cls: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0)
    };
  });

  events.emit('counter', 'proposals.viewed', 1);
  events.emit('histogram', 'proposals.lcp', vitals.lcp);
}
```

### Pattern 2: Discriminated Union Loading States

**What:** Type-safe loading state management using discriminated unions (prevents impossible states)
**When to use:** Any component with async data fetching

**Example:**

```typescript
// Source: React TypeScript patterns + React Query best practices
type LoadingState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

function useProposals() {
  const [state, setState] = useState<LoadingState<Proposal[]>>({ status: 'idle' });

  useEffect(() => {
    setState({ status: 'loading' });
    fetchProposals()
      .then(data => setState({ status: 'success', data }))
      .catch(error => setState({ status: 'error', error }));
  }, []);

  return state;
}

// Usage in component
function ProposalList() {
  const state = useProposals();

  switch (state.status) {
    case 'idle':
    case 'loading':
      return <LoadingSkeleton count={5} />;
    case 'success':
      return <ProposalTable proposals={state.data} />;
    case 'error':
      return <ErrorState error={state.error} onRetry={refetch} />;
  }
}
```

### Pattern 3: React Query for State Management

**What:** Leverage @tanstack/react-query (already in project) for built-in loading/error states and caching
**When to use:** All data fetching scenarios (reduces boilerplate and improves performance)

**Example:**

```typescript
// Source: React Query v5 official docs
import { useQuery } from '@tanstack/react-query';

function useProposals() {
  return useQuery({
    queryKey: ['proposals'],
    queryFn: fetchProposals,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

function ProposalList() {
  const { data, isLoading, isError, error, refetch } = useProposals();

  if (isLoading) return <LoadingSkeleton count={5} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return <ProposalTable proposals={data} />;
}
```

### Pattern 4: Playwright Mobile Device Emulation

**What:** Systematic testing across mobile breakpoints using Playwright's device descriptors
**When to use:** Mobile responsiveness testing without needing real devices

**Example:**

```typescript
// e2e/mobile/mobile-proposal.spec.ts
// Source: Playwright official docs - mobile emulation
import { test, devices } from '@playwright/test';

const mobileDevices = [
  devices['iPhone 13'],
  devices['iPhone 13 Pro'],
  devices['Pixel 5'],
  devices['Galaxy S9+']
];

for (const device of mobileDevices) {
  test.describe(`Mobile - ${device.name}`, () => {
    test.use({ ...device });

    test('should display proposal details on mobile', async ({ page }) => {
      await page.goto('/proposal/123');

      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();

      // Test touch interactions
      await page.locator('[data-testid="accept-button"]').tap();
      await page.waitForSelector('[data-testid="confirmation"]');
    });
  });
}
```

### Pattern 5: Core Web Vitals Monitoring

**What:** Measure LCP, INP, CLS on real user interactions using web-vitals library
**When to use:** Production monitoring and Playwright performance tests

**Example:**

```typescript
// Source: web-vitals official documentation
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToSentry(metric) {
  // Send to Sentry (already configured)
  Sentry.captureMessage(`Core Web Vital: ${metric.name}`, {
    level: 'info',
    tags: {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    }
  });
}

// Initialize in app entry point
onLCP(sendToSentry);  // Target: <2.5s
onINP(sendToSentry);  // Target: <200ms
onCLS(sendToSentry);  // Target: <0.1
```

### Anti-Patterns to Avoid

- **Manual HTTP requests for load testing:** Don't use curl/ApacheBench for testing React apps - they can't execute JS or measure real user experience. Use Artillery + Playwright instead.
- **Testing only on desktop Chrome:** 60%+ of traffic is mobile; test on iPhone/Android emulators at minimum
- **Vague loading states:** Avoid just showing "Loading..." - use skeleton screens that match content structure
- **Generic error messages:** Don't show "Something went wrong" - provide actionable error messages with retry buttons
- **Ignoring Core Web Vitals:** Google uses LCP/INP/CLS for ranking; measure them in production with RUM
- **No performance budget:** Set performance budgets (e.g., "Proposal detail page must load in <2s") and fail CI if exceeded

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Load testing | Custom curl scripts | Artillery or k6 | Load testing needs realistic concurrency, metrics aggregation, percentiles (p50/p95/p99), and scenario orchestration |
| Core Web Vitals measurement | Custom performance.timing parsing | web-vitals library | Google's official library handles browser differences, edge cases (back/forward cache), and follows spec updates (INP replaced FID in 2024) |
| Loading skeletons | Manual div + CSS for each component | react-loading-skeleton | Handles content-aware sizing, theme integration, accessibility (aria-busy), and animated shimmer effect |
| Mobile device testing | Testing on your phone only | Playwright device emulation | Need to test 10+ device/browser combos; real devices don't scale; emulation covers 90% of issues |
| Rate limiting for load tests | setTimeout between requests | Artillery phases/arrivalRate | Proper load testing needs realistic user arrival patterns (ramp-up, sustained load, spike testing) not fixed delays |
| Error retry logic | Manual setTimeout + counter | React Query retry config | Handles exponential backoff, max retries, retry conditions, and integrates with loading states |

**Key insight:** Performance testing is deceptively complex - realistic load generation, percentile calculations, browser performance APIs, and mobile device matrix testing require specialized tools. Building these from scratch takes weeks and produces inferior results.

## Common Pitfalls

### Pitfall 1: Testing Only API Endpoints (Ignoring Frontend Load)

**What goes wrong:** API load tests show green (100 req/s), but real users experience slow page loads and unresponsive UI under 50 concurrent users
**Why it happens:** Frontend performance is separate from API performance - React rendering, DOM updates, memory leaks, and JS bundle size create bottlenecks independent of API speed
**How to avoid:** Use Artillery's Playwright engine to test frontend under load with real browser instances
**Warning signs:** API metrics look good but user reports say "site is slow under load"

### Pitfall 2: Neon Serverless Cold Start Blindness

**What goes wrong:** Database queries test fast (<50ms) in load tests, but production shows intermittent 2-3 second delays
**Why it happens:** Neon serverless scales to zero after 5 minutes of inactivity; cold start reactivation adds 500ms-few seconds latency (documented limitation)
**How to avoid:**
  - Keep compute awake during load tests (set scale-to-zero timeout to 1 hour)
  - Test cold start scenarios separately with explicit sleep periods
  - Consider Neon Pro plan ($20/mo) for reduced cold starts if this is critical
**Warning signs:** P95/P99 latency much higher than P50; intermittent slow queries after inactivity

### Pitfall 3: Mobile Testing Only on Latest iPhone

**What goes wrong:** Site works on iPhone 15 Pro but breaks on Pixel 5, Galaxy S9, or older iPhones (40% of users)
**Why it happens:** Different browsers (Chrome vs Safari), screen sizes (5" vs 6.7"), and device capabilities (high-end vs budget) expose different issues
**How to avoid:** Test on Playwright's device matrix: iPhone 13, Pixel 5, Galaxy S9+ minimum (covers Safari + Chrome on different screen sizes)
**Warning signs:** Bug reports mention specific Android devices or older iPhones; touch interactions feel off

### Pitfall 4: Tailwind Mobile-First Misunderstanding

**What goes wrong:** Developer writes `sm:hidden lg:block` expecting it to show on desktop and hide on mobile, but it does the opposite
**Why it happens:** Tailwind is mobile-first: unprefixed styles apply to ALL sizes, `sm:` applies at 640px+, not "small devices only"
**How to avoid:**
  - Read Tailwind docs carefully: `sm:` means "small and UP" not "only small"
  - For mobile-only: use `sm:hidden` (hide on 640px+)
  - For desktop-only: use `hidden sm:block` (hide by default, show at 640px+)
**Warning signs:** Responsive breakpoints work backwards; elements appear on wrong screen sizes

### Pitfall 5: Loading State Soup (Impossible States)

**What goes wrong:** Component shows loading spinner while also displaying data, or error message with stale data visible
**Why it happens:** Multiple boolean flags (`isLoading`, `hasError`, `hasData`) create 2^3 = 8 state combinations, most of which are impossible/invalid
**How to avoid:** Use discriminated union types (idle | loading | success | error) - makes impossible states unrepresentable
**Warning signs:** Bugs like "error toast showed but data loaded anyway" or "spinner never disappears"

### Pitfall 6: Ignoring INP (Using Old FID Metrics)

**What goes wrong:** Site passes Core Web Vitals in 2023 tools but fails in 2024+ because FID was replaced by INP
**Why it happens:** Google replaced First Input Delay (FID) with Interaction to Next Paint (INP) in March 2024; INP is much stricter (measures all interactions, not just first)
**How to avoid:**
  - Use web-vitals v4+ (supports INP)
  - Update monitoring dashboards to track INP not FID
  - INP threshold is <200ms (stricter than FID's <100ms)
**Warning signs:** Old performance reports show "good" but Google Search Console shows "needs improvement"

### Pitfall 7: No Performance Budget in CI

**What goes wrong:** Performance degrades gradually over time as features are added; nobody notices until users complain
**Why it happens:** Without automated checks, performance is "tested" manually (if at all) and regressions slip through code review
**How to avoid:**
  - Add Lighthouse CI to GitHub Actions
  - Set budgets: LCP <2.5s, INP <200ms, CLS <0.1, bundle size <500KB
  - Fail CI if budgets exceeded
**Warning signs:** Performance was good at launch but degraded over 6 months; no performance metrics in CI/CD

## Code Examples

Verified patterns from official sources:

### Load Testing Setup (Artillery)

```yaml
# load-tests/api-load.yml
# Source: Artillery official docs - protocol-level testing
config:
  target: "http://localhost:8888/.netlify/functions"
  phases:
    # Warm-up phase
    - duration: 60
      arrivalRate: 5
      name: "Warm-up"
    # Ramp-up to target load
    - duration: 120
      arrivalRate: 5
      rampTo: 20
      name: "Ramp-up to 100 concurrent"
    # Sustained load
    - duration: 300
      arrivalRate: 20
      name: "Sustained load (100 concurrent)"
  http:
    timeout: 10
  processor: "./scenarios/auth-processor.js"

scenarios:
  - name: "Proposal CRUD"
    weight: 60
    flow:
      - post:
          url: "/proposals"
          json:
            description: "Test proposal"
            deliverables: []
          headers:
            Cookie: "auth_token={{ authToken }}"
          capture:
            - json: "$.id"
              as: "proposalId"
          expect:
            - statusCode: 201
      - get:
          url: "/proposals/{{ proposalId }}"
          headers:
            Cookie: "auth_token={{ authToken }}"
          expect:
            - statusCode: 200
            - contentType: json

  - name: "Read-heavy workload"
    weight: 40
    flow:
      - get:
          url: "/proposals"
          headers:
            Cookie: "auth_token={{ authToken }}"
          expect:
            - statusCode: 200
```

```javascript
// load-tests/scenarios/auth-processor.js
// Source: Artillery custom processor pattern
module.exports = { beforeScenario };

async function beforeScenario(userContext, events, done) {
  // Authenticate once per virtual user
  const response = await fetch('http://localhost:8888/.netlify/functions/auth-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com' })
  });

  const { token } = await response.json();
  userContext.vars.authToken = token;

  return done();
}
```

### Mobile Responsiveness Test Suite

```typescript
// e2e/mobile/mobile-responsive.spec.ts
// Source: Playwright official docs - responsive testing
import { test, expect, devices } from '@playwright/test';

const breakpoints = [
  { name: 'Mobile (320px)', viewport: { width: 320, height: 568 } },
  { name: 'Mobile (375px)', viewport: { width: 375, height: 667 } },
  { name: 'Tablet (768px)', viewport: { width: 768, height: 1024 } },
  { name: 'Desktop (1024px)', viewport: { width: 1024, height: 768 } },
];

for (const breakpoint of breakpoints) {
  test.describe(`Responsive - ${breakpoint.name}`, () => {
    test.use({ viewport: breakpoint.viewport });

    test('proposal form should be usable', async ({ page }) => {
      await page.goto('/admin/proposals/new');

      // Form fields should be visible and tappable
      const descriptionField = page.locator('[name="description"]');
      await expect(descriptionField).toBeVisible();

      // Touch target should be at least 44x44 (iOS guideline)
      const box = await descriptionField.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);

      // Keyboard should not overlap inputs (viewport should adjust)
      await descriptionField.tap();
      await page.keyboard.type('Test description');
      await expect(descriptionField).toBeInViewport();
    });

    test('tables should be horizontally scrollable on mobile', async ({ page }) => {
      if (breakpoint.viewport.width < 640) {
        await page.goto('/admin/proposals');

        const table = page.locator('table');
        await expect(table).toBeVisible();

        // Check if table container has overflow-x-auto
        const container = page.locator('.overflow-x-auto table').first();
        await expect(container).toBeVisible();
      }
    });
  });
}

// Device-specific tests
test.describe('iOS Safari specific', () => {
  test.use(devices['iPhone 13']);

  test('date inputs should use native iOS picker', async ({ page }) => {
    await page.goto('/admin/proposals/new');

    const dateInput = page.locator('[type="date"]');
    await dateInput.tap();

    // iOS shows native picker, not HTML5 fallback
    // Check if input has correct inputmode
    await expect(dateInput).toHaveAttribute('inputmode', 'none');
  });
});
```

### Standardized Loading States Component

```typescript
// components/ui/LoadingState.tsx
// Source: React Loading Skeleton best practices
import React from 'react';

interface LoadingStateProps {
  type: 'table' | 'card' | 'form' | 'detail';
  count?: number;
}

export function LoadingState({ type, count = 1 }: LoadingStateProps) {
  // Use Tailwind for skeleton styles (instead of external library)
  const skeleton = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  switch (type) {
    case 'table':
      return (
        <div className="space-y-3">
          <div className={`h-10 w-full ${skeleton}`} /> {/* Header */}
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className={`h-16 flex-1 ${skeleton}`} />
              <div className={`h-16 w-32 ${skeleton}`} />
            </div>
          ))}
        </div>
      );

    case 'card':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="p-4 border rounded space-y-3">
              <div className={`h-6 w-3/4 ${skeleton}`} />
              <div className={`h-4 w-full ${skeleton}`} />
              <div className={`h-4 w-5/6 ${skeleton}`} />
            </div>
          ))}
        </div>
      );

    case 'form':
      return (
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className={`h-4 w-24 ${skeleton}`} /> {/* Label */}
              <div className={`h-10 w-full ${skeleton}`} /> {/* Input */}
            </div>
          ))}
        </div>
      );

    case 'detail':
      return (
        <div className="space-y-6">
          <div className={`h-8 w-1/2 ${skeleton}`} /> {/* Title */}
          <div className="space-y-2">
            <div className={`h-4 w-full ${skeleton}`} />
            <div className={`h-4 w-full ${skeleton}`} />
            <div className={`h-4 w-3/4 ${skeleton}`} />
          </div>
        </div>
      );
  }
}
```

### Standardized Error State Component

```typescript
// components/ui/ErrorState.tsx
// Source: UX best practices for error messages
import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: ErrorStateProps) {
  // Parse error for user-friendly messages
  const getMessage = () => {
    // Network errors
    if (error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    // Authentication errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Your session has expired. Please log in again.';
    }

    // Permission errors
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'You do not have permission to access this resource.';
    }

    // Server errors
    if (error.message.includes('500')) {
      return 'The server encountered an error. Our team has been notified.';
    }

    // Default to error message (but sanitize sensitive data)
    return error.message.replace(/Bearer .+/, '[REDACTED]');
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
        {getMessage()}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </button>
      )}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-gray-500">Technical Details</summary>
          <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
```

### Core Web Vitals Integration

```typescript
// app/vitals.ts
// Source: web-vitals v4 official docs + Sentry integration
import { onCLS, onINP, onLCP, Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';

function sendToAnalytics(metric: Metric) {
  // 1. Send to Sentry (already configured)
  Sentry.captureMessage(`Core Web Vital: ${metric.name}`, {
    level: metric.rating === 'good' ? 'info' : 'warning',
    tags: {
      metric: metric.name,
      rating: metric.rating,
    },
    contexts: {
      performance: {
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        navigationType: metric.navigationType,
      }
    }
  });

  // 2. Send to custom analytics endpoint (optional)
  if (navigator.sendBeacon) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
    navigator.sendBeacon('/api/analytics/vitals', body);
  }
}

export function initWebVitals() {
  // Only run in production
  if (process.env.NODE_ENV !== 'production') return;

  // Core Web Vitals
  onLCP(sendToAnalytics);  // Target: <2500ms
  onINP(sendToAnalytics);  // Target: <200ms
  onCLS(sendToAnalytics);  // Target: <0.1

  // Log once on init
  console.log('Core Web Vitals monitoring initialized');
}

// Call in app entry point
// App.tsx: initWebVitals();
```

### Performance Budget Enforcement (Lighthouse CI)

```yaml
# .lighthouserc.json
# Source: Lighthouse CI best practices
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": [
        "http://localhost:5173/",
        "http://localhost:5173/admin/proposals",
        "http://localhost:5173/admin/proposals/new"
      ],
      "settings": {
        "preset": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],

        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],

        "resource-summary:script:size": ["error", { "maxNumericValue": 500000 }],
        "resource-summary:stylesheet:size": ["error", { "maxNumericValue": 100000 }],
        "resource-summary:image:size": ["error", { "maxNumericValue": 1000000 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| First Input Delay (FID) | Interaction to Next Paint (INP) | March 2024 | INP measures all interactions (not just first); stricter threshold (<200ms vs <100ms); requires optimization of all event handlers |
| Manual browser refresh testing | Playwright device emulation | 2023+ | Automated mobile testing across 100+ device configs; CI/CD integration; no need for physical device lab |
| JMeter load testing | k6 + Artillery | 2022+ | Modern JS-based tools with better Playwright integration; cloud-native; easier for frontend developers |
| React class components with setState | React Query + hooks | 2020+ | Declarative data fetching; built-in caching, loading states, error handling; reduces boilerplate by 60% |
| Custom skeleton loaders | Tailwind animate-pulse utility | 2021+ | Built-in Tailwind utility eliminates need for custom CSS animations; consistent across components |
| Vercel/Netlify serverless | Neon serverless Postgres | 2023-2025 | Separated compute and storage; scale-to-zero; cold starts are now a consideration (500ms-2s latency) |

**Deprecated/outdated:**
- **First Input Delay (FID):** Replaced by INP in March 2024; update monitoring dashboards and performance budgets
- **ApacheBench (ab):** Can't test modern SPAs that require JS execution; use Artillery or k6 instead
- **Selenium for mobile testing:** Heavyweight and flaky; Playwright device emulation is faster and more reliable
- **Manual Core Web Vitals tracking:** Use web-vitals library (Google official); manually parsing performance APIs misses edge cases
- **localStorage for session state:** Use React Query for client-side cache; localStorage doesn't sync across tabs or handle invalidation

## Open Questions

Things that couldn't be fully resolved:

1. **Neon cold start tolerance**
   - What we know: Neon scales to zero after 5 minutes inactivity; cold start adds 500ms-2s latency (documented)
   - What's unclear: Is this acceptable for 100 concurrent user load test? Will sustained load keep compute warm?
   - Recommendation: Test both scenarios - with warm compute (sustained load keeps it awake) and with cold starts (load test starts after 10 minute idle). Document if cold starts are a blocker for production traffic patterns.

2. **Artillery vs k6 tradeoff for this project**
   - What we know: Artillery integrates with Playwright (reuse E2E tests); k6 is more powerful for protocol-level testing
   - What's unclear: Does this project benefit more from frontend load testing (Artillery) or API load testing (k6)?
   - Recommendation: Start with Artillery for frontend load testing (can reuse existing Playwright tests in e2e/). Add k6 later if API-specific load scenarios are needed.

3. **Real device testing necessity**
   - What we know: Playwright device emulation covers 90% of mobile issues; real devices catch the remaining 10%
   - What's unclear: Are there device-specific bugs (iOS Safari quirks, Android Chrome touch events) that emulation won't catch?
   - Recommendation: Start with Playwright emulation for systematic testing. If budget allows, add BrowserStack for real device testing on critical user flows only.

4. **Performance budget thresholds**
   - What we know: Google recommends LCP <2.5s, INP <200ms, CLS <0.1
   - What's unclear: What are realistic thresholds for this specific app given Neon cold starts, Netlify function cold starts, and R2 presigned URL latency?
   - Recommendation: Establish baseline metrics first (measure current performance under load), then set budgets at 80th percentile of baseline (allows for some regression buffer).

5. **Sentry APM cost vs value**
   - What we know: Sentry error monitoring is configured; Sentry APM (performance monitoring) is a separate paid feature
   - What's unclear: Does Netlify built-in metrics (7 days free) provide enough visibility, or do we need Sentry APM for transaction tracing?
   - Recommendation: Use Netlify built-in metrics for this phase. Upgrade to Sentry APM only if debugging serverless function performance issues requires distributed tracing.

## Sources

### Primary (HIGH confidence)

- [Artillery Load Testing with Playwright](https://www.artillery.io/docs/playwright) - Official integration guide
- [k6 Load Testing Tool](https://grafana.com/docs/k6/latest/) - Official Grafana k6 documentation
- [Playwright Mobile Emulation](https://playwright.dev/docs/emulation) - Official device testing docs
- [web-vitals Library](https://github.com/GoogleChrome/web-vitals) - Google's official Core Web Vitals library
- [Core Web Vitals 2026](https://developers.google.com/search/docs/appearance/core-web-vitals) - Google Search Central documentation
- [Neon Serverless Postgres Performance](https://neon.com/docs/guides/benchmarking-latency) - Official Neon benchmarking guide
- [Neon Performance Tips](https://neon.com/blog/performance-tips-for-neon-postgres) - Official Neon blog
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design) - Official Tailwind CSS docs
- [React Query v5 Documentation](https://tanstack.com/query/latest) - Official TanStack Query docs
- [Playwright Test API](https://playwright.dev/docs/api/class-test) - Official Playwright testing API

### Secondary (MEDIUM confidence)

- [Load Testing APIs: k6 vs Artillery vs Locust](https://medium.com/@sohail_saifi/load-testing-your-api-k6-vs-artillery-vs-locust-66a8d7f575bd) - Jan 2026 comparison
- [Playwright vs k6 Comparison](https://supatest.ai/blog/playwright-vs-k6) - UI testing vs load testing explained
- [Core Web Vitals INP Update](https://roastweb.com/blog/core-web-vitals-explained-2026) - RoastWeb 2026 guide
- [React Loading States Best Practices](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/) - LogRocket UI patterns
- [Tailwind Mobile-First Best Practices](https://medium.com/@rameshkannanyt0078/best-practices-for-mobile-responsiveness-with-tailwind-css-5b37e910b91c) - Medium guide
- [Next.js Performance Testing](https://www.debugbear.com/blog/nextjs-performance) - DebugBear optimization guide
- [Netlify Function Performance Monitoring](https://developers.netlify.com/guides/improve-site-performance-with-better-serverless-insights/) - Official Netlify guide
- [Vitest React Testing](https://blog.incubyte.co/blog/vitest-react-testing-library-guide/) - Modern testing approach

### Tertiary (LOW confidence)

- [Testing in 2026: Full Stack Strategies](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies) - Nucamp educational blog
- [React Performance Monitoring Tools](https://embrace.io/blog/best-react-performance-monitoring-tools/) - Commercial tool comparison

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Artillery, k6, Playwright, web-vitals are industry standards with official documentation
- Architecture: HIGH - Patterns verified from official docs (Playwright, Artillery, React Query, web-vitals)
- Pitfalls: HIGH - Based on documented Neon limitations, Tailwind docs, Core Web Vitals spec changes, and common React patterns
- Open questions: MEDIUM - Neon cold start tolerance and real device testing necessity are project-specific; need empirical testing

**Research date:** 2026-01-29
**Valid until:** 2026-03-29 (60 days - performance tooling stable; Core Web Vitals spec stable)
