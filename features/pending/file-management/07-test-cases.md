# Test Cases: File Management

Comprehensive test scenarios for File Management (US-015, US-016, US-017). Total: 42 test cases.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-FM-###)
- **Feature**: Which component is being tested
- **Scenario**: What we're testing
- **Steps**: How to execute the test
- **Expected Result**: What should happen
- **Priority**: High/Medium/Low

---

## 1. File Upload (US-015) - 15 test cases

### TC-FM-001: Upload Single File Successfully
**Priority:** High
**Feature:** File Upload

**Preconditions:**
- User is logged in and member of project
- Project has deliverables

**Steps:**
1. Navigate to project → Files tab
2. Click "Upload Files" button
3. Select deliverable from dropdown
4. Drag a 10MB PDF file onto upload zone
5. Add description: "Test file upload"
6. Click "Upload 1 File"

**Expected:**
- ✓ File uploads with progress bar
- ✓ Progress shows percentage (0-100%)
- ✓ Success message: "File uploaded successfully"
- ✓ File appears in files list under selected deliverable
- ✓ Email notification sent to team
- ✓ Activity logged: "FILE_UPLOADED"

---

### TC-FM-002: Upload Multiple Files Simultaneously
**Priority:** High
**Feature:** File Upload

**Steps:**
1. Navigate to Files tab → Upload Files
2. Select deliverable
3. Drag 5 files (total 200MB) onto upload zone
4. Click "Upload 5 Files"

**Expected:**
- ✓ All 5 files queued for upload
- ✓ Max 5 concurrent uploads
- ✓ Each file shows individual progress bar
- ✓ Files upload sequentially/concurrently as capacity allows
- ✓ All files appear in list after completion
- ✓ Single email notification for batch upload

---

### TC-FM-003: Reject File Exceeding 500MB Limit
**Priority:** High
**Feature:** File Upload Validation

**Steps:**
1. Navigate to Files tab → Upload Files
2. Select deliverable
3. Attempt to upload 600MB file

**Expected:**
- ✓ Error dialog appears immediately
- ✓ Error message: "File exceeds 500MB limit"
- ✓ Suggests: "Please compress the file or upload a smaller version"
- ✓ File not added to upload queue
- ✓ No API call made

---

### TC-FM-004: Upload Large File (>100MB) with Progress
**Priority:** Medium
**Feature:** File Upload

**Steps:**
1. Upload 250MB video file
2. Observe progress indicator

**Expected:**
- ✓ Progress bar shows percentage
- ✓ Estimated time remaining displayed
- ✓ Can cancel upload mid-progress
- ✓ Completion email sent to uploader
- ✓ File registered in database after R2 upload completes

---

### TC-FM-005: Cancel Upload Mid-Progress
**Priority:** Medium
**Feature:** File Upload

**Steps:**
1. Start uploading 100MB file
2. Click [✕] cancel button at 50% progress

**Expected:**
- ✓ Upload stops immediately
- ✓ File removed from upload queue
- ✓ No file created in database
- ✓ Orphaned R2 file cleaned up by nightly job

---

### TC-FM-006: Upload Without Selecting Deliverable
**Priority:** High
**Feature:** File Upload Validation

**Steps:**
1. Open upload modal
2. Drag file without selecting deliverable
3. Attempt to upload

**Expected:**
- ✓ Upload button disabled
- ✓ Validation message: "Please select a deliverable"
- ✓ Cannot proceed until deliverable selected

---

### TC-FM-007: Upload File with Special Characters in Name
**Priority:** Medium
**Feature:** File Upload

**Steps:**
1. Upload file named: `Rough Cut #2 (Client Review) v3.1 - FINAL.mp4`

**Expected:**
- ✓ File uploads successfully
- ✓ Filename preserved exactly as-is
- ✓ Special characters do not cause errors
- ✓ File downloadable with original name

---

### TC-FM-008: Retry Failed Upload
**Priority:** High
**Feature:** File Upload Error Handling

