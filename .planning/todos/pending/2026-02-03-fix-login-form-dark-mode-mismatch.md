---
created: 2026-02-03T16:44
title: Fix login form dark mode mismatch
area: ui
files:
  - landing-page-new/src/app/login (likely location)
---

## Problem

The login page renders in light mode (light background, light text for "Welcome Back" and "Login to your account") but the login form card uses dark mode styling (dark/black background with white text for "Login via Email", dark input field). This creates a visual inconsistency where the page and form themes don't match.

The form card should match the page's light mode theme — light background, appropriate contrast text, and light-styled input fields.

## Solution

TBD — Locate the login form component and update its styling to use light mode colors consistent with the page background. Likely a CSS/Tailwind class issue on the form card container.
