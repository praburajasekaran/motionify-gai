---
module: Landing Page
date: 2026-02-20
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Buttons show default arrow cursor instead of hand/pointer on hover"
  - "Users cannot identify interactive elements as clickable"
root_cause: config_error
resolution_type: config_change
severity: medium
tags: [tailwind-v4, cursor-pointer, preflight, buttons, next-js, react]
---

# Troubleshooting: Tailwind v4 Preflight Removes Pointer Cursor on Buttons

## Problem

In a Next.js app using Tailwind CSS v4, all `<button>` elements show the default arrow cursor on hover instead of the hand/pointer cursor, making interactive elements feel unclickable. `<a>` tags are unaffected.

## Environment

- Module: Landing Page (Next.js)
- Affected Component: All `<button>` elements site-wide
- Tailwind Version: v4 (`@import "tailwindcss"`)
- Date: 2026-02-20

## Symptoms

- Hovering over buttons shows the default `cursor: default` arrow instead of the pointer hand
- `<a>` anchor tags are unaffected (they show pointer correctly)
- No console errors — purely a visual/UX issue
- Affects ALL button elements: quiz option chips, CTA buttons, nav buttons

## What Didn't Work

**Attempted Solution 1:** Global CSS rule without `!important`

```css
button, [role="button"], a {
  cursor: pointer;
}
```

- **Why it failed:** Tailwind v4's preflight styles are generated inside a CSS `@layer base`. In practice, the preflight rule targeting `button, [type='button'], [type='submit'], [type='reset']` with `cursor: default` was overriding our unlayered rule for button elements (though `<a>` tags, which preflight doesn't target with cursor, were correctly fixed).

## Solution

Expand the selector and add `!important` to ensure the rule wins over Tailwind's preflight:

**File:** `landing-page-new/src/app/globals.css`

```css
/* Before (broken for <button> elements): */
button, [role="button"], a {
  cursor: pointer;
}

/* After (fixed — placed after @plugin "tailwindcss-animate"): */
button, [type="button"], [type="submit"], [type="reset"], [role="button"], a {
  cursor: pointer !important;
}
```

Place the rule directly after the Tailwind plugin imports, before `:root {}`:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));
@plugin "tailwindcss-animate";

button, [type="button"], [type="submit"], [type="reset"], [role="button"], a {
  cursor: pointer !important;
}

:root {
  /* ... */
}
```

## Why This Works

Tailwind v4's preflight (included via `@import "tailwindcss"`) explicitly targets `button, [type='button'], [type='submit'], [type='reset']` and sets `cursor: default`. This resets the browser's native pointer cursor on buttons.

The fix works because:
1. The expanded selector covers all button type variants that Tailwind's preflight targets
2. `!important` ensures our rule wins regardless of layer ordering in the final CSS output
3. The rule is unlayered (outside `@layer`), which in CSS cascade terms already has higher priority than layered styles — but `!important` adds a hard override for safety

## Prevention

- When adopting Tailwind v4 in a new project, add this global cursor rule immediately in `globals.css` as part of project setup
- Don't rely on `cursor-pointer` Tailwind utility class on individual buttons — too easy to miss; a global rule is more reliable
- If a button still shows the wrong cursor after this fix, check for inline `style={{ cursor: 'default' }}` or a component library overriding it

## Related Issues

No related issues documented yet.
