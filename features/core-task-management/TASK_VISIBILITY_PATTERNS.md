# Task Visibility Enforcement Patterns

This document defines how to properly filter and enforce task visibility based on user roles. The `visibility` field controls whether clients can see a task or if it's internal-only for the project team.

---

## Visibility Field Values

| Value | Who Can See | Use Case | Example |
|-------|-------------|----------|---------|
| **client_visible** | Everyone (clients + team) | Tasks clients should know about | "Review beta delivery", "Provide feedback" |
| **internal_only** | Only project team members | Internal coordination, admin tasks | "Prepare files for upload", "Internal review" |

---

## Database Schema

```sql
CREATE TABLE tasks (
  ...
  visibility VARCHAR(50) NOT NULL DEFAULT 'client_visible',
  ...
  CONSTRAINT valid_task_visibility CHECK (
    visibility IN ('client_visible', 'internal_only')
  )
);
```

---

## Query Patterns

### Pattern 1: Get Tasks for Client User

**Use Case:** Client viewing their project tasks

**Rule:** Only show `client_visible` tasks

```sql
SELECT t.*
FROM tasks t
INNER JOIN project_team pt ON t.project_id = pt.project_id
WHERE pt.user_id = :client_user_id
  AND pt.project_id = :project_id
  AND pt.role = 'client'
  AND t.visibility = 'client_visible'  -- ← Critical filter
  AND t.deleted_at IS NULL
ORDER BY t.created_at DESC;
```

**TypeScript/Prisma:**
```typescript
async function getTasksForClient(userId: string, projectId: string) {
  // Verify user is on project team as client
  const teamMember = await prisma.projectTeam.findFirst({
    where: {
      userId,
      projectId,
      role: 'client'
    }
  });

  if (!teamMember) {
    throw new Error('User is not a client on this project');
  }

  // Get only client-visible tasks
  return await prisma.tasks.findMany({
    where: {
      projectId,
      visibility: 'client_visible',  // ← Enforce visibility
      deletedAt: null
    },
    orderBy: { createdAt: 'desc' }
  });
}
```

---

### Pattern 2: Get Tasks for Project Manager/Admin

**Use Case:** Project manager or admin viewing all tasks

**Rule:** Show ALL tasks (both client_visible and internal_only)

```sql
SELECT t.*
FROM tasks t
INNER JOIN project_team pt ON t.project_id = pt.project_id
WHERE pt.user_id = :admin_user_id
  AND pt.project_id = :project_id
  AND pt.role IN ('project_manager', 'super_admin')
  AND t.deleted_at IS NULL
-- ⚠️ NO visibility filter - admins see everything
ORDER BY t.created_at DESC;
```

**TypeScript/Prisma:**
```typescript
async function getTasksForAdmin(userId: string, projectId: string) {
  // Verify user is admin/PM on project
  const user = await prisma.users.findUnique({
    where: { id: userId }
  });

  if (!['super_admin', 'project_manager'].includes(user.role)) {
    throw new Error('Insufficient permissions');
  }

  // Get ALL tasks (no visibility filter)
  return await prisma.tasks.findMany({
    where: {
      projectId,
      deletedAt: null
      // ⚠️ NO visibility filter
    },
    orderBy: { createdAt: 'desc' }
  });
}
```

---

### Pattern 3: Get Task by ID (with visibility check)

**Use Case:** User accessing a specific task (e.g., via direct link)

**Rule:** Verify user has permission to see this task

```sql
-- For clients: check both team membership AND visibility
SELECT t.*
FROM tasks t
INNER JOIN project_team pt ON t.project_id = pt.project_id
WHERE t.id = :task_id
  AND pt.user_id = :user_id
  AND (
    -- Client can only see client_visible tasks
    (pt.role = 'client' AND t.visibility = 'client_visible')
    OR
    -- Admins/PMs can see all tasks
    (pt.role IN ('project_manager', 'super_admin'))
  )
  AND t.deleted_at IS NULL;
```