**Steps:**
1. Start upload
2. Simulate network interruption (disconnect WiFi at 30%)
3. Reconnect network
4. Click "Retry Upload" button

**Expected:**
- ✓ Error message: "Upload failed. Network error."
- ✓ Retry button appears
- ✓ Clicking retry restarts upload from 0%
- ✓ File uploads successfully on retry

---

### TC-FM-009: Upload Same Filename Twice
**Priority:** Medium
**Feature:** File Upload

**Steps:**
1. Upload file named "storyboard.pdf"
2. Upload another file with same name "storyboard.pdf"

**Expected:**
- ✓ Both files uploaded successfully
- ✓ Both appear in file list
- ✓ Differentiated by upload timestamp
- ✓ Each has unique file ID (UUID)

---

### TC-FM-010: Upload with Empty Description
**Priority:** Low
**Feature:** File Upload

**Steps:**
1. Upload file
2. Leave description field empty
3. Submit

**Expected:**
- ✓ Upload succeeds (description is optional)
- ✓ File appears without description

---

### TC-FM-011: Upload with Long Description (1000 chars)
**Priority:** Low
**Feature:** File Upload Validation

**Steps:**
1. Upload file
2. Enter 1000-character description
3. Submit

**Expected:**
- ✓ Description accepted (max 1000 chars)
- ✓ Full description stored and displayed

---

### TC-FM-012: Upload Description Exceeding 1000 Characters
**Priority:** Low
**Feature:** File Upload Validation

**Steps:**
1. Enter 1001-character description

**Expected:**
- ✓ Validation error: "Description must be 1000 characters or less"
- ✓ Upload button disabled until fixed

---

### TC-FM-013: Upload to Project User Doesn't Have Access To
**Priority:** High
**Feature:** File Upload Authorization

**Steps:**
1. User A logs in
2. Attempts to upload to Project B (not a member)
3. Uses API directly (bypass frontend)

**Expected:**
- ✓ API returns 403 Forbidden
- ✓ Error: "User not authorized for project"
- ✓ No file created

---

### TC-FM-014: Upload with Expired Presigned URL
**Priority:** Medium
**Feature:** File Upload

**Steps:**
1. Request presigned URL
2. Wait >1 hour (simulate time passage)
3. Attempt upload using expired URL

**Expected:**
- ✓ Upload fails with 403 error
- ✓ Frontend automatically requests new presigned URL
- ✓ Message: "Link expired. Generating new upload link..."
- ✓ Upload proceeds with new URL

---

### TC-FM-015: Bulk Upload 50 Files
**Priority:** Medium
**Feature:** File Upload

**Steps:**
1. Select 50 small files (1MB each)
2. Upload all at once

**Expected:**
- ✓ All files queued
- ✓ Max 5 concurrent uploads enforced
- ✓ Progress message: "Uploading X of 50 files..."
- ✓ All files complete successfully
- ✓ Single batch notification email

---

## 2. File Download (US-016) - 8 test cases

### TC-FM-016: Download File Successfully
**Priority:** High
**Feature:** File Download

**Steps:**
1. Navigate to Files tab
2. Click download icon [↓] on a file

**Expected:**
- ✓ Presigned download URL generated (<2s)
- ✓ Browser initiates download
- ✓ File downloads with original filename
- ✓ Download count incremented
- ✓ Activity logged: "FILE_DOWNLOADED"

---

### TC-FM-017: Download Large File (>100MB) with Progress
**Priority:** Medium
**Feature:** File Download

**Steps:**
1. Download 250MB video file
2. Observe browser download progress

**Expected:**
- ✓ Browser shows download progress
- ✓ File downloads completely
- ✓ File integrity verified (same size as uploaded)

---

### TC-FM-018: Download Expired File (>365 days)
**Priority:** High
**Feature:** File Access Control

**Steps:**
1. Attempt to download file past expiry date
2. Click download button

**Expected:**
- ✓ Error message: "File access has expired"
- ✓ Download button disabled
- ✓ "Request Extended Access" button shown
- ✓ No download URL generated

