---
phase: PROD-01-authentication-security
plan: 11
type: execute
wave: 1
depends_on: []
files_modified:
  - netlify/functions/_shared/schemas.ts
  - netlify/functions/projects.ts
  - netlify/functions/notifications.ts
  - netlify/functions/activities.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "projects.ts POST uses Zod schema validation via withValidation"
    - "notifications.ts PATCH uses Zod schema validation via withValidation"
    - "activities.ts POST uses Zod schema validation via withValidation"
    - "Invalid payloads return 400 with Zod error details, not generic error messages"
  artifacts:
    - path: "netlify/functions/_shared/schemas.ts"
      provides: "Schemas for project creation, notification update, activity creation"
      contains: "projectFromProposal|notificationMarkRead|activityCreate"
    - path: "netlify/functions/projects.ts"
      provides: "withValidation in compose chain for POST"
      contains: "withValidation"
    - path: "netlify/functions/notifications.ts"
      provides: "withValidation in compose chain for PATCH"
      contains: "withValidation"
    - path: "netlify/functions/activities.ts"
      provides: "withValidation in compose chain for POST"
      contains: "withValidation"
  key_links:
    - from: "netlify/functions/projects.ts"
      to: "_shared/schemas.ts"
      via: "SCHEMAS.project.fromProposal import"
      pattern: "SCHEMAS\\.project"
    - from: "netlify/functions/notifications.ts"
      to: "_shared/schemas.ts"
      via: "SCHEMAS.notification import"
      pattern: "SCHEMAS\\.notification"
---

<objective>
Standardize input validation for 3 remaining mutation endpoints that still use manual validation.

Purpose: Close Gap 2 from PROD-01-VERIFICATION.md - inconsistent validation patterns increase maintenance burden and risk.

Output: All mutation endpoints use Zod schemas via withValidation(). Validated endpoint count increases from 14 to 17 (85% coverage of mutations).
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/PROD-01-authentication-security/PROD-01-VERIFICATION.md

Reference existing schemas in:
@netlify/functions/_shared/schemas.ts

Reference validation pattern from payments.ts which handles different operations with different schemas.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create new schemas in schemas.ts</name>
  <files>netlify/functions/_shared/schemas.ts</files>
  <action>
    Add three new schemas to schemas.ts for the remaining endpoints:

    1. **Project from Proposal schema** (for projects.ts POST):
       This is a workflow-specific schema different from createProjectSchema.
       Add after the existing project schemas:
       ```typescript
       export const createProjectFromProposalSchema = z.object({
           inquiryId: uuidSchema,
           proposalId: uuidSchema,
       });
       ```

    2. **Notification schemas** (for notifications.ts PATCH):
       Add after payment schemas:
       ```typescript
       // ==========================================
       // Notification Schemas
       // ==========================================

       export const markNotificationReadSchema = z.object({
           userId: uuidSchema,
           notificationId: uuidSchema.optional(),
       });

       export const markAllNotificationsReadSchema = z.object({
           userId: uuidSchema,
       });
       ```

    3. **Activity create schema** (for activities.ts POST):
       Add after notification schemas:
       ```typescript
       // ==========================================
       // Activity Schemas
       // ==========================================

       export const createActivitySchema = z.object({
           type: z.string().min(1).max(100),
           userId: uuidSchema,
           userName: nameSchema,
           targetUserId: uuidSchema.optional(),
           targetUserName: nameSchema.optional(),
           inquiryId: uuidSchema.optional(),
           proposalId: uuidSchema.optional(),
           projectId: uuidSchema.optional(),
           details: z.record(z.union([z.string(), z.number()])).optional(),
       }).refine(
           data => data.inquiryId || data.proposalId || data.projectId,
           { message: "At least one of inquiryId, proposalId, or projectId is required" }
       );
       ```

    4. **Update SCHEMAS export** to include new schemas:
       ```typescript
       export const SCHEMAS = {
           // ... existing schemas
           project: {
               create: createProjectSchema,
               update: updateProjectSchema,
               acceptTerms: acceptProjectTermsSchema,
               fromProposal: createProjectFromProposalSchema, // NEW
           },
           notification: {
               markRead: markNotificationReadSchema,
               markAllRead: markAllNotificationsReadSchema,
           },
           activity: {
               create: createActivitySchema,
           },
           // ... rest of existing schemas
       };
       ```
  </action>
  <verify>
    Check schemas are exported:
    `grep -n "fromProposal\|markRead\|activity:" netlify/functions/_shared/schemas.ts`
  </verify>
  <done>
    schemas.ts contains createProjectFromProposalSchema, markNotificationReadSchema, markAllNotificationsReadSchema, and createActivitySchema. SCHEMAS export includes all new schemas.
  </done>
</task>

