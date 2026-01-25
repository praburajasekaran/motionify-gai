---
phase: PROD-04-deliverables-system
plan: 03
type: execute
wave: 2
depends_on:
  - PROD-04-02
files_modified:
  - services/storage.ts
autonomous: true

must_haves:
  truths:
    - "Storage service includes credentials: 'include' on all fetch calls"
    - "Upload failures show meaningful error messages to users"
    - "Network errors are caught and handled gracefully"
  artifacts:
    - path: "services/storage.ts"
      provides: "Storage service with proper authentication"
      contains: "credentials: 'include'"
  key_links:
    - from: "services/storage.ts"
      to: "/api/r2-presign"
      via: "fetch with credentials"
      pattern: "credentials.*include"
---

<objective>
Add authentication credentials and improve error handling in storage service.

Purpose: The storage service fetch calls currently lack `credentials: 'include'` which is required for cookie-based authentication. Also, error messages from the backend are not surfaced to users, making debugging difficult.

Output: Storage service properly authenticated and shows actionable error messages.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@services/storage.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add credentials to storage service fetch calls</name>
  <files>services/storage.ts</files>
  <action>
Add `credentials: 'include'` to all fetch calls in the storage service:

1. In uploadFile method, update the presign request:
```typescript
const presignRes = await fetch('/api/r2-presign', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    credentials: 'include', // Required for cookie-based auth
    body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size, // Add fileSize for validation
        projectId,
        folder,
        customKey,
    }),
});
```

2. In getDownloadUrl method, update the fetch:
```typescript
const response = await fetch(`/api/r2-presign?${queryString}`, {
    credentials: 'include', // Required for cookie-based auth
});
```

3. Add fileSize to the presign request body (currently missing) - this is required for the new schema validation.
  </action>
  <verify>
1. Login to admin portal
2. Navigate to project with deliverables
3. Upload a file - should succeed (previously might have gotten 401)
4. Download a file - should succeed
5. Check network tab - requests should include cookies
  </verify>
  <done>
- uploadFile includes credentials: 'include'
- getDownloadUrl includes credentials: 'include'
- fileSize sent in presign request for validation
  </done>
</task>

<task type="auto">
  <name>Task 2: Improve error handling with detailed messages</name>
  <files>services/storage.ts</files>
  <action>
Enhance error handling to surface backend error messages:

1. Update uploadFile to capture and throw detailed errors:
```typescript
async uploadFile(
    file: File,
    projectId: string,
    folder: 'beta' | 'final' | 'misc' = 'misc',
    onProgress?: (progress: number) => void,
    customKey?: string
): Promise<string> {
    try {
        // 1. Get presigned URL
        const presignRes = await fetch('/api/r2-presign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                projectId,
                folder,
                customKey,
            }),
        });

        if (!presignRes.ok) {
            const errorData = await presignRes.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || errorData?.message || 'Failed to generate upload URL';
            throw new Error(errorMessage);
        }

        const { uploadUrl, key }: UploadResponse = await presignRes.json();

        // 2. Upload to R2 using XMLHttpRequest for progress
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
                    // Try to parse R2 error response
                    let errorMsg = `Upload failed with status ${xhr.status}`;
                    try {
                        // R2 returns XML errors
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(xhr.responseText, 'application/xml');
                        const code = doc.querySelector('Code')?.textContent;
                        const message = doc.querySelector('Message')?.textContent;
                        if (code && message) {
                            errorMsg = `R2 Error: ${code} - ${message}`;
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                    reject(new Error(errorMsg));
                }
            };

            xhr.onerror = () => {
                reject(new Error('Network error during upload. Please check your connection and try again.'));
            };

            xhr.ontimeout = () => {
                reject(new Error('Upload timed out. The file may be too large for your connection speed.'));
            };

            // Set timeout based on file size (1 minute per 10MB + 2 minute base)
            xhr.timeout = Math.max(120000, Math.ceil(file.size / (10 * 1024 * 1024)) * 60000 + 120000);

            xhr.send(file);
        });

    } catch (error) {
        console.error('Storage Upload Error:', error);
        throw error; // Re-throw with original message for caller to handle
    }
}
```

2. Update getDownloadUrl similarly:
```typescript
async getDownloadUrl(key: string): Promise<string> {
    try {
        if (!key) return '';

        const queryString = new URLSearchParams({ key }).toString();
        const response = await fetch(`/api/r2-presign?${queryString}`, {
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorCode = errorData?.error?.code;
            const errorMessage = errorData?.error?.message || 'Failed to get download URL';

            // Handle specific error codes
            if (response.status === 403 && errorCode === 'ACCESS_DENIED') {
                throw new Error('You do not have permission to access this file');
            }
            if (response.status === 403 && errorCode === 'FILES_EXPIRED') {
                throw new Error('This file has expired. Contact support to restore access.');
            }

            throw new Error(errorMessage);
        }

        const { url }: DownloadResponse = await response.json();
        return url;
    } catch (error) {
        console.error('Storage Download Error:', error);
        throw error; // Re-throw for caller to show user message
    }
}
```
  </action>
  <verify>
1. Try to upload a file larger than 100MB (without backend schema fix) - should show size limit error
2. Try to download with invalid/unknown key - should show permission error
3. Try to download as wrong user - should show "You do not have permission" error
  </verify>
  <done>
- Backend error messages surfaced to caller
- Specific error codes handled (ACCESS_DENIED, FILES_EXPIRED)
- R2 XML error responses parsed for debugging
- Network errors have user-friendly messages
- Upload timeout based on file size
  </done>
</task>

</tasks>

<verification>
1. Build passes:
   ```bash
   npm run build
   ```

2. Upload test:
   - Login as admin
   - Upload 50MB video file to deliverable
   - Progress updates should appear
   - Upload should complete successfully

3. Download test:
   - Login as client
   - Download deliverable file
   - Should succeed for own project
   - Should show error for other project's file (after PROD-04-01)

4. Error handling test:
   - Open DevTools Network tab
   - Force an error (e.g., disable network mid-upload)
   - User should see friendly error message
</verification>

<success_criteria>
1. All storage service fetch calls include credentials: 'include'
2. fileSize included in presign request body
3. Backend error messages shown to users
4. R2 error responses parsed when available
5. Network errors have user-friendly messages
6. Upload timeout scales with file size
7. Build passes without errors
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-04-deliverables-system/PROD-04-03-SUMMARY.md`
</output>
