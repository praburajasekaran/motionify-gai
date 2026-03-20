---
phase: PROD-01-authentication-security
plan: 08
type: execute
wave: 2
depends_on: ["PROD-01-06"]
files_modified:
  - netlify/functions/proposals.ts
  - netlify/functions/projects.ts
  - netlify/functions/projects-accept-terms.ts
  - netlify/functions/deliverables.ts
  - netlify/functions/tasks.ts
  - netlify/functions/payments.ts
  - netlify/functions/comments.ts
  - netlify/functions/attachments.ts
  - netlify/functions/inquiries.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "All POST endpoints validate request body with Zod schemas"
    - "All PUT/PATCH endpoints validate request body with Zod schemas"
    - "Invalid payloads return 400 Bad Request with validation errors"
    - "SQL injection attempts are blocked by validation + parameterized queries"
  artifacts:
    - path: "netlify/functions/proposals.ts"
      provides: "Validated proposals API"
      contains: "withValidation"
    - path: "netlify/functions/projects.ts"
      provides: "Validated projects API"
      contains: "withValidation"
    - path: "netlify/functions/_shared/schemas.ts"
      provides: "All validation schemas"
      exports: ["SCHEMAS"]
  key_links:
    - from: "netlify/functions/proposals.ts"
      to: "_shared/schemas.ts"
      via: "SCHEMAS import"
      pattern: "SCHEMAS.proposal"
---

<objective>
Apply input validation middleware to all mutation endpoints using existing Zod schemas.

Purpose: 23 validation schemas exist in _shared/schemas.ts but only 3 endpoints use withValidation middleware. Manual validation is error-prone and inconsistent. Schema-based validation provides type safety and comprehensive input checking.

Output: All POST/PUT/PATCH endpoints validate input against Zod schemas.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

@netlify/functions/_shared/middleware.ts
@netlify/functions/_shared/schemas.ts
@netlify/functions/_shared/validation.ts
@netlify/functions/invitations-create.ts (reference implementation)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Validation to Proposals and Projects Endpoints</name>
  <files>
    - netlify/functions/proposals.ts
    - netlify/functions/projects.ts
    - netlify/functions/projects-accept-terms.ts
  </files>
  <action>
    Add input validation using existing schemas from _shared/schemas.ts.

    **Available schemas (SCHEMAS object):**
    - SCHEMAS.proposal.create (createProposalSchema)
    - SCHEMAS.proposal.update (updateProposalSchema)
    - SCHEMAS.project.create (createProjectSchema)
    - SCHEMAS.project.update (updateProjectSchema)
    - SCHEMAS.project.acceptTerms (acceptProjectTermsSchema)

    **For proposals.ts:**

    The challenge: This endpoint handles multiple HTTP methods (GET, POST, PUT, PATCH, DELETE).
    withValidation only makes sense for methods with request bodies.

    **Approach 1: Validate inside handler based on method**
    ```typescript
    import { SCHEMAS } from './_shared/schemas';
    import { validateRequest } from './_shared/validation';

    export const handler = compose(
        withCORS(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        withAuth(),
        withRateLimit(RATE_LIMITS.api, 'proposals'),
    )(async (event, auth) => {
        const origin = event.headers.origin || event.headers.Origin;

        // Validate based on method
        if (event.httpMethod === 'POST') {
            const validation = validateRequest(event.body, SCHEMAS.proposal.create, origin);
            if (!validation.success) return validation.response;
            // Use validation.data
        }

        if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
            const validation = validateRequest(event.body, SCHEMAS.proposal.update, origin);
            if (!validation.success) return validation.response;
            // Use validation.data
        }

        // ... rest of handler
    });
    ```

    **For projects.ts:**
    - POST: Validate with SCHEMAS.project.create
    - PUT/PATCH: Validate with SCHEMAS.project.update

    **For projects-accept-terms.ts:**
    - POST: Validate with SCHEMAS.project.acceptTerms
    - Since this is POST-only, can use withValidation in compose chain:
    ```typescript
    export const handler = compose(
        withCORS(['POST']),
        withAuth(),
        withRateLimit(RATE_LIMITS.apiStrict, 'project_accept_terms'),
        withValidation(SCHEMAS.project.acceptTerms),
    )(async (event, auth) => { ... });
    ```

    **Import required:**
    ```typescript
    import { SCHEMAS } from './_shared/schemas';
    import { validateRequest } from './_shared/validation';
    ```
  </action>
  <verify>
    1. Verify schema imports: `grep -l "SCHEMAS" netlify/functions/proposals.ts netlify/functions/projects.ts`
    2. Verify validation: `grep -l "validateRequest\|withValidation" netlify/functions/proposals.ts netlify/functions/projects.ts netlify/functions/projects-accept-terms.ts`
    3. Run build: `npm run build`
  </verify>
  <done>
    - proposals.ts validates POST with SCHEMAS.proposal.create
    - proposals.ts validates PUT/PATCH with SCHEMAS.proposal.update
    - projects.ts validates POST with SCHEMAS.project.create
    - projects.ts validates PUT/PATCH with SCHEMAS.project.update
    - projects-accept-terms.ts validates with SCHEMAS.project.acceptTerms
    - Build passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Validation to Core Business Endpoints</name>
  <files>
    - netlify/functions/deliverables.ts
    - netlify/functions/tasks.ts
    - netlify/functions/payments.ts
  </files>
  <action>
    Add validation to deliverables, tasks, and payments endpoints.

    **Available schemas:**
    - SCHEMAS.deliverable.create (createDeliverableSchema)
    - SCHEMAS.deliverable.update (updateDeliverableSchema)
    - SCHEMAS.task.create (createTaskSchema)
    - SCHEMAS.task.update (updateTaskSchema)
    - SCHEMAS.payment.create (createPaymentSchema)
    - SCHEMAS.payment.update (updatePaymentSchema)

    **For deliverables.ts:**
    - POST: Validate with SCHEMAS.deliverable.create
    - PUT/PATCH: Validate with SCHEMAS.deliverable.update

    **For tasks.ts:**
    - POST: Validate with SCHEMAS.task.create
    - PUT/PATCH: Validate with SCHEMAS.task.update

    **For payments.ts:**
    - POST: Validate with SCHEMAS.payment.create
    - PUT/PATCH: Validate with SCHEMAS.payment.update

    **Pattern for multi-method endpoints:**
    ```typescript
    import { SCHEMAS } from './_shared/schemas';
    import { validateRequest } from './_shared/validation';

    // Inside handler:
    if (event.httpMethod === 'POST') {
        const validation = validateRequest(event.body, SCHEMAS.task.create, origin);
        if (!validation.success) return validation.response;
        const data = validation.data;
        // Use validated data...
    }
    ```

    **Replace manual validation with schema validation:**
    - Remove manual JSON.parse + field checking
    - Use validateRequest which handles parsing, validation, and error responses
    - The validation.data is type-safe and matches the schema
  </action>
  <verify>
    1. Verify: `grep -l "SCHEMAS" netlify/functions/deliverables.ts netlify/functions/tasks.ts netlify/functions/payments.ts`
    2. Run build: `npm run build`
  </verify>
  <done>
    - deliverables.ts validates POST/PUT/PATCH with appropriate schemas
    - tasks.ts validates POST/PUT/PATCH with appropriate schemas
    - payments.ts validates POST/PUT/PATCH with appropriate schemas
    - Build passes
  </done>
