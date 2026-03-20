# Phase PROD-04: Deliverables System - Research

**Researched:** 2026-01-25
**Domain:** File storage, upload/download workflows, R2 presigned URLs, permission-based access control
**Confidence:** HIGH

## Summary

The deliverables system is an existing implementation that handles file delivery from admin to client through a multi-stage approval workflow. The system uses Cloudflare R2 (S3-compatible storage) with presigned URLs for secure file uploads and downloads. Files progress through states: `pending` → `in_progress` → `beta_ready` → `awaiting_approval` → `approved` → `payment_pending` → `final_delivered`.

**Current Implementation Status:**
- ✅ R2 storage integration exists (`netlify/functions/r2-presign.ts`)
- ✅ Deliverables API with CRUD operations (`netlify/functions/deliverables.ts`)
- ✅ File upload with progress tracking (`services/storage.ts`, `components/deliverables/FileUploadZone.tsx`)
- ✅ Permission system implemented (`utils/deliverablePermissions.ts`)
- ✅ File expiry tracking (365 days, `files_expired` column)
- ✅ Email notifications on status transitions
- ⚠️ Security middleware applied (withAuth, withRateLimit, withCORS)
- ⚠️ Path traversal prevention in r2-presign endpoint
- ❌ No evidence of multipart upload for large files (current limit: 10MB in schema, but code references 5GB)
- ❌ No automated tests found

**Primary recommendation:** Focus on hardening existing implementation through comprehensive testing, error handling improvements, and validation of security measures rather than building new features.

## Standard Stack

### Core Libraries (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @aws-sdk/client-s3 | ^3.958.0 | R2/S3 operations | AWS SDK v3 is the current standard for S3-compatible storage |
| @aws-sdk/s3-request-presigner | ^3.958.0 | Generate presigned URLs | Official AWS library for secure temporary URLs |
| pg | Latest | PostgreSQL client | Direct database access for deliverables metadata |
| zod | Latest | Request validation | Industry standard for TypeScript runtime validation |

### Validation & Security (In Use)

| Library | Purpose | Current Usage |
|---------|---------|---------------|
| Zod schemas | Input validation | `SCHEMAS.deliverable.update` validates status, file keys |
| Middleware composition | Security layers | `compose(withCORS, withAuth, withRateLimit)` |
| JWT authentication | User verification | Cookie-based auth via `requireAuthFromCookie` |
| Rate limiting | Abuse prevention | 20 requests/minute for r2-presign endpoint |

### Client-Side Upload

| Technology | Purpose | Why Used |
|-----------|---------|----------|
| XMLHttpRequest | Upload progress tracking | Fetch API doesn't support upload progress events |
| Canvas API | Video thumbnail generation | Browser-native, no external dependencies |
| File API | Client-side file validation | Pre-upload validation before hitting server |

## Architecture Patterns

### Current File Upload Flow

```
Client Browser
    │
    ├─> 1. Request presigned URL
    │   POST /api/r2-presign
    │   { fileName, fileType, fileSize, commentId? }
    │
    ├─> 2. Server generates presigned URL
    │   - Sanitize filename (remove non-alphanumeric)
    │   - Generate key: uploads/{userId}/{timestamp}-{filename}
    │   - Create PutObjectCommand with ContentType, ContentLength
    │   - Sign URL with 1 hour expiry
    │
    ├─> 3. Upload file directly to R2
    │   PUT {presignedUrl}
    │   - XMLHttpRequest for progress tracking
    │   - Body: raw file data
    │
    └─> 4. Update deliverable record
        PATCH /api/deliverables/{id}
        { beta_file_key: key }
```

### Permission-Based Access Pattern (EXISTING)

The codebase implements a 5-role system with state-based permissions:

**Roles:** `super_admin`, `project_manager`, `team_member`, `client`

