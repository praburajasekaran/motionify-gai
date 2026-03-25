---
phase: PROD-12-extended-testing
plan: 05
type: execute
wave: 2
depends_on: ["PROD-12-03"]
files_modified:
  - lib/vitals.ts
  - index.tsx
  - landing-page-new/src/lib/vitals.ts
  - landing-page-new/src/app/layout.tsx
  - package.json
autonomous: true

must_haves:
  truths:
    - "web-vitals library installed and measuring LCP, INP, CLS"
    - "Core Web Vitals reported to Sentry in production"
    - "Vitals initialized in both admin and client portal entry points"
    - "Development mode logs vitals to console for debugging"
  artifacts:
    - path: "lib/vitals.ts"
      provides: "Admin portal Core Web Vitals measurement and reporting"
      exports: ["initWebVitals"]
    - path: "landing-page-new/src/lib/vitals.ts"
      provides: "Client portal Core Web Vitals measurement and reporting"
      exports: ["reportWebVitals"]
    - path: "package.json"
      provides: "web-vitals dependency added"
      contains: "web-vitals"
  key_links:
    - from: "lib/vitals.ts"
      to: "web-vitals"
      via: "import"
      pattern: "import.*web-vitals"
    - from: "index.tsx"
      to: "lib/vitals.ts"
      via: "import and call initWebVitals"
      pattern: "initWebVitals"
    - from: "lib/vitals.ts"
      to: "@sentry/react"
      via: "Sentry captureMessage for metrics"
      pattern: "Sentry"
---

<objective>
Add Core Web Vitals monitoring using the web-vitals library, reporting metrics to Sentry for production monitoring and console for development debugging.

Purpose: Establish performance baseline measurements (LCP < 2.5s, INP < 200ms, CLS < 0.1) and ongoing monitoring to detect regressions before they impact users.
Output: Web Vitals measurement initialized in both portals, metrics flowing to Sentry in production.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-12-extended-testing/PROD-12-RESEARCH.md
@index.tsx
@landing-page-new/src/app/layout.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install web-vitals and create vitals reporting modules</name>
  <files>
    package.json
    lib/vitals.ts
    landing-page-new/src/lib/vitals.ts
  </files>
  <action>
    1. Install web-vitals in both projects:
       ```bash
       npm install web-vitals
       cd landing-page-new && npm install web-vitals
       ```

    2. Create `lib/vitals.ts` (admin portal - Vite SPA):
       - Import `onCLS, onINP, onLCP, onFCP, onTTFB` from 'web-vitals' (use type `Metric` from web-vitals)
       - Create `sendToAnalytics(metric: Metric)` function:
         - In development (`import.meta.env.DEV`): `console.log` with formatted output showing metric name, value, rating (good/needs-improvement/poor), and delta
         - In production: Try to import `@sentry/react` dynamically and call `Sentry.captureMessage` with:
           - Message: `Web Vital: ${metric.name}`
           - Level: metric.rating === 'good' ? 'info' : 'warning'
           - Tags: { metric: metric.name, rating: metric.rating }
           - Contexts: { performance: { value, id, delta, navigationType } }
         - If Sentry not available, use `navigator.sendBeacon` as fallback (fire and forget to `/api/analytics/vitals` - this endpoint doesn't need to exist yet, just log the attempt)
       - Export `initWebVitals()` function:
         - Call `onLCP(sendToAnalytics)` - target < 2500ms
         - Call `onINP(sendToAnalytics)` - target < 200ms
         - Call `onCLS(sendToAnalytics)` - target < 0.1
         - Call `onFCP(sendToAnalytics)` - first contentful paint
         - Call `onTTFB(sendToAnalytics)` - time to first byte

    3. Create `landing-page-new/src/lib/vitals.ts` (client portal - Next.js):
       - Next.js has built-in web vitals support via `reportWebVitals` export
       - Create and export `reportWebVitals(metric)` function with same Sentry reporting logic
       - Use `process.env.NODE_ENV` instead of `import.meta.env`
       - Same metric reporting: console in dev, Sentry in production

    Note: Use dynamic import for Sentry (`import('@sentry/react')`) to avoid making it a hard dependency. If Sentry is not configured, vitals still log to console in dev and silently skip reporting in production.
  </action>
  <verify>
    Run `npm run build` to verify admin portal builds with web-vitals.
    Run `cd landing-page-new && npm run build` to verify client portal builds.
    Check that both vitals.ts files export their respective functions.
  </verify>
  <done>
    web-vitals installed in both projects. Vitals modules created with development console logging and production Sentry reporting. Measures LCP, INP, CLS, FCP, and TTFB.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire vitals initialization into app entry points</name>
  <files>
    index.tsx
    landing-page-new/src/app/layout.tsx
  </files>
  <action>
    1. Update `index.tsx` (admin portal entry point):
       - Import `initWebVitals` from `./lib/vitals`
       - Call `initWebVitals()` after the React root is created (after `ReactDOM.createRoot(...).render(...)`)
       - This ensures vitals measurement starts after the app is mounted

    2. Update `landing-page-new/src/app/layout.tsx` (client portal):
       - Next.js App Router handles web vitals differently. Create a small client component `WebVitals.tsx`:
         - Create `landing-page-new/src/components/WebVitals.tsx` (if needed)
         - 'use client' directive
         - Import `useReportWebVitals` from 'next/web-vitals' if available, OR
         - Use a useEffect to call the vitals init function from `lib/vitals.ts`
         - Export as default component that renders null
       - Import and include `<WebVitals />` in the layout body
       - Alternatively, if Next.js supports `reportWebVitals` export from layout, use that approach instead

    Keep changes minimal in entry points - just the import and single function call.
  </action>
  <verify>
    Run `npm run build` for both portals to verify no build errors.
    Start dev server and check browser console for "Web Vital:" or "Core Web Vital:" log messages after page load.
  </verify>
  <done>
    Web Vitals initialized in both portal entry points. Admin portal calls initWebVitals() on mount. Client portal uses Next.js-compatible approach. Development console shows vitals measurements on each page load.
  </done>
</task>

</tasks>

<verification>
1. `web-vitals` appears in both package.json files
2. `lib/vitals.ts` exports `initWebVitals`
3. `landing-page-new/src/lib/vitals.ts` exports vitals reporting function
4. `index.tsx` calls `initWebVitals()`
5. Client portal layout includes vitals initialization
6. Both portals build successfully
7. Dev console shows Web Vital metrics (LCP, INP, CLS) after page load
</verification>

<success_criteria>
Core Web Vitals measurement active in both portals. Development mode shows metrics in console. Production mode reports to Sentry with rating tags. Measures all current Core Web Vitals: LCP (target < 2.5s), INP (target < 200ms), CLS (target < 0.1), plus FCP and TTFB.
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-12-extended-testing/PROD-12-05-SUMMARY.md`
</output>
