---
title: "feat: Add WCAG 2.1 AAA Color Contrast Audit and Automated Tests"
type: feat
status: completed
date: 2026-03-19
origin: docs/brainstorms/2026-03-19-accessibility-contrast-audit-brainstorm.md
---

# feat: Add WCAG 2.1 AAA Color Contrast Audit and Automated Tests

## Overview

Add end-to-end accessibility color contrast testing for all portal screens using Playwright + axe-core. The system audits every screen in both light and dark mode against WCAG 2.1 AAA contrast ratios (7:1 normal text, 4.5:1 large text/UI elements), generates violation reports, and runs in CI to prevent regressions.

(see brainstorm: docs/brainstorms/2026-03-19-accessibility-contrast-audit-brainstorm.md)

## Problem Statement / Motivation

The portal currently has zero accessibility testing infrastructure. With 50+ CSS color variables across light and dark themes, contrast violations can easily slip in during development. WCAG 2.1 AAA compliance ensures maximum inclusivity and positions the product well for enterprise clients who may require accessibility certifications.

## Proposed Solution

Extend the existing Playwright e2e infrastructure with `@axe-core/playwright` to run color-contrast checks on every screen in both themes. Reuse existing auth mocking patterns and create a shared test helper that handles theme toggling and axe scanning.

### Architecture

```
e2e/
├── a11y/
│   ├── helpers/
│   │   └── a11y-helper.ts          # Shared: auth, theme toggle, axe scan
│   ├── public-screens.a11y.spec.ts  # Landing, Login, Inquiry Tracking
│   ├── client-screens.a11y.spec.ts  # Client-role protected screens
│   └── admin-screens.a11y.spec.ts   # Admin-role protected screens
```

### Implementation Phases

#### Phase 1: Infrastructure Setup

**Install dependency:**
```bash
npm install -D @axe-core/playwright
```

**Create shared helper** at `e2e/a11y/helpers/a11y-helper.ts`:

```typescript
// e2e/a11y/helpers/a11y-helper.ts
import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

// Auth mock users (reuse pattern from comment-system.spec.ts)
export const ADMIN_USER = {
  id: 'test-admin-id',
  email: 'admin@test.com',
  role: 'admin',
  name: 'Test Admin'
};

export const CLIENT_USER = {
  id: 'test-client-id',
  email: 'client@test.com',
  role: 'client',
  name: 'Test Client'
};

// Auth mock setup (from existing e2e pattern)
export async function setupAuth(page: Page, user: typeof ADMIN_USER) {
  await page.route('**/.netlify/functions/auth-me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user })
    });
  });
  // Mock other API routes as needed to prevent 404s
  await page.route('**/.netlify/functions/**', async (route) => {
    const url = route.request().url();
    if (url.includes('auth-me')) return; // already handled
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }) });
  });
  await page.goto('/portal/login');
  await page.evaluate((userData) => {
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_expires', new Date(Date.now() + 86400000).toISOString());
  }, user);
}

// Theme toggle via class manipulation (next-themes uses attribute="class")
export async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, theme);
  // Allow CSS to repaint
  await page.waitForTimeout(100);
}

// Run axe color-contrast check at AAA level
export async function checkContrast(page: Page, screenName: string, theme: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aaa'])
    .withRules(['color-contrast-enhanced']) // AAA-level contrast rule
    .analyze();

  // Log violations for audit report
  if (results.violations.length > 0) {
    console.log(`\n[${theme.toUpperCase()}] ${screenName}: ${results.violations.length} violation(s)`);
    for (const v of results.violations) {
      for (const node of v.nodes) {
        console.log(`  - ${node.target.join(' > ')}: ${node.failureSummary}`);
      }
    }
  }

  return results;
}

// Combined helper: set theme + check contrast + optional screenshot
export async function auditScreen(
  page: Page,
  route: string,
  screenName: string,
  options?: { takeScreenshot?: boolean }
) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');

  const results: Record<string, any> = {};

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    results[theme] = await checkContrast(page, screenName, theme);

    if (options?.takeScreenshot && results[theme].violations.length > 0) {
      await page.screenshot({
        path: `test-results/a11y-${screenName.toLowerCase().replace(/\s+/g, '-')}-${theme}.png`,
        fullPage: true
      });
    }
  }

  return results;
}
```

#### Phase 2: Test Specs — All Screens

**Public screens** at `e2e/a11y/public-screens.a11y.spec.ts`:
- Landing Page (`/portal/landing`)
- Login (`/portal/login`)
- Inquiry Tracking (`/portal/inquiry-status/TEST-001`)

**Admin screens** at `e2e/a11y/admin-screens.a11y.spec.ts`:
- Dashboard (`/portal/`)
- Project List (`/portal/projects`)
- Project Detail — all 7 tabs (`/portal/projects/1/1` through `/portal/projects/1/7`)
- Project Settings (`/portal/projects/1/settings`)
- Deliverable Review (`/portal/projects/1/deliverables/1`)
- Inquiry Dashboard (`/portal/admin/inquiries`)
- Inquiry Detail (`/portal/admin/inquiries/1`)
- Proposal Builder (`/portal/admin/inquiries/1/proposal`)
- Proposal Detail (`/portal/admin/proposals/1`)
- User Management (`/portal/admin/users`)
- Activity Logs (`/portal/admin/activity-logs`)
- Payments (`/portal/admin/payments`)
- Settings (`/portal/settings`)