<task type="auto">
  <name>Task 2: Apply validation to projects.ts POST</name>
  <files>netlify/functions/projects.ts</files>
  <action>
    Replace manual validation in projects.ts POST with schema validation:

    1. Add validateRequest import if not present:
       `import { validateRequest } from './_shared/validation';`

    2. In the POST handler, replace manual validation:

       **Before (lines ~148-156):**
       ```typescript
       const { inquiryId, proposalId } = JSON.parse(event.body || '{}');

       if (!inquiryId || !proposalId) {
           return {
               statusCode: 400,
               headers,
               body: JSON.stringify({ error: 'inquiryId and proposalId are required' }),
           };
       }
       ```

       **After:**
       ```typescript
       const validation = validateRequest(event.body, SCHEMAS.project.fromProposal, origin);
       if (!validation.success) return validation.response;
       const { inquiryId, proposalId } = validation.data;
       ```

    Note: Keep the existing compose pattern - we're only changing the body parsing/validation inside the POST handler, not adding withValidation to compose (since GET doesn't need body validation).
  </action>
  <verify>
    Build passes: `cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1 && npm run build:admin`

    Check validation is used:
    `grep -n "SCHEMAS.project.fromProposal\|validateRequest" netlify/functions/projects.ts`
  </verify>
  <done>
    projects.ts POST uses validateRequest with SCHEMAS.project.fromProposal schema; manual validation removed.
  </done>
</task>

<task type="auto">
  <name>Task 3: Apply validation to notifications.ts PATCH and activities.ts POST</name>
  <files>
    netlify/functions/notifications.ts
    netlify/functions/activities.ts
  </files>
  <action>
    **notifications.ts:**

    1. Add imports at top:
       ```typescript
       import { SCHEMAS } from './_shared/schemas';
       import { validateRequest } from './_shared/validation';
       ```

    2. In the PATCH handler, replace manual validation:

       **Before (lines ~114-127):**
       ```typescript
       const params = event.queryStringParameters || {};
       const body = event.body ? JSON.parse(event.body) : {};
       const { userId, notificationId } = body;
       const markAll = params.markAll === 'true';

       if (!userId || !isValidUUID(userId)) {
           return {
               statusCode: 400,
               headers,
               body: JSON.stringify({ success: false, error: 'Valid userId is required' }),
           };
       }
       ```

       **After:**
       ```typescript
       const params = event.queryStringParameters || {};
       const markAll = params.markAll === 'true';

       // Use appropriate schema based on operation
       const schema = markAll ? SCHEMAS.notification.markAllRead : SCHEMAS.notification.markRead;
       const validation = validateRequest(event.body, schema, origin);
       if (!validation.success) return validation.response;
       const { userId, notificationId } = validation.data;
       ```

    3. Remove the `isValidUUID` function and the second validation block for notificationId (Zod handles it).

    **activities.ts:**

    1. Add imports at top:
       ```typescript
       import { SCHEMAS } from './_shared/schemas';
       import { validateRequest } from './_shared/validation';
       ```

    2. In the POST handler, replace manual validation:

       **Before (lines ~116-134):**
       ```typescript
       const payload: CreateActivityPayload = JSON.parse(event.body || '{}');

       if (!payload.type || !payload.userId || !payload.userName) {
           return {
               statusCode: 400,
               headers,
               body: JSON.stringify({ error: 'type, userId, and userName are required' }),
           };
       }

       // At least one context must be provided
       if (!payload.inquiryId && !payload.proposalId && !payload.projectId) {
           return {
               statusCode: 400,
               headers,
               body: JSON.stringify({ error: 'At least one of inquiryId, proposalId, or projectId is required' }),
           };
       }
       ```

       **After:**
       ```typescript
       const validation = validateRequest(event.body, SCHEMAS.activity.create, origin);
       if (!validation.success) return validation.response;
       const payload = validation.data;
       ```

       The Zod schema with `.refine()` handles the "at least one context" validation.

    3. Remove the `CreateActivityPayload` interface (no longer needed, Zod infers types).
  </action>
  <verify>
    Build passes: `cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1 && npm run build:admin`

    Check validation in both files:
    `grep -l "validateRequest" netlify/functions/notifications.ts netlify/functions/activities.ts`
  </verify>
  <done>
    notifications.ts PATCH and activities.ts POST both use validateRequest with Zod schemas; manual validation removed.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. **New schemas exist:**
   ```bash
   grep -c "fromProposal\|markRead\|markAllRead\|activity:" netlify/functions/_shared/schemas.ts
   # Should be >= 4
   ```

2. **All three endpoints use validateRequest:**
   ```bash
   grep -l "validateRequest" netlify/functions/projects.ts netlify/functions/notifications.ts netlify/functions/activities.ts | wc -l
   # Should output: 3
   ```

3. **Build verification:**
   ```bash
   npm run build:admin && npm run build:client
   # Both should pass
   ```

4. **Validated endpoint count:**
   ```bash
   grep -l "withValidation\|validateRequest" netlify/functions/*.ts | grep -v "_shared" | wc -l
   # Should output: 17 (up from 14)
   ```

5. **Manual validation patterns removed:**
   ```bash
   grep "isValidUUID" netlify/functions/notifications.ts
   # Should output: nothing (function removed)
   ```
</verification>

<success_criteria>
- 3 new schemas added to schemas.ts (projectFromProposal, notificationMarkRead/markAllRead, activityCreate)
- projects.ts POST uses validateRequest with SCHEMAS.project.fromProposal
- notifications.ts PATCH uses validateRequest with SCHEMAS.notification.markRead/markAllRead
- activities.ts POST uses validateRequest with SCHEMAS.activity.create
- All builds pass (admin Vite + client Next.js)
- Validated endpoint count increases from 14 to 17
- Invalid payloads return 400 with Zod error format
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-01-authentication-security/PROD-01-11-SUMMARY.md`
</output>
