---
module: Portal Super Admin
date: 2026-02-21
problem_type: integration_issue
component: frontend_stimulus
symptoms:
  - "Super admin fills form and clicks 'Create Project' - project appears in list but vanishes on page refresh"
  - "No client selection dropdown - only plain text input for client name, so client_user_id is never set in DB"
  - "Project creation silently succeeds in UI but no record written to database"
root_cause: missing_workflow_step
resolution_type: code_fix
severity: high
tags: [project-creation, api-integration, local-state-only, client-assignment, super-admin, react, addProject]
---

# Troubleshooting: Super Admin Project Creation — Not Persisted, No Client Assignment

## Problem

When a super admin (or support user) fills out the Create Project form and clicks "Create Project", the project appears to be created successfully in the UI but disappears on page refresh. Additionally, the form had no way to assign a real client user — only a plain text input — so `projects.client_user_id` was never populated.

## Environment

- Module: Portal Super Admin (`ProjectManagerDashboard` + `CreateProjectModal`)
- Affected Component: `AppRoot.tsx` / `AppContext.tsx` — `addProject` function; `CreateProjectModal.tsx`; backend `projects.ts` POST handler
- Date: 2026-02-21

## Symptoms

- Project created in super admin modal appears in the list immediately (local state update works), but vanishes on next page load
- No error shown to the user — the form closes normally
- The `projects` table in the database has no new row after form submission
- The "Client Name" field was a free-text input — the `client_user_id` FK on `projects` remained NULL
- No client dropdown to select an existing user from the `users` table

## What Didn't Work

**Direct solution:** The problem was identified and fixed on the first attempt after tracing the data flow.

## Root Cause

Two separate implementation gaps:

**1. `addProject` only updated React state — never called the API**

`addProject` in both `AppRoot.tsx` and `AppContext.tsx` only called `setProjectsData(...)`. No `fetch()` or API function was called:

```typescript
// BROKEN: local state only, no API call
const addProject = (newProjectData: { ... }) => {
  const newProject: Project = {
    id: generateProjectId(),
    status: ProjectStatus.IN_PROGRESS,
    ...newProjectData,
  };
  setProjectsData(prevData => [newProject, ...prevData]); // vanishes on refresh
};
```

**2. Backend POST handler only accepted proposal-based creation**

The backend `projects.ts` POST handler unconditionally required `inquiryId` + `proposalId` (the proposals flow). There was no admin-direct creation path, even though `createProjectSchema` (with `name` + `clientUserId`) was already defined in `schemas.ts` but never wired up.

**3. `CreateProjectModal` had no client lookup**

The "Client Name" field was a `<input type="text">` with no database query. The form data never included a `clientUserId`, so the `client_user_id` FK on `projects` was never populated.

## Solution

### 1. Add `createProjectDirectSchema` to `_shared/schemas.ts`

```typescript
export const createProjectDirectSchema = z.object({
  name: nameSchema,
  clientUserId: uuidSchema,
  deliverables: z.array(z.string().min(1).max(500)).min(1).max(50),
  nonInclusions: z.array(z.string().min(1).max(500)).optional(),
  totalRevisions: z.number().int().min(0).max(100).optional().default(2),
});
// Export as SCHEMAS.project.direct
```

### 2. Add admin-direct branch in `projects.ts` POST handler

Detect creation path by checking for `name` field in request body:

```typescript
if (event.httpMethod === 'POST') {
  let parsedBody: Record<string, unknown> = {};
  try { parsedBody = JSON.parse(event.body || '{}'); } catch { /* ignore */ }

  if ('name' in parsedBody) {
    // Admin-direct path — only super_admin or support allowed
    const userRole = auth?.user?.role;
    if (userRole !== 'super_admin' && userRole !== 'support') {
      return { statusCode: 403, ... };
    }
    const validation = validateRequest(event.body, SCHEMAS.project.direct, origin);
    // ...generate project number, insert project, insert deliverables,
    // add client to project_team, add creator + support users, log activity
    return { statusCode: 201, body: JSON.stringify({ ...newProject, client_name: ... }) };
  }

  // Original proposal-based path continues here unchanged
  const validation = validateRequest(event.body, SCHEMAS.project.fromProposal, origin);
  ...
}
```

### 3. Add `createProjectDirect()` and `fetchClientUsers()` to `projects.api.ts`