**Permission Functions:**
- `canViewDeliverable()` - Role + status checks
- `canUploadBetaFiles()` - Team members only on assigned tasks
- `canUploadFinalFiles()` - Admin & PM only
- `canApproveDeliverable()` - Client primary contact only
- `canAccessFinalFiles()` - Checks payment status, expiry (365 days)

**Pattern Example:**
```typescript
export function canAccessFinalFiles(user: User, deliverable: Deliverable, project: Project): boolean {
  if (deliverable.status !== 'final_delivered') return false;

  // Check 365-day expiry
  if (deliverable.expiresAt && new Date() > new Date(deliverable.expiresAt)) {
    return user.role === 'super_admin';
  }

  return canViewDeliverable(user, deliverable, project);
}
```

### Status Workflow Pattern (EXISTING)

```
Admin creates deliverable (status: pending)
    ↓
Admin uploads beta file → beta_ready
    ↓
Admin marks awaiting_approval → awaiting_approval
    ↓
    ├─> Client approves → approved → Admin uploads final → payment_pending
    │                                      ↓
    │                                  Client pays → final_delivered
    │                                      ↓
    │                                  365 days → files_expired = true
    │
    └─> Client rejects → rejected → Admin re-uploads beta → beta_ready
```

### Video Thumbnail Generation (EXISTING)

```typescript
// Pattern: Client-side thumbnail from video file
const generateThumbnail = async (videoFile: File): Promise<File> => {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Load video
  video.src = URL.createObjectURL(videoFile);
  await video.loadedmetadata;

  // Seek to 25% position
  video.currentTime = video.duration * 0.25;
  await video.seeked;

  // Draw frame to canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  // Convert to blob
  return canvasToFile(canvas, 'thumbnail.jpg');
};
```