**Client screens** at `e2e/a11y/client-screens.a11y.spec.ts`:
- Dashboard / Projects redirect (`/portal/`)
- Project List (`/portal/projects`)
- Project Detail — all 7 tabs
- Deliverable Review
- Payment (`/portal/payment/1`)
- Settings (`/portal/settings`)

Each test follows the pattern:
```typescript
test('Dashboard has no AAA contrast violations', async ({ page }) => {
  await setupAuth(page, ADMIN_USER);
  const results = await auditScreen(page, '/portal/', 'Dashboard', { takeScreenshot: true });
  expect(results.light.violations).toHaveLength(0);
  expect(results.dark.violations).toHaveLength(0);
});
```

#### Phase 3: Initial Audit Run

1. Build the portal: `npm run build`
2. Run the a11y tests with violations allowed (first pass is diagnostic):
   ```bash
   npx playwright test e2e/a11y/ --reporter=html
   ```
3. Review the HTML report at `playwright-report/index.html`
4. Document all violations with their element selectors and current contrast ratios

#### Phase 4: Fix Contrast Violations

Priority order for fixes:
1. **CSS variable pairs** in `index.css` — adjust `:root` and `.dark` blocks
   - `--foreground` / `--background`
   - `--muted-foreground` / `--muted` (most likely to fail AAA)
   - `--accent-foreground` / `--accent`
   - `--primary-foreground` / `--primary`
2. **Component-level overrides** — any hardcoded colors in components
3. **Disabled/placeholder states** — often low contrast by design, may need exceptions

#### Phase 5: CI Integration

Add to existing Playwright CI config:
- Run a11y tests as a separate Playwright project or test grep
- Fail on any AAA contrast violation (strict enforcement)
- Generate HTML report artifact on failure

## Technical Considerations

- **axe-core `color-contrast-enhanced` rule** is the AAA-level rule (7:1 ratio). The standard `color-contrast` rule only checks AA (4.5:1). Must use `withRules(['color-contrast-enhanced'])` explicitly.
- **Dynamic content**: Tests mock API responses, so screens render with placeholder/empty data. This covers the default state. Modal/dialog contrast should be tested separately if they use different color schemes.
- **Landing page (Next.js)**: Out of scope for this phase — it's a separate app with its own oklch color system and build pipeline. Can be added later with a dedicated Playwright config.
- **`resolvedTheme` vs `theme`**: Per institutional learning, test against the `dark` class on `<html>` (which reflects resolvedTheme), not the localStorage `theme` value. For contrast testing, we only care about the visual output.
- **API mocking**: All protected routes need `page.route()` mocks to prevent network errors. Use a catch-all mock returning empty arrays for list endpoints.
- **Screenshots**: Capture full-page screenshots on violation for visual debugging.

## Acceptance Criteria

- [x] `@axe-core/playwright` installed as dev dependency
- [x] Shared a11y helper at `e2e/a11y/helpers/a11y-helper.ts` with auth, theme toggle, and contrast check
- [x] All ~18 public + protected routes tested in both light and dark mode
- [x] Project Detail tested across all 7 tabs
- [x] Admin-only and client-only screens tested with correct role auth
- [x] Initial audit report generated (HTML) documenting all current violations
- [x] All AAA contrast violations fixed in CSS variables (`index.css` `:root` and `.dark` blocks)
- [x] Zero AAA contrast violations on re-run across all screens and both themes
- [x] Tests produce screenshots on violation for debugging
- [x] Tests can run in CI alongside existing e2e suite

## Success Metrics

- **Zero violations**: All screens pass `color-contrast-enhanced` (AAA) in both themes
- **Coverage**: 100% of portal routes covered (18+ screens including all Project Detail tabs)
- **Regression prevention**: Any new contrast violation fails CI

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| AAA may be too strict for some UI elements (disabled states, decorative text) | Use axe `exclude` selectors for genuinely decorative elements; document exceptions |
| Mocked API returns empty data — misses contrast issues in populated states | Add a second pass with seeded mock data for key screens |
| Some screens may not render fully with catch-all API mocks | Add specific mock responses per screen as needed (follow existing test patterns) |
| CSS variable changes for AAA may shift the visual design significantly | Review with stakeholder before applying fixes; prefer minimal adjustments |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-19-accessibility-contrast-audit-brainstorm.md](docs/brainstorms/2026-03-19-accessibility-contrast-audit-brainstorm.md) — Key decisions: WCAG 2.1 AAA, Playwright + axe-core, both themes, color contrast focus only
- **Existing auth mock pattern:** `e2e/comment-system.spec.ts` — `setupAuthMocks()` function
- **Theme system:** `App.tsx:77` — `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
- **CSS variables:** `index.css:12-170` (light), `index.css:208-261` (dark)
- **Route map:** `App.tsx:91-122` — all portal routes with BrowserRouter
- **Theme toggle learning:** `docs/solutions/best-practices/theme-toggle-three-state-icon-pattern-20260221.md`
- **axe-core Playwright docs:** https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright
