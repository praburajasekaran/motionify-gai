---
phase: PROD-04-deliverables-system
plan: 04
type: execute
wave: 2
depends_on:
  - PROD-04-01
files_modified:
  - netlify/functions/deliverables.ts
autonomous: true

must_haves:
  truths:
    - "Client A cannot fetch deliverables for Client B's projects"
    - "Deliverables GET endpoint validates user owns the project or is admin"
    - "File expiry computed dynamically without scheduled job"
  artifacts:
    - path: "netlify/functions/deliverables.ts"
      provides: "Permission-checked deliverables API"
      contains: "client_user_id"
  key_links:
    - from: "netlify/functions/deliverables.ts"
      to: "projects table"
      via: "JOIN query for ownership"
      pattern: "JOIN projects"
---

<objective>
Add permission checks and dynamic file expiry to deliverables API.

Purpose: The current deliverables API allows any authenticated user to fetch any deliverable by ID or project ID. This plan adds client ownership validation and computes file expiry dynamically (365 days from final_delivered_at).

Output: Deliverables API validates user permissions and shows accurate expiry status.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@netlify/functions/deliverables.ts
@utils/deliverablePermissions.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add permission validation to GET by ID</name>
  <files>netlify/functions/deliverables.ts</files>
  <action>
Update the GET handler for single deliverable (by id) to validate user has access:

