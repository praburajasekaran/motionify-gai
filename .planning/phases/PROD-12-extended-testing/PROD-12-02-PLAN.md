---
phase: PROD-12-extended-testing
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - e2e/mobile/mobile-responsive.spec.ts
  - e2e/mobile/mobile-proposal.spec.ts
  - playwright.config.ts
autonomous: true

must_haves:
  truths:
    - "Playwright config includes mobile device projects (iPhone 13, Pixel 5, Galaxy S9+)"
    - "Mobile E2E tests verify pages render correctly on mobile viewports"
    - "Touch interactions tested (tap, scroll) on mobile devices"
    - "Tables and forms usable on small screens"
  artifacts:
    - path: "e2e/mobile/mobile-responsive.spec.ts"
      provides: "Responsive breakpoint tests across 4 viewport sizes"
    - path: "e2e/mobile/mobile-proposal.spec.ts"
      provides: "Mobile-specific proposal workflow tests with device emulation"
    - path: "playwright.config.ts"
      provides: "Updated config with mobile device projects"
  key_links:
    - from: "e2e/mobile/mobile-responsive.spec.ts"
      to: "playwright.config.ts"
      via: "Playwright test runner reads config"
      pattern: "devices\\["
    - from: "e2e/mobile/mobile-proposal.spec.ts"
      to: "http://localhost:8888"
      via: "baseURL from Playwright config"
      pattern: "page.goto"
---

<objective>
Create mobile responsiveness test suite using Playwright device emulation to verify all pages work on mobile devices with smooth touch interactions.

Purpose: Ensure the application is fully usable on mobile devices before client demo, catching responsive layout issues systematically rather than ad-hoc.
Output: Mobile E2E test specs and updated Playwright config with mobile device projects.
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
@playwright.config.ts
@e2e/admin-smoke.spec.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add mobile device projects to Playwright config</name>
  <files>playwright.config.ts</files>
  <action>
    Update `playwright.config.ts` to add mobile device projects alongside the existing Desktop Chrome project:

    1. Import `devices` from `@playwright/test` (already imported).
    2. Add 3 new projects to the `projects` array:
       - `{ name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } }` - Android mobile
       - `{ name: 'Mobile Safari', use: { ...devices['iPhone 13'] } }` - iOS mobile
       - `{ name: 'Mobile Safari Large', use: { ...devices['iPhone 13 Pro Max'] } }` - Large iOS

    3. Keep the existing Desktop Chrome project as-is.

    4. Add a `testMatch` pattern so mobile tests only run for mobile projects:
       - For mobile projects, use `testMatch: '**/mobile/**'` to only match files in e2e/mobile/
       - For Desktop Chrome, use `testIgnore: '**/mobile/**'` to skip mobile-only tests

    This way `npx playwright test` runs desktop tests normally, and `npx playwright test --project="Mobile Chrome"` runs mobile tests.
  </action>
  <verify>
    Run `npx playwright test --list --project="Mobile Chrome"` to verify the project is recognized (even if no tests exist yet).
    Run `npx playwright test --list --project="chromium"` to verify desktop tests still listed.
  </verify>
  <done>
    Playwright config updated with 3 mobile device projects (Pixel 5, iPhone 13, iPhone 13 Pro Max). Mobile tests isolated in e2e/mobile/ directory. Desktop tests unaffected.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create mobile responsiveness and proposal workflow tests</name>
  <files>
    e2e/mobile/mobile-responsive.spec.ts
    e2e/mobile/mobile-proposal.spec.ts
  </files>
  <action>
    1. Create `e2e/mobile/` directory.

    2. Create `e2e/mobile/mobile-responsive.spec.ts` - Breakpoint-based responsive tests:
       - Import `test, expect` from `@playwright/test`
       - Define breakpoints array: Mobile 320px, Mobile 375px, Tablet 768px, Desktop 1024px
       - For each breakpoint, use `test.describe` with `test.use({ viewport })`:
         a. Test "admin dashboard renders correctly" - navigate to `/admin`, verify no horizontal overflow (document.documentElement.scrollWidth <= viewport.width)
         b. Test "navigation is accessible" - verify sidebar or hamburger menu visible
         c. Test "tables are scrollable on mobile" - if viewport < 640px, check that tables have `overflow-x-auto` wrapper or are within a scrollable container

    3. Create `e2e/mobile/mobile-proposal.spec.ts` - Device-specific proposal tests:
       - Import `test, expect, devices` from `@playwright/test`
       - Define mobileDevices array: `devices['iPhone 13']`, `devices['Pixel 5']`, `devices['Galaxy S9+']`
       - For each device, test.describe with `test.use({ ...device })`:
         a. Test "proposal list page loads" - navigate to proposals page, wait for content, verify main content visible
         b. Test "proposal detail accessible" - navigate to a proposal detail, verify content renders
         c. Test "forms are usable" - navigate to proposal creation/edit, verify input fields are visible and have minimum 44px touch target height (iOS guideline)
         d. Test "buttons have adequate touch targets" - check primary action buttons are at least 44x44px

       - Use `page.goto()` with appropriate URLs based on the admin portal (http://localhost:8888)
       - Handle auth if needed (look at existing e2e/admin-smoke.spec.ts for the auth pattern)
  </action>
  <verify>
    Run `npx playwright test e2e/mobile/ --project="Mobile Chrome" --list` to verify tests are discovered.
    Check that test files have valid TypeScript syntax: `npx tsc --noEmit --project tsconfig.json` (or just verify file structure).
  </verify>
  <done>
    Mobile test suite created with responsive breakpoint tests (4 viewports) and device-specific proposal workflow tests (3 devices). Tests verify layout correctness, touch target sizes, table scrollability, and form usability on mobile.
  </done>
</task>

</tasks>

<verification>
1. `playwright.config.ts` has 4 projects (Desktop Chrome + 3 mobile)
2. `e2e/mobile/mobile-responsive.spec.ts` exists with breakpoint tests
3. `e2e/mobile/mobile-proposal.spec.ts` exists with device emulation tests
4. `npx playwright test --list --project="Mobile Chrome"` lists mobile tests
5. Desktop tests still work: `npx playwright test --list --project="chromium"`
</verification>

<success_criteria>
Playwright configured with mobile device projects. Mobile E2E test suite covers responsive layout verification across 4 viewports and 3 mobile devices. Touch target validation for forms and buttons. Tests discoverable and runnable via Playwright CLI.
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-12-extended-testing/PROD-12-02-SUMMARY.md`
</output>