---

### TC-FM-019: Download File as Non-Team Member
**Priority:** High
**Feature:** File Download Authorization

**Steps:**
1. User B (not on project team) attempts download
2. Uses direct API call with file ID

**Expected:**
- ✓ API returns 403 Forbidden
- ✓ Error: "Access denied"
- ✓ No download URL generated

---

### TC-FM-020: Download Soft-Deleted File
**Priority:** Medium
**Feature:** File Download

**Steps:**
1. Admin soft-deletes file
2. User attempts to download

**Expected:**
- ✓ File not visible in list
- ✓ Direct URL access returns 404
- ✓ Error: "File not found"

---

### TC-FM-021: Download Counter Increments
**Priority:** Low
**Feature:** File Download Tracking

**Steps:**
1. Note file's download count
2. Download file
3. Check download count

**Expected:**
- ✓ Download count incremented by 1
- ✓ Last downloaded timestamp updated
- ✓ Last downloaded by user recorded

---

### TC-FM-022: Multiple Simultaneous Downloads
**Priority:** Medium
**Feature:** File Download

**Steps:**
1. Click download on 5 files simultaneously

**Expected:**
- ✓ All downloads initiate
- ✓ Browser handles multiple downloads
- ✓ All files download successfully
- ✓ All download counts incremented

---

### TC-FM-023: Download URL Expiry (1 hour)
**Priority:** Low
**Feature:** File Download

**Steps:**
1. Generate download URL
2. Copy URL
3. Wait >1 hour
4. Use copied URL

**Expected:**
- ✓ URL returns 403 Forbidden
- ✓ Error: "Download link expired"
- ✓ User must request new download URL

---

## 3. File Organization (US-017) - 10 test cases

### TC-FM-024: View Files Grouped by Deliverable
**Priority:** High
**Feature:** File Organization

**Steps:**
1. Navigate to Files tab
2. View default layout

**Expected:**
- ✓ Files grouped by deliverable
- ✓ Each deliverable shows file count
- ✓ Deliverables ordered by display_order
- ✓ Files within deliverable ordered by upload date (newest first)

---

### TC-FM-025: Filter Files by Deliverable Tab
**Priority:** High
**Feature:** File Organization

**Steps:**
1. Click "Storyboard" deliverable tab

**Expected:**
- ✓ Only files from Storyboard deliverable shown
- ✓ File count matches tab badge
- ✓ URL updates: `?deliverableId=deliv-001`

---

### TC-FM-026: View All Files Across Deliverables
**Priority:** Medium
**Feature:** File Organization

**Steps:**
1. Click "All Files" tab

**Expected:**
- ✓ All files from all deliverables shown
- ✓ Total file count displayed
- ✓ Files still grouped by deliverable

---

### TC-FM-027: Search Files by Name
**Priority:** High
**Feature:** File Organization

**Steps:**
1. Type "rough cut" in search box
2. Wait for debounced search (300ms)

**Expected:**
- ✓ Only files matching "rough cut" shown
- ✓ Search is case-insensitive
- ✓ Partial matches included
- ✓ Result count displayed

---

### TC-FM-028: Search Returns No Results
**Priority:** Medium
**Feature:** File Organization

**Steps:**
1. Search for "nonexistent file name"

**Expected:**
- ✓ Empty state shown
- ✓ Message: "No files match 'nonexistent file name'"
- ✓ Suggestion: "Try a different search term"
- ✓ "Clear Search" button appears

---

### TC-FM-029: Sort Files by Upload Date (Newest)
**Priority:** Medium
**Feature:** File Organization

**Steps:**
1. Select sort: "Upload Date (newest first)"

**Expected:**
- ✓ Files reordered by created_at DESC
- ✓ Most recent file appears first
- ✓ Sort persists on page reload

---

### TC-FM-030: Sort Files by File Name (A-Z)
**Priority:** Medium
**Feature:** File Organization

**Steps:**
1. Select sort: "File Name (A-Z)"

