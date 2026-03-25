# Accessibility Contrast Audit — Light & Dark Mode

**Date:** 2026-03-19
**Status:** Brainstorm Complete

## What We're Building

An end-to-end accessibility color contrast audit and automated test suite for all screens in the Motionify PM Portal, covering both light and dark themes. The system will:

1. **Audit** all ~20 screens for WCAG 2.1 AAA contrast violations (7:1 for normal text, 4.5:1 for large text/UI elements)
2. **Report** per-screen, per-element violations with actionable details
3. **Automate** contrast checks in CI via Playwright + axe-core to prevent regressions

## Why This Approach

**Playwright + axe-core** was chosen over Lighthouse CI and pa11y because:

- Builds on the existing Playwright e2e infrastructure (config, auth flows, mobile viewports)
- axe-core provides granular per-element contrast violation reports with suggested fixes
- Native support for theme toggling via `next-themes` before each scan
- Runs in CI alongside existing e2e tests
- axe-core's `color-contrast` rule supports WCAG 2.1 AAA via `runOnly` configuration

## Key Decisions

1. **Standard:** WCAG 2.1 AAA — strictest contrast requirements (7:1 normal text, 4.5:1 large text)
2. **Theme scope:** Both light and dark modes tested in every screen
3. **Tooling:** `@axe-core/playwright` integrated into existing Playwright setup
4. **Auth handling:** Reuse existing e2e test auth infrastructure
5. **Primary focus:** Color contrast (not keyboard nav or screen reader at this stage)
6. **Screen coverage:** All ~20 routes including authenticated admin/client pages

## Screens to Audit

- Landing Page (public)
- Login
- Dashboard
- Project List / Project Detail / Project Settings
- Create Project / New Project Router
- Deliverable Review
- Inquiry Tracking
- Admin: Inquiry Dashboard / Inquiry Detail
- Admin: Proposal Builder / Proposal Detail
- Admin: User Management
- Admin: Activity Logs
- Admin: Payments
- Settings
- Payment (client)

## Implementation Outline (for planning phase)

1. Install `@axe-core/playwright`
2. Create a shared accessibility test helper that:
   - Accepts a route and auth context
   - Toggles theme (light/dark) via `next-themes`
   - Runs axe with `color-contrast` rule at AAA level
   - Captures screenshots on violations
3. Write test specs covering all screens x both themes
4. Generate an HTML violation report for the initial audit
5. Fix identified contrast violations in CSS variables / component styles
6. Add to CI pipeline

## Resolved Questions

- **Auth approach:** Reuse existing e2e auth flows (no Storybook isolation needed)
- **Theme testing:** Both modes in a single test run, not separate phases
- **Scope:** Color contrast only for now; keyboard/screen reader can be added later
