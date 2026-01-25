---
phase: PROD-04-deliverables-system
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - netlify/functions/_shared/schemas.ts
  - netlify/functions/r2-presign.ts
  - services/storage.ts
autonomous: true

must_haves:
  truths:
    - "File size validation allows up to 100MB for deliverables (R2 upload URL generation)"
    - "Schema, r2-presign, and storage service all use consistent 100MB limit"
    - "UI shows correct max file size to users"
  artifacts:
    - path: "netlify/functions/_shared/schemas.ts"
      provides: "r2PresignDeliverableSchema with 100MB limit"
      contains: "100 * 1024 * 1024"
  key_links:
    - from: "netlify/functions/r2-presign.ts"
      to: "netlify/functions/_shared/schemas.ts"
      via: "import and validation"
      pattern: "SCHEMAS\\.r2"
---

<objective>
Align file size limits across schema, backend, and frontend to allow 100MB deliverables.

Purpose: The current 10MB limit in schemas is too restrictive for video deliverables (research shows most are 50-200MB). The frontend references 5GB which exceeds R2 single-part upload max (4.995GB). Aligning at 100MB provides a practical balance for v1 without multipart upload complexity.

Output: Consistent 100MB file size validation across all layers.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-04-deliverables-system/PROD-04-RESEARCH.md
@netlify/functions/_shared/schemas.ts
@components/deliverables/DeliverableCard.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create deliverable-specific presign schema with 100MB limit</name>
  <files>netlify/functions/_shared/schemas.ts</files>
  <action>
Add a new schema specifically for deliverable uploads with higher size limit, keeping the existing r2PresignSchema for comment attachments:

```typescript
// ==========================================
// R2 Presign Schemas
// ==========================================

// For comment attachments (keep existing 10MB limit)
export const r2PresignSchema = z.object({
    fileName: z.string().min(1).max(255),
    fileType: z.string().min(1).max(100),
    fileSize: z.number().positive().max(10 * 1024 * 1024), // 10MB max for comments
    commentId: uuidSchema.optional(),
});

// For deliverable uploads (100MB limit)
export const r2PresignDeliverableSchema = z.object({
    fileName: z.string().min(1).max(255),
    fileType: z.string().min(1).max(100).refine(
        (type) => ['video/', 'image/', 'application/pdf'].some(allowed => type.startsWith(allowed)),
        { message: 'File type must be video, image, or PDF' }
    ),
    fileSize: z.number()
        .positive()
        .max(100 * 1024 * 1024, 'File size cannot exceed 100MB'), // 100MB max
    projectId: uuidSchema.optional(),
    folder: z.enum(['beta', 'final', 'misc']).optional(),
});
```

Add to SCHEMAS export:
```typescript
r2: {
    presign: r2PresignSchema,
    presignDeliverable: r2PresignDeliverableSchema,
},
```
  </action>
  <verify>
TypeScript compiles without errors:
```bash
cd netlify/functions && npx tsc --noEmit
```
  </verify>
  <done>
- r2PresignDeliverableSchema exists with 100MB limit
- Original r2PresignSchema unchanged (10MB for comments)
- File type validation added for deliverables (video, image, PDF only)
  </done>
</task>

<task type="auto">
  <name>Task 2: Update r2-presign to use deliverable schema when appropriate</name>
  <files>netlify/functions/r2-presign.ts</files>
  <action>
Update the POST handler to select the appropriate schema based on whether it's a comment attachment or deliverable upload:

```typescript
// POST: Generate Upload URL with validation
if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || '{}');

    // Choose schema based on whether this is a comment attachment or deliverable
    const isCommentAttachment = body.commentId !== undefined;
    const schema = isCommentAttachment
        ? SCHEMAS.r2.presign
        : SCHEMAS.r2.presignDeliverable;

    const validation = (await import('./_shared/validation')).validateRequest(
        event.body,
        schema,
        origin
    );

    if (!validation.success) {
        return validation.response;
    }

    const { fileName, fileType, fileSize, commentId, projectId, folder } = validation.data;

    // Generate secure key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    let key: string;
    if (commentId) {
        key = `comments/${commentId}/${timestamp}-${sanitizedFileName}`;
    } else if (projectId && folder) {
        key = `projects/${projectId}/${folder}/${timestamp}-${sanitizedFileName}`;
    } else {
        key = `uploads/${auth!.user!.userId}/${timestamp}-${sanitizedFileName}`;
    }

    // ... rest of handler unchanged
}
```

This keeps backward compatibility: requests with commentId use 10MB schema, requests without use 100MB schema.
  </action>
  <verify>
Manual test:
1. POST /api/r2-presign with commentId and 5MB file -> should succeed
2. POST /api/r2-presign with commentId and 15MB file -> should fail (over 10MB)
3. POST /api/r2-presign without commentId and 50MB file -> should succeed
4. POST /api/r2-presign without commentId and 150MB file -> should fail (over 100MB)
  </verify>
  <done>
- Comment attachments validated against 10MB limit
- Deliverable uploads validated against 100MB limit
- File type validation enforced for deliverables (video, image, PDF)
- Key generation uses project/folder structure for deliverables
  </done>
</task>

<task type="auto">
  <name>Task 3: Update frontend file size limit in DeliverableCard</name>
  <files>components/deliverables/DeliverableCard.tsx</files>
  <action>
Change the MAX_FILE_SIZE constant from 5GB to 100MB to match the backend validation:

```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for deliverables (aligned with backend)
```

Update the error message in handleFileChange:
```typescript
if (file.size > MAX_FILE_SIZE) {
    alert(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is 100MB. For larger files, contact support.`);
    if (fileInputRef.current) fileInputRef.current.value = '';
    return;
}
```

Add a console warning about the limit:
```typescript
console.log(`[DeliverableCard] File selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
```
  </action>
  <verify>
Build succeeds:
```bash
npm run build
```
  </verify>
  <done>
- DeliverableCard uses 100MB limit instead of 5GB
- User gets clear error message when file exceeds limit
- Frontend and backend limits are aligned
  </done>
</task>

</tasks>

<verification>
1. Schema validation test:
   ```bash
   # In Node REPL or test file
   const { z } = require('zod');
   const { SCHEMAS } = require('./netlify/functions/_shared/schemas');

   // Comment attachment: 10MB limit
   console.log(SCHEMAS.r2.presign.safeParse({ fileName: 'test.pdf', fileType: 'application/pdf', fileSize: 5 * 1024 * 1024, commentId: 'uuid' }).success); // true
   console.log(SCHEMAS.r2.presign.safeParse({ fileName: 'test.pdf', fileType: 'application/pdf', fileSize: 15 * 1024 * 1024, commentId: 'uuid' }).success); // false

   // Deliverable: 100MB limit
   console.log(SCHEMAS.r2.presignDeliverable.safeParse({ fileName: 'video.mp4', fileType: 'video/mp4', fileSize: 50 * 1024 * 1024 }).success); // true
   console.log(SCHEMAS.r2.presignDeliverable.safeParse({ fileName: 'video.mp4', fileType: 'video/mp4', fileSize: 150 * 1024 * 1024 }).success); // false
   ```

2. Full build passes:
   ```bash
   npm run build
   ```
</verification>

<success_criteria>
1. r2PresignDeliverableSchema exists with 100MB limit
2. r2PresignSchema unchanged at 10MB for comment attachments
3. r2-presign.ts selects schema based on request type
4. DeliverableCard.tsx uses 100MB limit
5. Both builds pass without errors
6. File type validation enforced for deliverables
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-04-deliverables-system/PROD-04-02-SUMMARY.md`
</output>
