---
module: Landing Page Quiz
date: 2026-02-20
problem_type: best_practice
component: frontend_stimulus
symptoms:
  - "Navigating back to a previous quiz question via chip resets all subsequent answers"
  - "User must re-click through every later question after editing an earlier one"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [react, state-management, quiz, navigation, useRef, useCallback, ux]
---

# Pattern: Quiz Back-Navigation with Answer Preservation

## Problem

In a multi-step quiz (React/Next.js), when a user navigates back to a previous question via a breadcrumb chip to edit one answer, the `select()` function's auto-advance logic forces them to re-click through all subsequent questions — even though those answers are still in state. From the user's perspective it feels like their answers were reset.

## Environment

- Module: Landing Page Quiz (`src/components/Quiz/`)
- Affected Component: `useQuiz.ts` hook + `Quiz.tsx`
- Framework: Next.js / React
- Date: 2026-02-20

## Symptoms

- User completes all 5 quiz questions → recommendation appears
- User clicks a breadcrumb chip to go back to Q1 and change one answer
- After changing the answer, `select()` advances to Q2 (current + 1)
- User must manually click through Q2, Q3, Q4 again (even though answers are pre-selected)
- Feels like answers were "reset" even though state is actually preserved

## Root Cause

The `select()` function always advances `current` by 1:

```ts
const select = useCallback((key: keyof QuizSelections, value: string) => {
  setSelections((s) => ({ ...s, [key]: value }));
  setCurrent((c) => Math.min(c + 1, total - 1)); // always +1
}, []);
```

When a user navigates back to Q0 via `setCurrent(0)` and picks a new answer, `select` takes them to Q1. They must then advance through Q1 → Q2 → Q3 → Q4 step by step, clicking the already-selected answer each time, before they return to the recommendation.

## Solution

Add a `returnToRef` to remember where to jump back after a chip-triggered edit.

**File:** `src/components/Quiz/useQuiz.ts`

```ts
// Add ref to track return position after chip navigation
const returnToRef = useRef<number | null>(null);

// Modified select: jumps back to saved position if editing via chip
const select = useCallback((key: keyof QuizSelections, value: string) => {
  setSelections((s) => ({ ...s, [key]: value }));
  if (returnToRef.current !== null) {
    const target = Math.min(returnToRef.current, total - 1);
    returnToRef.current = null;
    setCurrent(target);
  } else {
    setCurrent((c) => Math.min(c + 1, total - 1));
  }
}, []);

// New function: navigate to a previous question and remember where to return
const navigateToQuestion = useCallback((idx: number) => {
  returnToRef.current = current;
  setCurrent(idx);
}, [current]);
```

**File:** `src/components/Quiz/Quiz.tsx` — breadcrumb chips:

```tsx
{questions.slice(0, current).map((q, idx) =>
  selections[q.key] ? (
    <button
      key={q.key}
      onClick={() => navigateToQuestion(idx)}  // ← use navigateToQuestion, not setCurrent
      className="..."
    >
      {/* chip content */}
    </button>
  ) : null
)}
```

Export `navigateToQuestion` from `useQuiz`:

```ts
return {
  // ...existing exports
  navigateToQuestion,
};
```

## Why This Works

`returnToRef` is a React ref (not state), so updating it doesn't trigger a re-render. It acts as a "breadcrumb" that persists across the state update cycle:

1. User clicks chip → `navigateToQuestion(idx)` saves `current` to `returnToRef`, navigates to `idx`
2. User picks new answer → `select()` sees `returnToRef.current !== null`, jumps to saved position, clears ref
3. Normal quiz flow (no chip click) → `returnToRef.current` is null, `select()` advances by 1 as usual

The `Math.min(returnToRef.current, total - 1)` guard prevents jumping past the last quiz question if the user was on the contact form when they clicked a chip.

## Prevention

- When building any multi-step wizard with back-navigation, always differentiate between "advance to next step" and "return to saved position" in your state transition logic
- Use a `ref` (not state) for the return position — it doesn't need to cause a re-render and avoids stale closure issues
- Clear the ref immediately after use so normal flow is unaffected

## Bonus: Smart Video Re-generation Guard

When the recommendation changes due to an edited answer, re-generating the sample video is expensive. Guard against unnecessary re-generation by tracking the last generated recommendation ID:

```tsx
const lastGeneratedIdRef = useRef<string | null>(null);

useEffect(() => {
  if (!recommendation) return;
  if (lastGeneratedIdRef.current === recommendation.id) return; // same type, skip
  lastGeneratedIdRef.current = recommendation.id;
  // ... generate video
}, [recommendation]);

// Clear on full reset so next quiz always generates fresh
const reset = () => {
  // ...
  lastGeneratedIdRef.current = null;
};
```

## Related Issues

No related issues documented yet.
