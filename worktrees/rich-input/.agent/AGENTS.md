# Motionify PM Portal - Agent Instructions

This document helps AI agents understand the Motionify codebase. It is updated after each successful task completion with learnings.

## Project Overview

Motionify PM Portal is a client collaboration platform for video production. It enables:
- **Motionify Team** (Super Admin, Project Manager, Team Member) to manage projects
- **Clients** (Primary Contact, Team Member) to review and approve deliverables

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `pages/` | React Router page components |
| `components/` | Reusable UI components |
| `netlify/functions/` | Serverless API endpoints (TypeScript) |
| `database/` | SQL schema and migrations |
| `shared/` | Shared utilities (permissions, types) |
| `docs/` | Documentation including test cases |
| `e2e/` | Playwright E2E tests |
| `scripts/ralph/` | Ralph-style task tracking |

## User Roles & Permissions

```typescript
// From shared/permissions.ts
type UserRole = 
  | 'super_admin'      // Full access
  | 'project_manager'  // Assigned projects only
  | 'team_member'      // Assigned projects only
  | 'client_primary'   // Client lead, can approve
  | 'client_team';     // View only, cannot approve
```

## State Machines

### Task Status
```
Pending → In Progress → Awaiting Approval → Completed
                ↑               ↓
                └── Revision Requested
```
See: `utils/taskStateTransitions.ts`

### Deliverable Status
```
pending → in_progress → beta_ready → awaiting_approval → approved → payment_pending → final_delivered
                                            ↓
                                        rejected (back to in_progress)
```

### Project Status
```
Draft → Active → [On Hold] → Completed → Archived
          ↓
    Awaiting Payment
```
See: `utils/projectStateTransitions.ts`

## Testing Patterns

### Browser Testing
- Dev server: `http://localhost:5173`
- Use browser subagent with Playwright for UI verification
- Test accounts in `constants.ts` (MOCK_USER_*)

### API Testing
- Endpoints: `/.netlify/functions/[name]`
- Always verify 403 responses for permission-protected routes
- Use proper error codes, not just generic errors

## Common Gotchas

1. **Always run typecheck** before marking a task complete: `npm run typecheck`
2. **Update test cases doc** after implementing: `docs/MOTIONIFY-PORTAL-TEST-CASES.md`
3. **Permission checks**: Both frontend (UI hiding) AND backend (API enforcement)
4. **Visibility filtering**: Tasks marked "Internal Only" must be hidden from clients
5. **State transitions**: Use state machine patterns, don't allow arbitrary status changes

## Files to Update After Changes

When modifying features, remember to update:
- [ ] `docs/MOTIONIFY-PORTAL-TEST-CASES.md` - Mark test as ✅ COMPLETE
- [ ] `scripts/ralph/prd.json` - Set `passes: true`
- [ ] `scripts/ralph/progress.txt` - Append progress entry
- [ ] This file (`AGENTS.md`) - Add relevant learnings

## Discovered Patterns

<!-- Add learnings as you complete tasks -->

### Example Format
```
### [Date] - [Task ID]
- Pattern: [What you discovered]
- Files affected: [List files]
- Gotcha: [Any tricky parts]

### 2026-01-11 - TC-NT-001
- Pattern: Project Identifier - The `projects` table uses `project_number` (e.g., PROJ-2026-001) as the primary public identifier, not a `name` column. Use this in emails/notifications.
- Files affected: `netlify/functions/send-email.ts`, `netlify/functions/tasks.ts`
```


### 2026-01-11 - TC-DA-007
- Pattern: Simulated Payment Flow
- Implementation: Used window.confirm for payment simulation and enforced status change via API. Triggers 'Final Files Ready' email.
- Gotcha: Real payments would need Stripe integration, this is a simulation for MVP.


### Tab Management
- When adding a new tab to `ProjectDetail.tsx`, you MUST also update `TAB_INDEX_MAP` and `INDEX_TAB_MAP` in `constants.ts`. Failure to do so will cause the tab to default to "Overview" and content to not render, even if the tab click works visually.

### Accessibility Patterns
- **Skip Links**: Use `sr-only focus:not-sr-only` to hide skip links until focused. Target `main` element with `id="main-content"` and `tabIndex={-1}`.
- **Focus Styles**: Global `:focus-visible` ring styles are preferred over removing outlines.

### Global Error Handling
- **Pattern**: Combine `ErrorBoundary` with `QueryErrorResetBoundary` from React Query.
- **Why**: Allows the global error UI to reset the specific failed query when the user clicks "Try Again", rather than getting stuck in an error loop.
- **Config**: Set `defaultOptions.queries.throwOnError: true` in `QueryProvider`.

### 2026-01-12 - TC-AD-005
- Pattern: Role-Based Data Filtering
- Implementation: Filtered MOCK_PROJECTS in ActivityLogs.tsx using `project.motionifyTeam.some(m => m.email === user.email)`.
- Gotcha: AuthContext user IDs and Mock Data IDs can mismatch. Email matching is more reliable for mock environments.