**TypeScript/Prisma:**
```typescript
async function getTaskById(taskId: string, userId: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId }
  });

  const task = await prisma.tasks.findFirst({
    where: {
      id: taskId,
      deletedAt: null
    },
    include: {
      project: {
        include: {
          projectTeam: {
            where: { userId }
          }
        }
      }
    }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Check team membership
  const teamMember = task.project.projectTeam[0];
  if (!teamMember) {
    throw new Error('User not on project team');
  }

  // Check visibility permission
  if (teamMember.role === 'client' && task.visibility !== 'client_visible') {
    throw new Error('You do not have permission to view this task');
  }

  return task;
}
```

---

### Pattern 4: Create Internal-Only Task

**Use Case:** Admin creating a task clients shouldn't see

```typescript
async function createInternalTask(data: CreateTaskInput, createdBy: string) {
  const user = await prisma.users.findUnique({
    where: { id: createdBy }
  });

  // Only admins/PMs can create internal tasks
  if (!['super_admin', 'project_manager'].includes(user.role)) {
    throw new Error('Only admins can create internal-only tasks');
  }

  return await prisma.tasks.create({
    data: {
      ...data,
      visibility: 'internal_only',  // ← Set explicitly
      createdBy
    }
  });
}
```

---

### Pattern 5: Update Task Visibility

**Use Case:** Admin changing a task from client_visible to internal_only (or vice versa)

**Rule:** Only admins can change visibility

```typescript
async function updateTaskVisibility(
  taskId: string,
  newVisibility: 'client_visible' | 'internal_only',
  userId: string
) {
  const user = await prisma.users.findUnique({
    where: { id: userId }
  });

  // Only admins can change visibility
  if (!['super_admin', 'project_manager'].includes(user.role)) {
    throw new Error('Only admins can change task visibility');
  }

  // Update visibility
  const task = await prisma.tasks.update({
    where: { id: taskId },
    data: { visibility: newVisibility }
  });

  // If changing from client_visible to internal_only,
  // might want to revoke client notifications
  if (newVisibility === 'internal_only') {
    await revokeClientNotifications(taskId);
  }

  return task;
}
```

---

## API Endpoint Filters

### GET /api/projects/:projectId/tasks

**Client Request:**
```http
GET /api/projects/123/tasks
Authorization: Bearer <client_token>
```

**Response:** Only client_visible tasks

```json
{
  "tasks": [
    {
      "id": "...",
      "title": "Review beta delivery",
      "visibility": "client_visible"
    }
    // internal_only tasks NOT included
  ]
}
```

**Admin Request:**
```http
GET /api/projects/123/tasks
Authorization: Bearer <admin_token>
```

**Response:** ALL tasks

```json
{
  "tasks": [
    {
      "id": "...",
      "title": "Review beta delivery",
      "visibility": "client_visible"
    },
    {
      "id": "...",
      "title": "Internal review before client delivery",
      "visibility": "internal_only"
    }
  ]
}
```

---

## Role-Based Visibility Matrix

| User Role | Can See client_visible | Can See internal_only | Can Create internal_only | Can Change Visibility |
|-----------|------------------------|----------------------|--------------------------|----------------------|
| **client** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **project_manager** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **super_admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Common Use Cases

### 1. Client Dashboard - "My Tasks"

Show only tasks assigned to client that are client_visible:

```sql
SELECT t.*
FROM tasks t
INNER JOIN task_assignments ta ON t.id = ta.task_id
WHERE ta.user_id = :client_user_id
  AND t.visibility = 'client_visible'  -- ← Filter
  AND t.deleted_at IS NULL
ORDER BY t.deadline ASC NULLS LAST;
```

### 2. Project Overview - Task Count

Count visible vs total tasks (for admin view):

```sql
SELECT
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE visibility = 'client_visible') as client_visible_count,
  COUNT(*) FILTER (WHERE visibility = 'internal_only') as internal_only_count
FROM tasks
WHERE project_id = :project_id
  AND deleted_at IS NULL;
```

### 3. Task Comments - Visibility Inheritance

Comments inherit visibility from their parent task:

```typescript
async function getTaskComments(taskId: string, userId: string) {
  // First check if user can see the task
  const task = await getTaskById(taskId, userId);  // Uses pattern 3

  // If user can see task, they can see all comments
  return await prisma.taskComments.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' }
  });
}
```

### 4. Activity Feed - Filtered by Visibility