```typescript
export async function fetchClientUsers(): Promise<{ success: boolean; users?: ClientUser[]; error?: string }> {
  const response = await fetch(`${API_BASE}/users-list?role=client&status=active`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await response.json();
  const users = (data.users || data).map((u) => ({ id: u.id, name: u.full_name, email: u.email }));
  return { success: true, users };
}

export async function createProjectDirect(data: {
  name: string; clientUserId: string; deliverables: string[];
  nonInclusions?: string[]; totalRevisions: number;
}): Promise<{ success: boolean; project?: Project; error?: string }> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) return { success: false, error: responseData.error || `...` };
  return { success: true, project: transformProject(responseData as ApiProject) };
}
```

### 4. Update `CreateProjectModal` — replace text input with client dropdown, call API

```typescript
// BEFORE (broken):
<input type="text" value={clientName} onChange={...} />
// No API call — just called onAddProject with local data

// AFTER (fixed):
<select value={clientUserId} onChange={(e) => setClientUserId(e.target.value)} required>
  <option value="">Select a client…</option>
  {clientUsers.map((u) => (
    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
  ))}
</select>

// On submit: call API, show error inline if it fails, pass result to onAddProject
const result = await createProjectDirect({ name, clientUserId, deliverables, nonInclusions, totalRevisions });
if (!result.success || !result.project) { setError(result.error); return; }
onAddProject(result.project);
```

### 5. Update `addProject` in `AppRoot.tsx` and `AppContext.tsx` — accept API-returned Project

```typescript
// BEFORE:
const addProject = (newProjectData: { name, client, scope, totalRevisions, milestones? }) => {
  const newProject: Project = { id: generateProjectId(), ... };
  setProjectsData(prevData => [newProject, ...prevData]);
};

// AFTER:
const addProject = (project: Project) => {
  setProjectsData(prevData => [project, ...prevData]);
};
```

### 6. Update `users-list.ts` — allow `support` role (not just `super_admin`)

`users-list.ts` used `withSuperAdmin()` middleware which blocked support users. Changed to `withProjectManager()` (allows both `super_admin` + `support`):

```typescript
// BEFORE:
export const handler = compose(withCORS(['GET']), withSuperAdmin(), withRateLimit(...))(...)

// AFTER:
export const handler = compose(withCORS(['GET']), withProjectManager(), withRateLimit(...))(...)
```

### 7. `ProjectManagerDashboard` — load client users on mount

```typescript
const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);

useEffect(() => {
  if (currentUser.role === UserRole.SUPPORT || currentUser.role === UserRole.SUPER_ADMIN) {
    fetchClientUsers().then((result) => {
      if (result.success && result.users) setClientUsers(result.users);
    });
  }
}, [currentUser.role]);

// Pass to modal:
<CreateProjectModal ... clientUsers={clientUsers} onAddProject={onAddProject} />
```

## Why This Works

1. **The API call was simply missing** — the form lifecycle was complete (validation, state update, modal close) but the critical step of `POST /projects` was never executed. The fix moves API responsibility into the modal's submit handler so there's no way to "succeed" without a server response.

2. **Backend dispatch by field name** — detecting `'name' in parsedBody` is a simple, non-breaking way to add a new creation path to an existing endpoint without changing the proposals flow.

3. **Client dropdown requires a real DB user** — replacing free text with a `<select>` populated from `users-list` ensures `client_user_id` is always a valid UUID FK, and the project team setup (primary contact) is triggered correctly.

4. **`users-list` needed `withProjectManager()`** — support users coordinate projects day-to-day and must be able to view the client list. `withSuperAdmin()` was overly restrictive for this endpoint.

## Prevention

- **Pattern: forms that create database records must call an API** — never build a form-to-state flow without an API call. The `onAddProject` callback chain should accept an API-returned object, not raw form data.
- **Check for `client_user_id` NULL** — when creating projects, always verify a real `users.id` is being stored, not just a display name string.
- **When adding a new creation path to an existing endpoint**, use a body field discriminator (e.g., `'name' in body` vs `'inquiryId' in body`) to branch cleanly without touching the existing flow.
- **Endpoint access levels**: double-check middleware (`withSuperAdmin` vs `withProjectManager`) when an endpoint serves both super admin and support users.

## Related Issues

- See also: [activity-not-persisted-to-database.md](./activity-not-persisted-to-database.md) — same pattern: portal actions updating local React state but not persisting to the database
- See also: [api-field-name-mismatch-task-data-loss.md](./api-field-name-mismatch-task-data-loss.md) — similar data loss due to frontend/backend integration gap