</task>

<task type="auto">
  <name>Task 3: Add Validation to Supporting Endpoints</name>
  <files>
    - netlify/functions/comments.ts
    - netlify/functions/attachments.ts
    - netlify/functions/inquiries.ts
  </files>
  <action>
    Add validation to comments, attachments, and inquiries endpoints.

    **Available schemas:**
    - SCHEMAS.comment.create (createCommentSchema)
    - SCHEMAS.comment.update (updateCommentSchema)
    - SCHEMAS.attachment.create (createAttachmentSchema)
    - SCHEMAS.inquiry.create (createInquirySchema)
    - SCHEMAS.inquiry.requestVerification (requestInquiryVerificationSchema)

    **For comments.ts:**
    - POST: Validate with SCHEMAS.comment.create
    - PUT: Validate with SCHEMAS.comment.update

    **For attachments.ts:**
    - POST: Validate with SCHEMAS.attachment.create

    **For inquiries.ts:**
    - POST: Validate with SCHEMAS.inquiry.create
    - Note: inquiries may have a sub-endpoint for verification

    **Pattern:**
    ```typescript
    import { SCHEMAS } from './_shared/schemas';
    import { validateRequest } from './_shared/validation';

    // For POST
    if (event.httpMethod === 'POST') {
        const validation = validateRequest(event.body, SCHEMAS.comment.create, origin);
        if (!validation.success) return validation.response;
        const { proposalId, content, attachmentIds } = validation.data;
        // Use validated, typed data
    }
    ```
  </action>
  <verify>
    1. Verify: `grep -l "SCHEMAS" netlify/functions/comments.ts netlify/functions/attachments.ts netlify/functions/inquiries.ts`
    2. Run build: `npm run build`
    3. Count validated endpoints: `grep -l "SCHEMAS\|withValidation" netlify/functions/*.ts | grep -v _shared | wc -l` should be >= 12
  </verify>
  <done>
    - comments.ts validates POST with SCHEMAS.comment.create
    - comments.ts validates PUT with SCHEMAS.comment.update
    - attachments.ts validates POST with SCHEMAS.attachment.create
    - inquiries.ts validates POST with SCHEMAS.inquiry.create
    - Build passes
    - At least 12 endpoints use validation
  </done>
</task>

</tasks>

<verification>
After completing all tasks:

1. Build verification:
   - `npm run build` passes without errors

2. Coverage verification:
   - `grep -l "SCHEMAS\|withValidation" netlify/functions/*.ts | grep -v _shared | wc -l`
   - Should show 12+ endpoints using validation

3. Functional verification (manual):
   - POST /proposals with invalid body returns 400 with validation errors
   - POST /comments with empty content returns 400
   - POST /tasks with invalid priority enum returns 400
   - Valid payloads continue to work normally
</verification>

<success_criteria>
1. All POST endpoints validate input with appropriate schema
2. All PUT/PATCH endpoints validate input with appropriate schema
3. Invalid payloads return 400 Bad Request with Zod validation errors
4. Build passes without errors
5. Valid requests continue to work as before
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-01-authentication-security/PROD-01-08-SUMMARY.md`
</output>