**Expected:**
- ✓ Files sorted alphabetically
- ✓ Case-insensitive sorting
- ✓ Numbers sorted before letters

---

### TC-FM-031: Sort Files by Size (Largest First)
**Priority:** Low
**Feature:** File Organization

**Steps:**
1. Select sort: "File Size (largest first)"

**Expected:**
- ✓ Largest files appear first
- ✓ Size displayed in human-readable format
- ✓ Sorting accurate across MB/GB boundaries

---

### TC-FM-032: Move File to Different Deliverable (Drag-Drop)
**Priority:** Medium
**Feature:** File Organization (Future)

**Steps:**
1. Drag file from "Script" deliverable
2. Drop onto "Storyboard" deliverable section

**Expected:**
- ✓ File moves to new deliverable
- ✓ API call: `PATCH /api/files/:id { deliverableId }`
- ✓ Activity logged: "FILE_MOVED"
- ✓ Notification sent to team

**Note:** Drag-drop may be future enhancement; use modal for MVP

---

### TC-FM-033: Move File via Modal Dialog
**Priority:** High
**Feature:** File Management

**Steps:**
1. Click more menu [⋮] on file
2. Select "Move to..."
3. Choose different deliverable
4. Click "Move File"

**Expected:**
- ✓ File moved to selected deliverable
- ✓ File appears in new deliverable section
- ✓ Activity logged
- ✓ Success message shown

---

## 4. File Management - 5 test cases

### TC-FM-034: Delete File (Soft Delete)
**Priority:** High
**Feature:** File Management

**Steps:**
1. Click more menu [⋮] → Delete
2. Confirm deletion dialog

**Expected:**
- ✓ Confirmation: "Are you sure you want to delete this file?"
- ✓ File marked as deleted (is_deleted = true)
- ✓ File removed from list
- ✓ Activity logged: "FILE_DELETED"
- ✓ Notification sent to team

---

### TC-FM-035: Client Cannot Delete File
**Priority:** High
**Feature:** File Management Authorization

**Steps:**
1. Log in as client user
2. Attempt to delete file (via API)

**Expected:**
- ✓ Delete option not shown in UI
- ✓ API returns 403 Forbidden
- ✓ Error: "Clients cannot delete files"

---

### TC-FM-036: View File Details
**Priority:** Medium
**Feature:** File Management

**Steps:**
1. Click on filename to open detail view

**Expected:**
- ✓ File preview shown (if supported type)
- ✓ Metadata displayed: size, type, uploader, date
- ✓ Download button available
- ✓ Comment section visible (if US-019 implemented)

---

### TC-FM-037: File Preview for Supported Types
**Priority:** Low
**Feature:** File Management

**Steps:**
1. Open detail view for MP4 video file

**Expected:**
- ✓ HTML5 video player shown
- ✓ Play/pause controls work
- ✓ Can scrub timeline
- ✓ Download option still available

**Supported Previews:**
- Videos: HTML5 player
- Images: Image viewer with zoom
- PDFs: PDF.js viewer
- Others: Icon with "Download to view"

---

### TC-FM-038: Empty State - No Files Uploaded
**Priority:** Low
**Feature:** File Management

**Steps:**
1. Navigate to new project with no files
2. Go to Files tab

**Expected:**
- ✓ Empty state shown
- ✓ Icon: 📁
- ✓ Message: "No files uploaded yet"
- ✓ Explanation text
- ✓ "Upload Your First File" button

---

## 5. Integration Tests - 4 test cases

### TC-FM-039: File Linked to Beta Deliverable
**Priority:** High
**Feature:** Deliverable Integration

**Steps:**
1. Upload file to deliverable
2. Admin marks file as beta version
3. Client approves/rejects deliverable

**Expected:**
- ✓ File referenced in deliverable.beta_file_id
- ✓ File type set to 'beta'
- ✓ Watermark applied (if configured)

---

### TC-FM-040: File Expiry on Final Delivery
**Priority:** High
**Feature:** Deliverable Integration