```typescript
if (id) {
    // Fetch deliverable with project info for permission check
    const result = await client.query(
        `SELECT d.*, p.client_user_id
         FROM deliverables d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Deliverable not found' }),
        };
    }

    const deliverable = result.rows[0];
    const { client_user_id } = deliverable;

    // Permission check
    const userRole = auth?.user?.role;
    const userId = auth?.user?.userId;

    // Admin and PM can view all
    if (userRole !== 'super_admin' && userRole !== 'project_manager') {
        // Client can only view their own project's deliverables
        if (userRole === 'client' && client_user_id !== userId) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({
                    error: 'Access denied',
                    message: 'You do not have permission to view this deliverable'
                }),
            };
        }

        // Team member: check task assignment on project
        if (userRole === 'team_member') {
            const taskResult = await client.query(
                `SELECT 1 FROM tasks
                 WHERE project_id = $1
                 AND (assignee_id = $2 OR $2 = ANY(assignee_ids))
                 LIMIT 1`,
                [deliverable.project_id, userId]
            );

            if (taskResult.rows.length === 0) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        error: 'Access denied',
                        message: 'You are not assigned to tasks on this project'
                    }),
                };
            }
        }
    }

    // Dynamic expiry check (more accurate than relying on files_expired column)
    if (deliverable.status === 'final_delivered' && deliverable.final_delivered_at) {
        const deliveryDate = new Date(deliverable.final_delivered_at);
        const expiryDate = new Date(deliveryDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        const isExpired = new Date() > expiryDate;

        if (isExpired && userRole !== 'super_admin') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({
                    error: 'Files have expired',
                    message: 'Download links for this deliverable have expired after 365 days. Contact support to restore access.',
                    code: 'FILES_EXPIRED'
                }),
            };
        }

        // Add computed expiry info to response
        deliverable.expires_at = expiryDate.toISOString();
        deliverable.files_expired = isExpired;
    }

    // Remove internal fields before sending
    delete deliverable.client_user_id;

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(deliverable),
    };
}
```
  </action>
  <verify>
Manual test:
1. Login as Client A
2. GET /api/deliverables?id={Client A's deliverable ID} -> should succeed
3. GET /api/deliverables?id={Client B's deliverable ID} -> should get 403
4. Login as Admin -> should be able to access any deliverable
  </verify>
  <done>
- GET by ID validates client owns project
- Admin/PM can access any deliverable
- Team member access based on task assignment
- Dynamic expiry computed from final_delivered_at
- expires_at included in response for UI display
  </done>
</task>

<task type="auto">
  <name>Task 2: Add permission validation to GET by projectId</name>
  <files>netlify/functions/deliverables.ts</files>
  <action>
Update the GET handler for project deliverables (by projectId) to validate user has access:

```typescript
if (projectId) {
    // First validate user can access this project
    const projectResult = await client.query(
        `SELECT client_user_id FROM projects WHERE id = $1`,
        [projectId]
    );

    if (projectResult.rows.length === 0) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Project not found' }),
        };
    }

    const { client_user_id } = projectResult.rows[0];
    const userRole = auth?.user?.role;
    const userId = auth?.user?.userId;

    // Permission check
    if (userRole !== 'super_admin' && userRole !== 'project_manager') {
        if (userRole === 'client' && client_user_id !== userId) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({
                    error: 'Access denied',
                    message: 'You do not have permission to view deliverables for this project'
                }),
            };
        }

        if (userRole === 'team_member') {
            const taskResult = await client.query(
                `SELECT 1 FROM tasks
                 WHERE project_id = $1
                 AND (assignee_id = $2 OR $2 = ANY(assignee_ids))
                 LIMIT 1`,
                [projectId, userId]
            );

            if (taskResult.rows.length === 0) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        error: 'Access denied',
                        message: 'You are not assigned to tasks on this project'
                    }),
                };
            }
        }
    }

    // Fetch deliverables
    const result = await client.query(
        `SELECT * FROM deliverables WHERE project_id = $1 ORDER BY estimated_completion_week`,
        [projectId]
    );

    // Add computed expiry to each deliverable
    const deliverables = result.rows.map(d => {
        if (d.status === 'final_delivered' && d.final_delivered_at) {
            const deliveryDate = new Date(d.final_delivered_at);
            const expiryDate = new Date(deliveryDate.getTime() + 365 * 24 * 60 * 60 * 1000);
            d.expires_at = expiryDate.toISOString();
            d.files_expired = new Date() > expiryDate;
        }
        return d;
    });

    // For clients, filter out deliverables not yet ready for viewing
    const viewableStatuses = ['beta_ready', 'awaiting_approval', 'approved', 'payment_pending', 'final_delivered'];
    const filteredDeliverables = userRole === 'client'
        ? deliverables.filter(d => viewableStatuses.includes(d.status))
        : deliverables;

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(filteredDeliverables),
    };
}
```
  </action>
  <verify>
Manual test:
1. Login as Client A
2. GET /api/deliverables?projectId={Client A's project} -> should return deliverables
3. GET /api/deliverables?projectId={Client B's project} -> should get 403
4. Login as Admin -> should see all deliverables for any project
5. Login as Client A for project with mixed statuses -> should only see viewable statuses
  </verify>
  <done>
- GET by projectId validates client owns project
- Admin/PM see all deliverables for any project
- Team member access based on task assignment
- Clients only see deliverables in viewable statuses
- Dynamic expiry computed for all returned deliverables
  </done>
</task>

</tasks>

<verification>
1. Permission matrix test:
   | User | Own Project | Other Project | Expected |
   |------|-------------|---------------|----------|
   | Client A | GET projectId=A | GET projectId=B | 200 / 403 |
   | Admin | Any | Any | 200 |
   | Team (assigned) | Project A | Project B | 200 / 403 |

2. Status filtering test (as client):
   - Project with pending, in_progress, beta_ready deliverables
   - Client should only see beta_ready in list

3. Expiry test:
   - Deliverable with final_delivered_at > 365 days ago
   - Non-admin should get 403 FILES_EXPIRED
   - Admin should still see it
</verification>

<success_criteria>
1. GET by ID validates project ownership
2. GET by projectId validates project ownership
3. Clients only see their own project deliverables
4. Clients only see deliverables in viewable statuses
5. Admin/PM can access any deliverable
6. Team members validated by task assignment
7. Dynamic expiry computed from final_delivered_at
8. expires_at field included in response
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-04-deliverables-system/PROD-04-04-SUMMARY.md`
</output>
