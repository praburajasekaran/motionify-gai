# User Journey: File Management

## Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FILE UPLOAD & MANAGEMENT WORKFLOW                   │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Team Member Uploads File
    ↓
Navigate to project → Files tab → Click "Upload Files"
    ↓
Drag-drop or select files (up to 500MB each)
    ↓
Select deliverable to link file to (required)
Add optional description
    ↓

STEP 2: Direct Upload to Cloudflare R2
    ↓
Frontend requests presigned URL from backend
POST /api/files/upload-url { projectId, deliverableId, fileName, fileSize }
    ↓
Backend generates presigned R2 URL (1 hour expiry)
Returns: { uploadUrl, fileId }
    ↓
Frontend uploads file directly to R2 using PUT request
Progress indicator shows upload status
    ↓

STEP 3: Register File in Database
    ↓
POST /api/files { fileId, description }
Backend creates file record in database
    ↓
Activity logged: "File uploaded by [user name]"
    ↓
Email notification sent to project team:
"New file uploaded: [filename] → [Deliverable Name]"
    ↓

STEP 4: Team Members Download/View Files
    ↓
Navigate to Files tab → See files grouped by deliverable
    ↓
Click filename or download icon
    ↓
GET /api/files/:id/download-url
Backend generates presigned R2 download URL (1 hour expiry)
    ↓
Browser downloads file with original filename
Activity logged: "File downloaded by [user name]"
    ↓

STEP 5: File Organization (US-017)
    ↓
View files in deliverable tabs/sections
Search across all files by name
Sort by: name, upload date, size, type
Drag-drop to move file to different deliverable
    ↓

STEP 6: Automatic Expiry (365 days after final delivery)
    ↓
When deliverable status changes to "final_delivered"
System automatically:
  - Calculates expires_at = final_delivered_at + 365 days for all files in deliverable
  - Updates file.expires_at for each linked file
  - Sets file status to "expiring" (if not already expired)
    ↓
After 365 days from final delivery:
- Files remain in R2 but download URLs return 403 Forbidden
- UI shows "Expired" badge on files
- Option to request extended access (admin approval)
- Deliverable status can be set to "expired" (optional)
```

## State Transition Diagrams

### File Status Flow

```
┌──────────┐
│ UPLOADED │  ← Initial state (file registered in DB)
└────┬─────┘
     │
     ↓
┌──────────┐
│  ACTIVE  │  ← File accessible to team
└────┬─────┘
     │
     ├─────→ [Deliverable marked as final_delivered]
     │
     ↓
┌──────────┐
│ EXPIRING │  ← expires_at set (365 days from final delivery)
└────┬─────┘
     │
     ├─────→ [365 days pass]
     │
     ↓
┌──────────┐
│ EXPIRED  │  ← Download URLs return 403
└────┬─────┘
     │
     ├─────→ [Optional: Admin grants extended access]
     │
     ↓
┌──────────┐
│ EXTENDED │  ← New expiry date set
└──────────┘

Alternative paths:
┌──────────┐
│ DELETED  │  ← File soft-deleted (metadata retained per data retention)
└──────────┘
```

## Decision Points

### User: Select Deliverable for File
```
Which deliverable does this file belong to?

DELIVERABLE A                    DELIVERABLE B
  │                                  │
  ↓                                  ↓
File linked to A                File linked to B
Shows in A's tab                Shows in B's tab
```

### System: File Size Check
```
Is file size ≤ 500MB?

YES                                NO
  │                                │
  ↓                                ↓
Generate presigned URL          Show error message
Allow upload                    "File exceeds 500MB limit"
```

### System: Access Permission Check
```
Does user have access to this project?

YES                                NO
  │                                │
  ↓                                ↓
Generate download URL           Return 403 Forbidden
Allow download                  "Access denied"
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type |
|--------------|------------|------------|
| File uploaded | Project team members | `file-uploaded.tsx` |
| Large file upload completed | Uploader only | `upload-complete.tsx` (optional) |
| File access expires soon (30 days) | Project lead | `file-expiring-soon.tsx` (optional) |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| File registered in DB | File → `uploaded` |
| Deliverable status → final_delivered | File.expires_at → calculated (final_delivered_at + 365 days) |
| File.expires_at date reached | File → `expired`, download URLs return 403 |
| Deliverable status → expired | All linked files → `expired` (if not already) |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| File uploaded | Log activity, send notifications |
| File downloaded | Log activity (optional: increment counter) |
| Presigned URL requested | Generate URL with 1-hour expiry |
| File moved to different deliverable | Update deliverable_id, log activity |

## Timeline Estimates

### Typical Flow
```
Day 0:   Team member uploads storyboard PDF (10MB)
         → Upload completes in ~5 seconds
         → File registered in database
         → Email notification sent to team

Day 1:   Client downloads file to review
         → Download URL generated in <2 seconds
         → File downloads in ~3 seconds

Day 7:   Deliverable approved, final version uploaded
         → New file linked to same deliverable
         → Both files remain accessible

Day 365: Final delivery completed
         → expires_at set for all files in deliverable

Day 730: Files expire (365 days after final delivery)
         → Download URLs return 403
         → Optional: Request extended access
         ↓
Total: 2 years retention (industry standard)
```

## Edge Cases & Error Handling

### Upload Failures
- **Network interruption during upload**
  - Expected behavior: Show error message "Upload failed. Please try again."
  - Resolution: User can retry upload with same file
  - Cleanup: Orphaned fileId in database (no R2 file) cleaned up by nightly job

### Large File Handling
- **File >100MB upload**
  - Expected behavior: Show upload progress bar with percentage
  - Allow cancellation during upload
  - Resume capability (future enhancement)

### Expired Presigned URL
- **User takes >1 hour to upload**
  - Expected behavior: Upload fails with 403 error
  - Resolution: Request new presigned URL automatically
  - UI: "Link expired. Generating new upload link..."

### File Already Exists (Same Name)
- **User uploads file with same name**
  - Expected behavior: Allow duplicate names (files identified by UUID)
  - UI: Show both files with upload timestamps
  - Future: Offer "Replace existing file?" option

### Deliverable Deleted While File Exists
- **Deliverable deleted with linked files**
  - Expected behavior: Database constraint prevents deletion
  - Resolution: Must reassign files to another deliverable first
  - UI: "Cannot delete deliverable with files. Reassign X files first."

### Access After Project Removal
- **User removed from project team**
  - Expected behavior: Download URLs return 403 Forbidden
  - Resolution: Project admin must re-invite user
  - UI: "You no longer have access to this project."

### R2 Storage Failure
- **Cloudflare R2 unavailable**
  - Expected behavior: Presigned URL generation fails
  - Resolution: Retry logic (3 attempts with exponential backoff)
  - UI: "Storage service temporarily unavailable. Please try again."
  - Fallback: Show cached file list (read-only mode)

### File Type Validation
- **Unsupported file type uploaded**
  - Expected behavior: Accept all file types (no restriction)
  - Reason: Video production requires diverse formats
  - Security: Virus scanning on download (future enhancement)

### Concurrent Upload Limit
- **User uploads 50 files simultaneously**
  - Expected behavior: Queue uploads (5 concurrent max)
  - UI: Show "Uploading X of Y files..." progress
  - Bandwidth consideration: Prevent browser overload