Show activities for tasks user can see:

```typescript
async function getProjectActivities(projectId: string, userId: string) {
  const user = await prisma.users.findUnique({ where: { id: userId } });

  const visibilityFilter = user.role === 'client'
    ? { visibility: 'client_visible' }
    : {};  // Admins see all

  return await prisma.activities.findMany({
    where: {
      projectId,
      task: visibilityFilter  // Filter related tasks
    },
    orderBy: { timestamp: 'desc' },
    take: 50
  });
}
```

---

## Notification Filtering

### Should Client Receive Notification?

When creating task-related notifications, check visibility:

```typescript
async function notifyTaskAssignment(task: Task, assignedUserId: string) {
  const assignedUser = await prisma.users.findUnique({
    where: { id: assignedUserId }
  });

  // Don't notify client users about internal_only tasks
  if (assignedUser.role === 'client' && task.visibility === 'internal_only') {
    console.log('Skipping notification - task is internal_only');
    return;
  }

  // Send notification
  await createNotification({
    userId: assignedUserId,
    type: 'task_assigned',
    // ...
  });
}
```

---

## Security Best Practices

### ✅ DO

1. **Always filter by visibility for client users**
   ```typescript
   if (user.role === 'client') {
     query.where.visibility = 'client_visible';
   }
   ```

2. **Verify both team membership AND visibility**
   ```typescript
   // Check user is on project team
   // AND task is client_visible (if client)
   ```

3. **Use database-level filtering**
   ```sql
   -- Filter in SQL, not in application code
   WHERE visibility = 'client_visible'
   ```

4. **Audit log visibility changes**
   ```typescript
   await logActivity({
     action: 'TASK_VISIBILITY_CHANGED',
     oldValue: 'client_visible',
     newValue: 'internal_only'
   });
   ```

### ❌ DON'T

1. **Don't filter in application code after fetching**
   ```typescript
   // ❌ BAD
   const allTasks = await getTasks(projectId);
   return allTasks.filter(t => t.visibility === 'client_visible');

   // ✅ GOOD
   return await getTasks(projectId, { visibility: 'client_visible' });
   ```

2. **Don't expose internal_only tasks in API responses**
   ```typescript
   // ❌ BAD - includes all tasks in count
   { "total": 15, "tasks": [/* only 10 client_visible */] }

   // ✅ GOOD - count matches filtered results
   { "total": 10, "tasks": [/* 10 client_visible */] }
   ```

3. **Don't rely on frontend filtering**
   ```typescript
   // ❌ BAD - security by obscurity
   // Frontend hides internal_only, but data is sent

   // ✅ GOOD - backend filters, frontend never sees the data
   ```

---

## Testing Visibility Enforcement

```typescript
describe('Task Visibility Enforcement', () => {
  it('should return only client_visible tasks for client users', async () => {
    const clientUser = await createUser({ role: 'client' });
    const project = await createProject();
    await addToProjectTeam(project.id, clientUser.id, 'client');

    // Create tasks
    await createTask({ visibility: 'client_visible', projectId: project.id });
    await createTask({ visibility: 'internal_only', projectId: project.id });

    const tasks = await getTasksForClient(clientUser.id, project.id);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].visibility).toBe('client_visible');
  });

  it('should return all tasks for admin users', async () => {
    const adminUser = await createUser({ role: 'super_admin' });
    const project = await createProject();

    await createTask({ visibility: 'client_visible', projectId: project.id });
    await createTask({ visibility: 'internal_only', projectId: project.id });

    const tasks = await getTasksForAdmin(adminUser.id, project.id);

    expect(tasks).toHaveLength(2);
  });

  it('should prevent client from accessing internal_only task by ID', async () => {
    const clientUser = await createUser({ role: 'client' });
    const project = await createProject();
    await addToProjectTeam(project.id, clientUser.id, 'client');

    const internalTask = await createTask({
      visibility: 'internal_only',
      projectId: project.id
    });

    await expect(
      getTaskById(internalTask.id, clientUser.id)
    ).rejects.toThrow('You do not have permission');
  });
});
```

---

**Last Updated:** 2025-11-19
**Maintained By:** Development Team
**Version:** 1.0