**Source:** [Create thumbnail from video file using canvas](https://medium.com/time-machine/how-to-get-video-thumbnails-with-javascript-video-and-image-thumbnail-for-html-file-upload-cc304ff7f7fb)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Presigned URL generation | Custom signature logic | `@aws-sdk/s3-request-presigner` | Handles AWS Signature v4 complexity, expiry, security |
| File upload progress | Custom progress calculation | XMLHttpRequest.upload.onprogress | Native browser API, battle-tested |
| Path traversal prevention | Regex patterns | key.includes('..') \|\| key.startsWith('/') | Simple, effective, already implemented |
| Request validation | Manual parsing | Zod schemas with `.refine()` | Type-safe, runtime validation, clear errors |
| Filename sanitization | Custom regex | `.replace(/[^a-zA-Z0-9._-]/g, '_')` | Handles most attack vectors, already in use |

**Key insight:** AWS SDK v3 handles the complex parts (signatures, retries, error codes). Focus testing on business logic, permissions, and edge cases, not re-implementing S3 protocols.

## Common Pitfalls

### Pitfall 1: Relying on Client-Side Validation for Security

**What goes wrong:** File size/type validation only in browser can be bypassed with curl or modified requests.

**Why it happens:** Developers add `accept="video/*"` and size checks to file input, then forget server-side validation.

**How to avoid:**
- Always validate on server in r2-presign endpoint
- Use Zod schema: `z.number().positive().max(5 * 1024 * 1024 * 1024)` for 5GB limit
- Reject presign requests for invalid sizes/types
- Current code validates in schema but limit is 10MB - MISMATCH with UI code showing 5GB

**Warning signs:** Comments like "// In real app, would validate on server"

**Source:** [Validating file uploads with Zod](https://medium.com/@bashaus/validating-file-uploads-and-their-contents-with-zod-in-typescript-38a122b5b926)

### Pitfall 2: Presigned URL Expiry Too Long or Too Short

**What goes wrong:**
- Too long (7 days): URLs leak and allow unauthorized access days later
- Too short (60s): Large files fail mid-upload

**Why it happens:** Using default expiry without considering file size and network speed.

**How to avoid:**
- Current implementation: 3600s (1 hour) - reasonable for most cases
- For 100MB file on slow connection (1 Mbps), upload time ~13 minutes
- For 5GB file on slow connection, upload time ~11 hours (exceeds 1 hour!)
- **Best practice:** Dynamic expiry based on file size:
  ```typescript
  const estimatedSeconds = Math.ceil(fileSize / (128 * 1024)); // 128KB/s assumed
  const expiresIn = Math.max(3600, Math.min(estimatedSeconds * 2, 43200)); // 1h-12h
  ```

**Warning signs:** Upload fails for large files with "URL expired" error

**Source:** [AWS Prescriptive Guidance - Presigned URL Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/overview.html)

### Pitfall 3: No Retry Logic for R2 InternalError

**What goes wrong:** R2 returns 500 InternalError transiently, upload fails permanently.

**Why it happens:** Treating all 500 errors as fatal instead of retrying safe operations.

**How to avoid:**
- Retry on `InternalError` (S3 error code, not just HTTP 500)
- Retry on `SlowDown` with exponential backoff
- Max 3 retries with 2^n second delays
- Current implementation: No retry logic detected in r2-presign or storage service

**Warning signs:** Intermittent upload failures that succeed on manual retry

**Source:** [Amazon S3 error best practices](https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorBestPractices.html)

### Pitfall 4: Treating HTTP Status as Complete Error Information

**What goes wrong:** Logging "Upload failed with status 403" without S3 error code.

**Why it happens:** Using HTTP status codes instead of parsing S3 error responses.

**How to avoid:**
- Parse error response body for S3 error code
- Example: Both `NoSuchKey` and `NoSuchBucket` return 404, but different fixes needed
- Log structure: `[R2 Error] Code: NoSuchBucket, Message: ..., RequestId: ...`

**Warning signs:** Error messages like "Failed with status 500" without detail

**Source:** [Amazon S3 error best practices](https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorBestPractices.html)

### Pitfall 5: No File Size Limit Enforcement in Presigned URL

**What goes wrong:** Presigned URL generated without size constraint, allowing 10GB upload when 5GB is max.

**Why it happens:** Setting `ContentLength` in presign request is optional, not enforced.

**How to avoid:**
- Include `ContentLength` in PutObjectCommand (already done)
- R2 validates actual upload matches signed ContentLength
- Current code: Sets ContentLength from validated fileSize
- **Gap:** What if client sends different size than signed? Test needed!

**Warning signs:** Uploads succeed despite exceeding declared size limits

**Source:** [Cloudflare R2 Presigned URL limit file size](https://community.cloudflare.com/t/cloudflare-r2-presigned-url-limit-file-size/455122)

### Pitfall 6: File Expiry Check Only on Download

**What goes wrong:** Files expired (365 days), download fails, but deliverable still shows "Available".

**Why it happens:** Expiry check in download endpoint, not reflected in list/status.

**How to avoid:**
- Compute `files_expired` field on deliverable fetch
- Show "Expired - Contact Support" status in UI
- Current implementation: Has `files_expired` column, checked in GET endpoint
- **Gap:** Need scheduled job to set `files_expired = true` at 365 days, or compute dynamically

**Warning signs:** Client confused why "Final Delivered" shows but download fails

### Pitfall 7: Missing Permission Checks on File Key Download

**What goes wrong:** Client A gets deliverable file key for Project B, requests presigned download URL.

**Why it happens:** r2-presign GET endpoint doesn't validate user has access to the key.

**How to avoid:**
- In r2-presign GET handler, validate key ownership:
  ```typescript
  // Check key belongs to user's project deliverable
  const deliverable = await db.query(
    'SELECT project_id FROM deliverables WHERE beta_file_key = $1 OR final_file_key = $1',
    [key]
  );
  // Then check user has access to project
  ```
- Current implementation: **GAP** - r2-presign only validates key format, not ownership
- This is a CRITICAL security issue

**Warning signs:** URL guessing allows cross-project file access

## Code Examples

Verified patterns from official sources and existing codebase:

### Presigned Upload URL Generation (EXISTING - VERIFIED)

```typescript
// Source: netlify/functions/r2-presign.ts (lines 94-135)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

// Validate and sanitize
const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
const key = `uploads/${userId}/${timestamp}-${sanitizedFileName}`;

const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
    ContentLength: fileSize, // Enforces size limit
});

const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });
```

**Source:** [AWS SDK S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/API/s3_example_s3_Scenario_PresignedUrl_section.html)

### File Upload with Progress Tracking (EXISTING - VERIFIED)

```typescript
// Source: services/storage.ts (lines 54-81)
async uploadFile(file: File, projectId: string, folder: string, onProgress?: (progress: number) => void): Promise<string> {
    // 1. Get presigned URL from backend
    const { uploadUrl, key } = await fetch('/api/r2-presign', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
    }).then(r => r.json());

    // 2. Upload with progress tracking
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(key);
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        };

        xhr.send(file);
    });
}
```

**Why XMLHttpRequest:** Fetch API does not support `upload.onprogress` events.

**Source:** [Tracking Upload Progress](https://www.siawyoung.com/xhr-upload-progress/)

### Zod File Upload Validation (PATTERN TO ADOPT)

```typescript
// Source: Best practice pattern for r2-presign validation
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB for deliverables
const ALLOWED_TYPES = ['video/', 'image/', 'application/pdf'];

export const r2PresignDeliverableSchema = z.object({
    fileName: z.string().min(1).max(255),
    fileType: z.string().refine(
        (type) => ALLOWED_TYPES.some(allowed => type.startsWith(allowed)),
        { message: 'File type must be video, image, or PDF' }
    ),
    fileSize: z.number()
        .positive()
        .max(MAX_FILE_SIZE, `File size cannot exceed ${MAX_FILE_SIZE / (1024**3)}GB`),
    deliverableId: z.string().uuid(),
});
```

**Current Gap:** r2-presign schema has 10MB limit, but UI references 5GB. Need alignment.

**Source:** [Validate file uploads with Zod](https://dev.to/drprime01/how-to-validate-a-file-input-with-zod-5739)

### Permission Enforcement in API (EXISTING - NEEDS ENHANCEMENT)

```typescript
// Source: Pattern from utils/deliverablePermissions.ts
// NEEDS: Add to r2-presign.ts for key ownership validation

export async function validateKeyAccess(key: string, userId: string, db: Client): Promise<boolean> {
    // Find deliverable that owns this key
    const result = await db.query(`
        SELECT d.id, d.project_id, p.client_user_id, d.status
        FROM deliverables d
        JOIN projects p ON d.project_id = p.id
        WHERE d.beta_file_key = $1 OR d.final_file_key = $1
    `, [key]);

    if (result.rows.length === 0) {
        return false; // Key doesn't exist
    }

    const { project_id, client_user_id, status } = result.rows[0];

    // Get user role and project membership
    const userResult = await db.query(`
        SELECT role FROM users WHERE id = $1
    `, [userId]);

    const { role } = userResult.rows[0];

    // Admin/PM can access all keys
    if (role === 'super_admin' || role === 'project_manager') {
        return true;
    }

    // Client can only access keys for their projects, and only if status allows
    if (role === 'client') {
        const isOwnProject = client_user_id === userId;
        const canView = ['beta_ready', 'awaiting_approval', 'approved', 'final_delivered'].includes(status);
        return isOwnProject && canView;
    }

    return false;
}
```

**Critical:** This check is MISSING from current r2-presign.ts GET handler!

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AWS SDK v2 | AWS SDK v3 | 2020 | Modular imports, tree-shaking, TypeScript-first |
| fetch() for uploads | XMLHttpRequest | Always needed | fetch() still cannot track upload progress |
| Fixed presigned expiry (1 day) | Dynamic based on file size | Recent best practice | Prevents leaks, handles large files |
| HTTP status for errors | S3 error codes (e.g., SlowDown) | S3 API standard | More actionable error information |
| Storing files in database | Object storage (R2/S3) with keys | Industry standard | Scalable, cost-effective, CDN-ready |

**Deprecated/outdated:**
- AWS SDK v2: Replaced by v3 with better TypeScript support
- Callback-based S3 operations: Now promise-based with async/await
- Public bucket access: Now presigned URLs for security and access control

## Testing Strategy

### Manual Testing Checklist (Production Readiness Focus)

**DEL-01: Deliverable Creation**
- [ ] Admin creates deliverable → appears in database
- [ ] File upload to R2 via presigned URL → key stored in `beta_file_key`
- [ ] Metadata (name, description) saved correctly
- [ ] Client views deliverable in portal (only when status = `beta_ready`)

**DEL-02: Approval Workflow**
- [ ] Client views beta deliverable → video plays, thumbnail loads
- [ ] Client requests revisions → status changes to `rejected`, email sent
- [ ] Client approves → status = `approved`, `approved_at` timestamp set
- [ ] Status transitions follow valid state machine

**DEL-03: R2 File Storage**
- [ ] Upload presigned URL works for 1MB file
- [ ] Upload presigned URL works for 100MB file
- [ ] Upload presigned URL works for 5GB file (if limit increased)
- [ ] Download presigned URL returns correct file
- [ ] File expiration (365 days) triggers graceful error message
- [ ] Presigned URL expires after 1 hour (test with small expiry)

**DEL-04: Permissions**
- [ ] Client A cannot view Client B's deliverables
- [ ] Client cannot download file key they don't own (test r2-presign security gap)
- [ ] Admin can view all deliverables
- [ ] Team member can only upload beta files to assigned tasks
- [ ] Client primary contact can approve, client team member cannot

**Security Tests:**
- [ ] Path traversal attack: Try key `../../etc/passwd` → rejected
- [ ] Filename injection: Try `file.mp4<script>alert(1)</script>` → sanitized
- [ ] Size manipulation: Request presign for 1MB, upload 100MB → verify rejection
- [ ] Cross-project access: Get key from Project A, request download while logged in as Project B client → verify rejection
- [ ] Expired presigned URL: Wait for expiry, try upload → verify failure
- [ ] Rate limit: Make 21 r2-presign requests in 1 minute → verify 429 response

### Integration Testing Pattern (Recommended)

Based on Netlify best practices research:

**Pattern:** Test against actual Netlify deployment, not just local

```typescript
// Example test structure (not currently implemented)
describe('Deliverables API Integration', () => {
    let testDeploymentUrl: string;
    let authToken: string;

    beforeAll(async () => {
        // Wait for Netlify preview deployment
        testDeploymentUrl = await waitForNetlifyDeploy();
        authToken = await getTestUserToken();
    });

    it('should upload 100MB file without timeout', async () => {
        const file = generateTestFile(100 * 1024 * 1024);

        // 1. Get presigned URL
        const presignRes = await fetch(`${testDeploymentUrl}/api/r2-presign`, {
            method: 'POST',
            headers: { 'Cookie': `auth_token=${authToken}` },
            body: JSON.stringify({
                fileName: 'large-test.mp4',
                fileType: 'video/mp4',
                fileSize: file.size,
            }),
        });
        expect(presignRes.status).toBe(200);
        const { uploadUrl, key } = await presignRes.json();

        // 2. Upload to R2
        const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': 'video/mp4' },
        });
        expect(uploadRes.status).toBe(200);

        // 3. Verify deliverable updated
        // ... assertions
    });
});
```

**Source:** [Jest tests for Netlify Functions](https://www.jeffreyknox.dev/blog/jest-tests-for-netlify-functions/)

## Open Questions

### Question 1: File Size Limit Alignment

**What we know:**
- r2-presign schema: 10MB max (`SCHEMAS.r2.presign`)
- DeliverableCard code: 5GB max (`MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024`)
- R2 actual limit: 4.995 GiB per single upload

**What's unclear:** What is the intended production limit?

**Recommendation:**
- Align all limits to 5GB (matches R2 single-part upload max)
- Update r2-presign schema to 5GB
- Document in PLAN that files 5GB+ need multipart upload (out of scope for this phase)

### Question 2: Scheduled Job for File Expiry

**What we know:**
- `files_expired` column exists
- GET endpoint checks expiry and returns 403 if expired
- No scheduled job to set `files_expired = true` at 365 days

**What's unclear:** Should expiry be computed dynamically or set by a cron job?

**Recommendation:**
- Phase 4: Compute dynamically on each request (simpler, no infra needed)
- Future enhancement: Netlify scheduled function to set flag daily
- Document in PLAN as known limitation

### Question 3: Multipart Upload for Large Files

**What we know:**
- R2 supports multipart upload for files > 5GB (up to 5TB)
- Current implementation: Single-part upload only
- No chunking logic detected

**What's unclear:** Is 5GB enough, or do we need multipart?

**Recommendation:**
- Phase 4: Test and validate single-part up to 5GB
- Document multipart as out-of-scope unless testing reveals real need
- Most video deliverables < 2GB (1080p, 5-10 min duration)

## Sources

### Primary (HIGH confidence)

- AWS SDK Client-S3 v3 official documentation: [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/API/s3_example_s3_Scenario_PresignedUrl_section.html)
- AWS Prescriptive Guidance: [Presigned URL Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/overview.html)
- Cloudflare R2 Documentation: [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- Cloudflare R2 Documentation: [Limits](https://developers.cloudflare.com/r2/platform/limits/)
- MDN Web Docs: [XMLHttpRequest.upload](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload)
- Existing codebase: `netlify/functions/r2-presign.ts`, `services/storage.ts`, `utils/deliverablePermissions.ts`

### Secondary (MEDIUM confidence)

- FourTheorem: [The illustrated guide to S3 pre-signed URLs](https://fourtheorem.com/the-illustrated-guide-to-s3-pre-signed-urls/)
- SaintLouvent: [S3 Error Handling: Class Design & Best Practices](https://saintlouvent.com/blog/s3-error-handling-class-design)
- Medium (Chukwuma Nwaugha): [Render video thumbnails using HTML canvas](https://medium.com/@c.nwaugha/render-video-thumbnails-using-html-canvas-dc7d08a5ed6f)
- Medium (Time Machine): [Create thumbnail from video file via canvas](https://medium.com/time-machine/how-to-get-video-thumbnails-with-javascript-video-and-image-thumbnail-for-html-file-upload-cc304ff7f7fb)
- DEV Community: [How to validate a file input with Zod](https://dev.to/drprime01/how-to-validate-a-file-input-with-zod-5739)

### Tertiary (LOW confidence)

- Community discussions: [Cloudflare R2 Presigned URL file size limits](https://community.cloudflare.com/t/cloudflare-r2-presigned-url-limit-file-size/455122)
- Blog post: [Tracking Upload Progress](https://www.siawyoung.com/xhr-upload-progress/)
- Netlify testing: [Jest tests for Netlify Functions](https://www.jeffreyknox.dev/blog/jest-tests-for-netlify-functions/)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - AWS SDK v3 is current standard, well-documented
- Architecture: HIGH - Existing implementation reviewed, patterns verified against docs
- Pitfalls: MEDIUM - Identified from AWS docs and codebase gaps, but not all tested in production
- Security gaps: HIGH - r2-presign key ownership check is definitively missing (confirmed via code review)

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - AWS SDK and R2 API are stable)

**Critical Findings for Planning:**
1. **Security Gap:** r2-presign GET endpoint lacks key ownership validation (HIGH priority fix)
2. **File Size Mismatch:** Schema says 10MB, code says 5GB (MUST align before testing)
3. **No Retry Logic:** R2 transient errors will fail permanently (MEDIUM priority)
4. **Missing Tests:** Zero test files found (BLOCKING for production readiness)
5. **Expiry Logic:** Computed dynamically vs scheduled job needs decision
