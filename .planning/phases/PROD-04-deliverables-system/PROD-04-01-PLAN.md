---
phase: PROD-04-deliverables-system
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - netlify/functions/r2-presign.ts
  - netlify/functions/_shared/schemas.ts
autonomous: true

must_haves:
  truths:
    - "Client A cannot download file keys belonging to Client B's projects"
    - "R2 presign GET endpoint validates user has access to the requested file key"
    - "Admin users can access any file key"
  artifacts:
    - path: "netlify/functions/r2-presign.ts"
      provides: "Key ownership validation in GET handler"
      contains: "validateKeyAccess"
  key_links:
    - from: "netlify/functions/r2-presign.ts"
      to: "deliverables table"
      via: "database query"
      pattern: "SELECT.*FROM deliverables.*WHERE.*file_key"
---

<objective>
Add key ownership validation to r2-presign GET endpoint to prevent cross-project file access.

Purpose: CRITICAL SECURITY FIX - Currently any authenticated user can request a download URL for any file key by guessing/knowing the key. This allows Client A to access Client B's files.

Output: r2-presign GET handler validates the requesting user has permission to access the file key before generating a presigned download URL.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@netlify/functions/r2-presign.ts
@netlify/functions/deliverables.ts
@utils/deliverablePermissions.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add key ownership validation to r2-presign GET handler</name>
  <files>netlify/functions/r2-presign.ts</files>
  <action>
Add a database lookup in the GET handler to validate the user has access to the requested file key before generating a presigned URL.

Implementation:
1. Import pg Client and getDbConfig pattern from other functions
2. After the path traversal validation, add a database query to check key ownership:
   ```typescript
   // Check if key belongs to a deliverable and user has access
   const keyOwnershipResult = await client.query(`
     SELECT d.id, d.project_id, d.status, p.client_user_id
     FROM deliverables d
     JOIN projects p ON d.project_id = p.id
     WHERE d.beta_file_key = $1 OR d.final_file_key = $1
   `, [key]);

   // If key not found in deliverables, check comment_attachments
   if (keyOwnershipResult.rows.length === 0) {
     const attachmentResult = await client.query(`
       SELECT ca.id, pc.proposal_id
       FROM comment_attachments ca
       JOIN proposal_comments pc ON ca.comment_id = pc.id
       WHERE ca.r2_key = $1
     `, [key]);

     // If not in attachments either, allow (might be other valid use case like user uploads)
     // Admin can access everything
     if (auth?.user?.role === 'super_admin' || auth?.user?.role === 'project_manager') {
       // Allow
     } else if (attachmentResult.rows.length > 0) {
       // Validate proposal access
       // ... check user can view proposal
     }
   } else {
     const { project_id, client_user_id, status } = keyOwnershipResult.rows[0];

     // Admin/PM can access all
     if (auth?.user?.role === 'super_admin' || auth?.user?.role === 'project_manager') {
       // Allow
     }
     // Client can only access their own project's files when status allows viewing
     else if (auth?.user?.role === 'client') {
       const isOwnProject = client_user_id === auth.user.userId;
       const viewableStatuses = ['beta_ready', 'awaiting_approval', 'approved', 'payment_pending', 'final_delivered'];

       if (!isOwnProject || !viewableStatuses.includes(status)) {
         return {
           statusCode: 403,
           headers,
           body: JSON.stringify({
             error: {
               code: 'ACCESS_DENIED',
               message: 'You do not have permission to access this file',
             },
           }),
         };
       }
     }
   }
   ```

3. Add proper database connection handling with try/finally to close connection

Important: Keep the existing path traversal validation. Add the ownership check AFTER that validation but BEFORE generating the presigned URL.
  </action>
  <verify>
Manual test:
1. Login as Client A (has project with deliverable)
2. Get a file key from Client A's deliverable
3. Login as Client B (different project)
4. Try to GET /api/r2-presign?key={Client A's key}
5. Expect 403 ACCESS_DENIED response

Also verify admin users CAN still access all keys.
  </verify>
  <done>
- GET /api/r2-presign returns 403 when client requests key from another client's project
- GET /api/r2-presign returns 200 with presigned URL when client requests their own project's file
- Admin and PM can access any file key
- Path traversal prevention still works (.. and / rejected)
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Team Member key access based on task assignment</name>
  <files>netlify/functions/r2-presign.ts</files>
  <action>
Extend the key ownership validation to handle team_member role:

```typescript
// Team members can access project files if they're on the project team
else if (auth?.user?.role === 'team_member') {
  // Check if team member is assigned to any task on this project
  const teamMemberResult = await client.query(`
    SELECT 1 FROM tasks
    WHERE project_id = $1
    AND (assignee_id = $2 OR $2 = ANY(assignee_ids))
    LIMIT 1
  `, [project_id, auth.user.userId]);

  if (teamMemberResult.rows.length === 0) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You are not assigned to tasks on this project',
        },
      }),
    };
  }
  // Team member has access via task assignment
}
```

Note: This maintains consistency with the permission system in deliverablePermissions.ts where team members can only work on tasks they're assigned to.
  </action>
  <verify>
Manual test:
1. Login as team_member assigned to Project A
2. Request key from Project A deliverable -> should succeed
3. Request key from Project B (not assigned) -> should get 403
  </verify>
  <done>
- Team members can access keys for projects where they have task assignments
- Team members cannot access keys for projects without task assignments
- Full role-based access control implemented for r2-presign GET endpoint
  </done>
</task>

</tasks>

<verification>
1. Security Test Matrix:
   | User Role | Own Project Key | Other Project Key | Expected |
   |-----------|-----------------|-------------------|----------|
   | Client | Own | - | 200 |
   | Client | - | Other's | 403 |
   | Team Member | Assigned | - | 200 |
   | Team Member | - | Unassigned | 403 |
   | Admin | Any | Any | 200 |
   | PM | Any | Any | 200 |

2. Path traversal still blocked:
   - `GET /api/r2-presign?key=../../etc/passwd` returns 400

3. No regression:
   - Existing file downloads still work for authorized users
</verification>

<success_criteria>
1. Client A cannot download Client B's files (GET returns 403)
2. Admin users can download any file (GET returns 200)
3. Team members can only access assigned project files
4. Path traversal attacks still blocked (400 response)
5. No TypeScript errors in r2-presign.ts
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-04-deliverables-system/PROD-04-01-SUMMARY.md`
</output>