**Steps:**
1. Admin marks deliverable as final_delivered
2. Check file expiry dates

**Expected:**
- ✓ All files in deliverable get expires_at set
- ✓ expires_at = final_delivered_at + 365 days
- ✓ Trigger executes automatically

---

### TC-FM-041: Activity Feed Integration
**Priority:** Medium
**Feature:** Activity Integration

**Steps:**
1. Upload file
2. Check project activity feed

**Expected:**
- ✓ Activity: "[User] uploaded file.mp4 to [Deliverable]"
- ✓ Timestamp accurate
- ✓ Click activity navigates to file

---

### TC-FM-042: Notification Preferences
**Priority:** Low
**Feature:** Notification Integration

**Steps:**
1. User disables file upload notifications
2. Another user uploads file

**Expected:**
- ✓ User does not receive email
- ✓ In-app notification still shown (optional)
- ✓ Preference respected

---

## Test Environment Setup

### Required Test Data

**Users:**
- Admin user (super_admin role)
- Project manager (project_manager role)
- Client lead (client role, is_primary_contact)
- Client team member (client role)

**Projects:**
- Project with 3 deliverables
- Project with 10+ existing files
- Project with expired files

**Files:**
- Small file (1MB PDF)
- Medium file (50MB video)
- Large file (250MB video)
- Various file types (MP4, PDF, JPG, ZIP)

### Test Cloudflare R2 Bucket

- Bucket: `motionify-files-test`
- CORS configured for localhost:3000
- Presigned URL generation working
- Cleanup script for test files

---

## Automated Testing

### Unit Tests (Jest + React Testing Library)

**File Upload Component:**
- Renders upload modal
- Validates file size
- Handles drag-drop events
- Shows progress bars
- Displays errors

**File List Component:**
- Renders files grouped by deliverable
- Filters by deliverable tab
- Search functionality
- Sort functionality

### Integration Tests (Playwright/Cypress)

**E2E Upload Flow:**
1. Login → Navigate to Files → Upload → Verify in list

**E2E Download Flow:**
1. Login → Click download → Verify file downloaded

**E2E Organization:**
1. Filter, search, sort operations

### API Tests (Jest + Supertest)

**POST /api/files/upload-url:**
- Returns presigned URL
- Validates file size
- Requires authentication
- Checks project access

**GET /api/files/:id/download-url:**
- Generates download URL
- Checks expiry
- Verifies access permissions

---

## Performance Tests

### Load Testing (k6)

**Concurrent Uploads:**
- 10 users uploading simultaneously
- 50 files total
- Average response time < 2s

**Presigned URL Generation:**
- 100 requests/second
- Response time < 500ms
- 0% error rate

### Database Performance

**File Queries:**
- List 1000 files: < 100ms
- Filter by deliverable: < 50ms
- Search by filename: < 200ms

---

## Manual Testing Checklist

Before release, manually verify:

- [ ] Upload single file of each type (video, image, PDF, ZIP)
- [ ] Upload file >100MB with progress
- [ ] Download file and verify integrity
- [ ] Search finds correct files
- [ ] Sort works for all options
- [ ] Move file to different deliverable
- [ ] Delete file (soft delete works)
- [ ] File expiry blocks downloads
- [ ] Email notifications sent correctly
- [ ] Mobile-responsive layout works
- [ ] Keyboard navigation functional
- [ ] Screen reader compatible

---

## Known Issues / Limitations

1. **File versioning not implemented** (US-018)
   - Same filename creates duplicate, not new version
   - Workaround: Manual version numbers in filename

2. **File comments not implemented** (US-019)
   - Database schema exists, UI not built
   - Scheduled for Phase 2

3. **Drag-drop file reassignment may be delayed**
   - Modal dialog approach used for MVP
   - Drag-drop in Phase 2 enhancement

4. **No virus scanning**
   - All file types accepted without scanning
   - Future: Integrate ClamAV or cloud scanner

5. **Download analytics limited**
   - Basic count only
   - Full analytics (time, bandwidth) in Phase 3
