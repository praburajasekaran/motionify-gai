---
module: Dashboard
date: 2026-02-21
problem_type: build_error
component: frontend_stimulus
symptoms:
  - "Vite/Babel compile error: Unexpected token, expected ',' at {hasMoreActivities && ...} line"
  - "Dashboard page fails to compile after Load More button added as second sibling in ternary else branch"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [jsx, react, fragment, ternary, siblings, build-error, vite]
---

# Troubleshooting: JSX Sibling Elements in Ternary Else Branch Require a Fragment

## Problem

After adding a "Load More" button below the activity table in `Dashboard.tsx`, Vite/Babel threw a compile error because the ternary's else branch returned two adjacent JSX elements without a wrapping fragment.

## Environment

- Module: Dashboard
- Affected Component: `pages/Dashboard.tsx` — Recent Activity section
- Date: 2026-02-21

## Symptoms

- Vite dev server threw: `[plugin:vite:react-babel] Unexpected token, expected ","` pointing at the `{hasMoreActivities && (` line
- Dashboard page failed to render entirely
- Error appeared immediately after adding `{hasMoreActivities && (...)}` block as a second child of the ternary else branch

## What Didn't Work

**Direct solution:** The problem was identified on the first attempt by reading the compile error location.

## Solution

Wrap the two sibling elements in a React fragment `<>...</>` so the ternary else branch returns a single JSX node.

**Code changes:**

```tsx
// Before (broken) — two siblings in the else branch of a ternary:
) : (
  <div className="overflow-x-auto">
    <table>...</table>
  </div>
  {hasMoreActivities && (         // ❌ Second sibling — invalid JSX
    <div>...</div>
  )}
)}
```

```tsx
// After (fixed) — wrapped in a fragment:
) : (
  <>
    <div className="overflow-x-auto">
      <table>...</table>
    </div>
    {hasMoreActivities && (        // ✅ Sibling inside fragment — valid
      <div>...</div>
    )}
  </>
)}
```

## Why This Works

JSX is syntactic sugar for `React.createElement()` calls. A ternary expression (`condition ? a : b`) can only return a **single value** as its result — it's a JavaScript expression, not a statement block. When you write two adjacent JSX elements without a wrapper, Babel tries to parse the second element as the next argument in a function call and fails with "Unexpected token, expected ','".

Wrapping in `<>...</>` (a React Fragment) collapses the two siblings into one logical node at compile time, without adding a real DOM element, so the ternary returns a single value as required.

This is the same rule as JSX return values in general: you can never return multiple top-level elements from any JSX expression without a common parent or fragment.

## Prevention

- Whenever you insert a conditional block (`{condition && (...)}`) immediately after another JSX element inside a ternary else or if branch, check that both are children of a single parent or fragment.
- Vite's error message (`Unexpected token, expected ","`) is the reliable indicator — the caret points to the *second* sibling element, not the real cause. Scroll up one line to find the unguarded sibling pair.
- Mental model: **every ternary branch and every `return` must produce exactly one root JSX node.** Add a fragment if you need more than one.

## Related Issues

No related issues documented yet.
