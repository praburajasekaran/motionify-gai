# ASCII Wireframes: File Management

This document contains all user interface wireframes for the File Management feature.

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Parameters:** `:projectId`, `:fileId` (consistent naming)  
**Status Badges:** Colors only, hover for full label tooltips  
**Modal Close:** `[×]` for all modals  
**Buttons:** Right-aligned with `[Cancel] [Primary]` order  
**Required Fields:** `(required)` text format  
**File Size Limit:** Max 500MB per file (client/team uploads)  
**Loading States:** `[Spinner]` notation  
**Notification Bell:** 🔔 in all authenticated headers

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Table of Contents

### Portal Screens
1. [Files Tab - Deliverable Organization](#screen-1-files-tab)
2. [Upload Files Modal](#screen-2-upload-files-modal)
3. [File Detail View](#screen-3-file-detail-view)
4. [Move File Dialog](#screen-4-move-file-dialog)
5. [Error States](#screen-5-error-states)
6. [Empty States](#screen-6-empty-states)

---

## Portal Screens

### SCREEN 1: Files Tab - Deliverable Organization

**Purpose:** View and manage all files organized by deliverable
**Route:** `portal.motionify.studio/projects/:projectId/files`
**Authentication:** Required (Project team members only)
**User Stories:** US-017 (Organize Files by Deliverable)
**Navigation:** ← Back to Project Dashboard → `portal.motionify.studio/projects/:projectId`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Project: Corporate Brand Video                            [Upload Files]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [All Files] [Script] [Storyboard] [Rough Cut] [Final Video]           │
│     (45)      (8)       (12)         (15)         (10)                  │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Search files...  [🔍]                      Sort by: [Upload Date ▾]    │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ Script & Concept (8 files)                                         │  │
│ ├────────────────────────────────────────────────────────────────────┤  │
│ │                                                                    │  │
│ │ 📄 Brand-Script-v3-Final.docx                              [↓] [⋮]│  │
│ │    Uploaded by Jane Smith · Nov 12, 2025 · 2.4 MB                 │  │
│ │    Final approved script with client revisions                    │  │
│ │                                                                    │  │
│ │ 📄 Creative-Concept.pdf                                    [↓] [⋮]│  │
│ │    Uploaded by Mike Chen · Nov 10, 2025 · 5.1 MB                  │  │
│ │    Mood boards and style direction                                │  │
│ │                                                                    │  │
│ │ 🎨 Reference-Images.zip                                    [↓] [⋮]│  │
│ │    Uploaded by Jane Smith · Nov 9, 2025 · 45.7 MB                 │  │
│ │    (5 comments)                                                    │  │
│ │                                                                    │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ Storyboard (12 files)                                              │  │
│ ├────────────────────────────────────────────────────────────────────┤  │
│ │                                                                    │  │
│ │ 📄 Storyboard-Scenes-1-10.pdf                              [↓] [⋮]│  │
│ │    Uploaded by Sarah Lee · Nov 14, 2025 · 8.2 MB                  │  │
│ │                                                                    │  │
│ │ 📄 Storyboard-Scenes-11-20.pdf                             [↓] [⋮]│  │
│ │    Uploaded by Sarah Lee · Nov 14, 2025 · 7.9 MB                  │  │
│ │                                                                    │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ Rough Cut (15 files)                                   [Awaiting...│  │
│ ├────────────────────────────────────────────────────────────────────┤  │
│ │                                                                    │  │
│ │ 🎬 Rough-Cut-v2.mp4                                        [↓] [⋮]│  │
│ │    Uploaded by Mike Chen · Nov 16, 2025 · 142.5 MB                │  │
│ │    Latest rough cut with music and VO                             │  │
│ │    (12 comments)                                                   │  │
│ │                                                                    │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- Click tab → Filter files by deliverable
- Click "All Files" → Show all project files
- Type in search → Filter files by name (debounced)
- Change sort dropdown → Re-sort file list
- Click download icon [↓] → Generate presigned URL and download
- Click more menu [⋮] → Show file actions (download, preview, move, delete)
- Drag file between deliverables → Move file (US-017)

**Sort Options:**
- Upload Date (newest first) - default
- Upload Date (oldest first)
- File Name (A-Z)
- File Name (Z-A)
- File Size (largest first)
- File Size (smallest first)

---

### SCREEN 2: Upload Files Modal

**Purpose:** Upload files and link them to deliverables
**Route:** Modal overlay on `portal.motionify.studio/projects/:projectId/files`
**Authentication:** Required (All project team members)
**User Stories:** US-015 (Upload Files)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Upload Files                                                      [✕]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Select Deliverable *                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Script & Concept                                              ▾ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │                    📤 Drag files here or click to browse         │  │
│  │                                                                  │  │
│  │              Supported: All file types · Max 500MB per file      │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Selected Files:                                                        │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📄 Brand-Guidelines.pdf                          2.4 MB      [✕]│  │
│  │ [████████████████████████████████████████] 100% · Complete     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🎬 Raw-Footage-A-Roll.mp4                      485.2 MB      [✕]│  │
│  │ [███████████████░░░░░░░░░░░░░░░░░░░░░░░] 45% · 2 min remaining │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📷 Behind-The-Scenes-Photos.zip               128.5 MB      [✕]│  │
│  │ [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0% · Queued...       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Description (optional)                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Latest raw footage from shoot day 2                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│                                                                          │
│                                    [Cancel]  [Upload 3 Files]           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Deliverable: Required (must select before uploading)
- File size: Max 500MB per file
- File count: No limit (but queued uploads max 5 concurrent)

**User Actions:**
- Select deliverable → Enable file upload zone
- Drag files onto zone → Add to queue
- Click browse → Open file picker → Add selected files to queue
- Click [✕] on file → Remove from queue
- Click "Upload X Files" → Start upload process
- Click "Cancel" → Close modal, abandon uploads

**API Calls:**
```
1. POST /api/files/upload-url (for each file)
   { projectId, deliverableId, fileName, fileSize, contentType }
   → Returns: { uploadUrl, fileId, expiresIn }

2. PUT <uploadUrl> (direct to R2)
   → File content (binary)

3. POST /api/files
   { fileId, description }
   → Registers file in database, sends notifications
```

---

### SCREEN 3: File Detail View

**Purpose:** View file details, preview, download, and manage
**Route:** `portal.motionify.studio/projects/:projectId/files/:fileId`
**Navigation:** ← Back to Files → `portal.motionify.studio/projects/:projectId/files`
**Authentication:** Required (Project team members)
**User Stories:** US-016 (Download Files), US-019 (File Comments - future)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Files                                                    [✕]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🎬 Rough-Cut-v2.mp4                                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │                       [Video Preview]                            │  │
│  │                   ▶ 00:32 / 02:45                                │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Latest rough cut with music and voiceover                              │
│                                                                          │
│  Details                                                                │
│  ├─ Deliverable: Rough Cut                                              │
│  ├─ Size: 142.5 MB                                                      │
│  ├─ Type: video/mp4                                                     │
│  ├─ Uploaded by: Mike Chen                                              │
│  ├─ Uploaded: Nov 16, 2025 at 2:34 PM                                   │
│  └─ Downloads: 8 times                                                  │
│                                                                          │
│  [Download File]  [Move to Different Deliverable]  [Delete]            │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ Comments (12)                                          [US-019] │  │
│ ├────────────────────────────────────────────────────────────────────┤  │
│ │                                                                    │  │
│ │ 👤 Sarah Lee · Nov 16 at 3:15 PM                                   │  │
│ │ Love the new music! Much better pacing.                            │  │
│ │                                                         [Reply]    │  │
│ │                                                                    │  │
│ │   └─ 👤 Mike Chen · Nov 16 at 3:42 PM                              │  │
│ │      Thanks! Let me know if the VO levels work for you.            │  │
│ │                                                         [Reply]    │  │
│ │                                                                    │  │
│ │ 👤 Client (Jane) · Nov 17 at 9:12 AM                               │  │
│ │ @MikeChen Can we adjust the timing at 1:24? Feels rushed.          │  │
│ │                                                         [Reply]    │  │
│ │                                                                    │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Add comment...                                                   │  │
│  │                                                                  │  │
│  │                                                     [Post Comment]│  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- Click "Download File" → GET /api/files/:id/download-url → Browser downloads
- Click "Move to Different Deliverable" → Open move dialog (Screen 4)
- Click "Delete" → Confirm dialog → DELETE /api/files/:id
- Play video preview → Uses HTML5 video player (for videos)
- View PDF preview → Uses PDF.js viewer (for PDFs)

**File Preview Support:**
- Videos (MP4, MOV): HTML5 video player
- Images (JPG, PNG, GIF, SVG): Image viewer with zoom
- PDFs: PDF.js embedded viewer
- Other types: Show icon with "Download to view"

---

### SCREEN 4: Move File Dialog

**Purpose:** Move file to a different deliverable
**Route:** Modal overlay on file detail view
**Authentication:** Required (Motionify Studio team only)
**User Stories:** US-017 (Organize Files)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Move File to Different Deliverable                               [✕]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  File: Rough-Cut-v2.mp4                                                 │
│  Current Deliverable: Rough Cut                                         │
│                                                                          │
│  Move to:                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ○ Script & Concept (8 files)                                     │  │
│  │ ○ Storyboard (12 files)                                          │  │
│  │ ● Final Video (10 files)                                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  This will update the file's deliverable association.                   │
│  Activity will be logged: "File moved to Final Video by [user]"         │
│                                                                          │
│                                                     [Cancel]  [Move File]│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- Select deliverable radio button → Enable "Move File" button
- Click "Move File" → PATCH /api/files/:id { deliverableId }
- Click "Cancel" → Close dialog without changes

**API Call:**
```
PATCH /api/files/:id
{
  "deliverableId": "uuid-of-new-deliverable"
}
```

---

### SCREEN 5: Error States

#### 5a. File Too Large Error

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Upload Files                                                      [✕]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Error: File Exceeds Size Limit                                │  │
│  │                                                                  │  │
│  │ The file "4K-Master-Uncompressed.mov" (2.1 GB) exceeds the      │  │
│  │ maximum size limit of 500 MB.                                    │  │
│  │                                                                  │  │
│  │ Please compress the file or upload a smaller version.            │  │
│  │                                                                  │  │
│  │                                               [OK, I understand] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 5b. Upload Failed

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🎬 Raw-Footage-A-Roll.mp4                      485.2 MB          [✕]│
│ [███████████████░░░░░░░░░░░░░░░░░░░░░░] ❌ Upload failed           │
│                                                                      │
│ Network error. [Retry Upload]                                        │
└──────────────────────────────────────────────────────────────────────┘
```

#### 5c. Expired File Access

```
┌────────────────────────────────────────────────────────────────────┐
│ 🎬 Corporate-Brand-Final-4K.mp4                       [EXPIRED] [⋮]│
│    Uploaded by Mike Chen · Jan 15, 2024 · 482.3 MB                │
│    ⚠️ Access expired on Jan 15, 2025 (365 days after delivery)     │
│    [Request Extended Access]                                        │
└────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 6: Empty States

#### 6a. No Files Uploaded Yet

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Project: Corporate Brand Video                            [Upload Files]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [All Files] [Script] [Storyboard] [Rough Cut] [Final Video]           │
│     (0)       (0)       (0)          (0)         (0)                    │
│                                                                          │
│                                                                          │
│                      📁                                                  │
│                                                                          │
│                  No files uploaded yet                                  │
│                                                                          │
│         Upload project files and link them to deliverables              │
│         to keep everything organized and accessible.                    │
│                                                                          │
│                     [Upload Your First File]                            │
│                                                                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 6b. Search Returns No Results

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Search files...  [🔍] "final version"         Sort by: [Upload Date ▾]│
│                                                                          │
│                      🔍                                                  │
│                                                                          │
│               No files match "final version"                            │
│                                                                          │
│         Try a different search term or check the spelling.              │
│                                                                          │
│                       [Clear Search]                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## File Actions Menu [⋮]

```
┌──────────────────────────┐
│ [↓] Download             │
│ [👁] Preview              │
│ [✏️] Rename               │ ← US-018 (Future)
│ [📁] Move to...           │
│ [💬] Comments (5)         │ ← US-019 (Optional)
│ [🗑] Delete               │
└──────────────────────────┘
```

---

## Mobile-Responsive File List

```
┌──────────────────────────────┐
│ Files                    [⋮] │
├──────────────────────────────┤
│                              │
│ [All] [Script] [Story...▾]  │
│  (45)   (8)      (12)        │
│                              │
│ 🔍 Search files...           │
│                              │
│ ┌──────────────────────────┐ │
│ │ 📄 Brand-Script-v3.docx  │ │
│ │ Jane Smith · Nov 12      │ │
│ │ 2.4 MB              [↓]  │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 🎬 Rough-Cut-v2.mp4      │ │
│ │ Mike Chen · Nov 16       │ │
│ │ 142.5 MB · (12 comments) │ │
│ │                     [↓]  │ │
│ └──────────────────────────┘ │
│                              │
│         [Upload Files]       │
│                              │
└──────────────────────────────┘
```

---

## Design Notes

### Todoist Aesthetic Principles (Per User Preference)
- **Clean & Minimal**: Ample whitespace, clear typography
- **Functional**: No decorative elements, every pixel serves a purpose
- **Flat Design**: Subtle shadows, no gradients or 3D effects
- **Clear Hierarchy**: Size and weight differentiate importance
- **Accessible**: WCAG 2.1 AA compliant colors and contrast

### File Type Icons
- 📄 Documents (PDF, DOCX, XLSX, TXT)
- 🎬 Videos (MP4, MOV, AVI, MKV)
- 📷 Images (JPG, PNG, GIF, SVG)
- 🎨 Design files (PSD, AI, SKETCH, FIGMA)
- 📦 Archives (ZIP, RAR, 7Z)
- 🎵 Audio (MP3, WAV, AAC)

### Color Coding (Subtle)
- Upload progress: Blue (#4A90E2)
- Success: Green (#7ED321)
- Error: Red (#D0021B)
- Warning: Amber (#F5A623)
- Expired: Gray (#9B9B9B)

### Interaction States
- Hover: Subtle background color change (#F7F7F7)
- Active/Selected: Slightly darker background (#EFEFEF)
- Disabled: 50% opacity, no interaction
- Loading: Skeleton screens or subtle spinners

### Responsive Behavior
- **Desktop (>1024px)**: Full layout with tabs, search, and sort controls
- **Tablet (768-1024px)**: Tabs collapse to dropdown, single column file list
- **Mobile (<768px)**: Horizontal scrolling tabs, stacked file cards

### Accessibility
- All interactive elements keyboard accessible (Tab navigation)
- Focus states clearly visible
- Screen reader labels for icons and buttons
- Color contrast meets WCAG 2.1 AA standard (4.5:1 minimum)
- Alt text for file type icons

### Loading States
- Skeleton loaders for file lists (placeholders while loading)
- Progress bars for uploads (percentage + time remaining)
- Spinners for quick actions (download URL generation)

### Performance Optimizations
- Lazy load file previews (only when detail view opened)
- Paginate file lists (50 files per page, infinite scroll)
- Debounce search input (300ms delay)
- Thumbnail generation (for images, video first frames)
