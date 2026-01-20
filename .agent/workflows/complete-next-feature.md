---
description: Ralph-inspired workflow to pick and complete the next pending feature from prd.json
---

# Complete Next Feature (Ralph-Style)

This workflow implements the Ralph pattern for Antigravity/Claude. It picks the highest priority pending task from `prd.json` and completes it systematically.

## Overview

Each invocation:
1. Reads current state from `prd.json` and `progress.txt`
2. Picks ONE task to complete
3. Implements the feature
4. Runs quality checks
5. Updates all tracking documents
6. Appends learnings

---

## Step 1: Read Current State

// turbo
1. Read `scripts/ralph/prd.json` to see all user stories
2. Read `scripts/ralph/progress.txt` - especially the "Codebase Patterns" section
3. Read `.agent/AGENTS.md` for codebase conventions

---

## Step 2: Select Next Task

1. Find the first story in `userStories` where `passes: false`
2. Tasks are ordered by priority (lower number = higher priority)
3. Skip any tasks that are in `blockedStories`
4. Announce: "🎯 Working on: [ID] - [Title]"

---

## Step 3: Review Requirements

1. Read the `acceptanceCriteria` carefully
2. Check `implementationHints` for guidance
3. Look at `relatedFiles` to understand scope
4. Read any relevant existing code first

---

## Step 4: Implement the Feature

1. **Plan first**: Identify all files that need changes
2. **Implement incrementally**: Make small, focused changes
3. **Follow conventions**: Check AGENTS.md and existing patterns
4. **Both frontend AND backend**: Ensure permission checks work at both layers
5. **Handle edge cases**: Empty states, errors, validation

---

## Step 5: Run Quality Checks

// turbo
Run the typecheck to ensure no TypeScript errors:
```bash
npm run typecheck
```

If typecheck fails, fix the errors before proceeding.

---

## Step 6: Browser Verification (If UI Change)

1. Open the browser to verify the feature works
2. Follow the test steps from the original test case
3. Verify all acceptance criteria pass
4. Take note of any issues

---

## Step 7: Update prd.json

// turbo
Update `scripts/ralph/prd.json`:
- Set `passes: true` for the completed story
- Add any notes to the `notes` field

---

## Step 8: Update Test Cases Document

Update `docs/MOTIONIFY-PORTAL-TEST-CASES.md`:
- Change status marker from ⏳/❌ to ✅ COMPLETE
- Update the status summary counts at the top
- Add implementation notes: "✅ Implemented in `ComponentName.tsx`"

---

## Step 9: Append Progress Entry

// turbo
Append to `scripts/ralph/progress.txt`:

```
## [Date] - [Story ID]: [Title]
- What was implemented: [description]
- Files changed: [list files]
- **Learnings for future iterations:**
  - [Any patterns discovered]
  - [Any gotchas encountered]
---
```

---

## Step 10: Update AGENTS.md (If Applicable)

If you discovered a reusable pattern or gotcha, add it to `.agent/AGENTS.md` under "Discovered Patterns".

Only add if it's:
- General and reusable (not task-specific)
- Would help future iterations
- Related to conventions or non-obvious requirements

---

## Step 11: Report Completion

Summarize what was done:
```
✅ Completed: [ID] - [Title]
📂 Files modified: [list]
📊 Progress: [X] of [Y] stories complete
🎯 Next priority: [Next ID] - [Next Title]
```

---

## Tips for Success

1. **Focus on ONE task** - Don't try to complete multiple at once
2. **Read progress.txt first** - Learn from previous iterations
3. **Check existing patterns** - Look at similar implementations
4. **Both layers** - UI restrictions AND API enforcement
5. **Update all docs** - prd.json, test cases, progress.txt

---

## Example Usage

To run this workflow:
```
/complete-next-feature
```

Or to target a specific task:
```
Complete TC-PM-003 (Archive Completed Project)
```

---

## Status Indicators Reference

| Marker | Meaning |
|--------|---------|
| `passes: true` | Feature complete in prd.json |
| ✅ COMPLETE | Test verified in test cases doc |
| ⏳ NOT STARTED | Planned but not built |
| ❌ NOT IMPLEMENTED | Explicitly unavailable |
| 🚫 BLOCKED | Depends on another task |

