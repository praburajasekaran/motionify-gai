---
phase: PROD-06-user-management
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - pages/admin/UserManagement.tsx
autonomous: true

must_haves:
  truths:
    - "User list loads correctly in authenticated sessions"
    - "Create user API call succeeds with cookie auth"
    - "Deactivate user API call succeeds with cookie auth"
  artifacts:
    - path: "pages/admin/UserManagement.tsx"
      provides: "Cookie-authenticated user management UI"
      contains: "credentials: 'include'"
  key_links:
    - from: "pages/admin/UserManagement.tsx"
      to: "users-list, users-create, users-delete endpoints"
      via: "fetch with credentials"
      pattern: "credentials.*include"
---

<objective>
Fix missing `credentials: 'include'` in UserManagement.tsx fetch calls to enable cookie-based authentication.

Purpose: Based on patterns discovered in PROD-04/PROD-05, all fetch calls must include `credentials: 'include'` for cookie-based authentication to work. The UserManagement.tsx component is missing this on 3 fetch calls, causing 401 Unauthorized errors.

Output: Updated UserManagement.tsx with proper credentials on all API calls.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-06-user-management/CONTEXT.md

Reference files:
@pages/admin/UserManagement.tsx (target file)
@src/contexts/NotificationContext.tsx (example of fixed pattern from PROD-05)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add credentials to loadUsers fetch call</name>
  <files>pages/admin/UserManagement.tsx</files>
  <action>
Find the `loadUsers` function (around line 64) with fetch call:

```typescript
const response = await fetch(url);
```

Update to include credentials:

```typescript
const response = await fetch(url, { credentials: 'include' });
```

This fixes the user list loading which currently fails with 401.
  </action>
  <verify>
Run: `grep -A3 "loadUsers" pages/admin/UserManagement.tsx | grep credentials`
Should show: credentials: 'include'
  </verify>
  <done>loadUsers fetch includes credentials: 'include'</done>
</task>

<task type="auto">
  <name>Task 2: Add credentials to create user fetch call</name>
  <files>pages/admin/UserManagement.tsx</files>
  <action>
Find the `handleCreateUser` function (around line 83) with fetch call that creates a user.

Look for a fetch call similar to:

```typescript
const response = await fetch('/api/users-create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(...)
});
```

Add credentials: 'include' to the options object:

```typescript
const response = await fetch('/api/users-create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(...),
  credentials: 'include'
});
```
  </action>
  <verify>
Run: `grep -A5 "users-create" pages/admin/UserManagement.tsx | grep credentials`
Should show: credentials: 'include'
  </verify>
  <done>Create user fetch includes credentials: 'include'</done>
</task>

<task type="auto">
  <name>Task 3: Add credentials to deactivate user fetch call</name>
  <files>pages/admin/UserManagement.tsx</files>
  <action>
Find the `handleDeactivateUser` function (around line 127) with fetch call that deactivates a user.

Look for a fetch call similar to:

```typescript
const response = await fetch(`/api/users-delete/${userId}`, {
  method: 'DELETE',
  ...
});
```

Add credentials: 'include' to the options object:

```typescript
const response = await fetch(`/api/users-delete/${userId}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason: deactivationReason }),
  credentials: 'include'
});
```
  </action>
  <verify>
Run: `grep -A5 "users-delete" pages/admin/UserManagement.tsx | grep credentials`
Should show: credentials: 'include'
  </verify>
  <done>Deactivate user fetch includes credentials: 'include'</done>
</task>

</tasks>

<verification>
1. Run: `grep -c "credentials: 'include'" pages/admin/UserManagement.tsx`
   - Should return at least 3
2. Run: `npm run build` to verify no TypeScript errors
3. Each fetch call in UserManagement.tsx now includes credentials
</verification>

<success_criteria>
1. loadUsers fetch includes credentials: 'include'
2. handleCreateUser fetch includes credentials: 'include'
3. handleDeactivateUser fetch includes credentials: 'include'
4. Build passes without errors
5. All API calls will now send cookies with requests
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-06-user-management/PROD-06-02-SUMMARY.md` with:
- List of fetch calls fixed
- Line numbers affected
- Build verification status
</output>
