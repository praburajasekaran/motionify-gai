# ASCII Wireframes: Core Task Management

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Parameters:** `:projectId`, `:taskId`, `:fileId` (consistent naming)  
**Status Badges:** Colors only (Green/Blue/Yellow/Gray/Red), hover for full label tooltips  
**Modal Close:** `[×]` for all modals  
**Buttons:** Right-aligned with `[Cancel] [Primary]` order  
**Required Fields:** `(required)` text format  
**File Links:** File names are clickable → `/projects/:projectId/files/:fileId`  
**Loading States:** `[Spinner]` notation  
**Notification Bell:** 🔔 in all authenticated headers  
**Terminology:** Use "Request Changes" for task-level feedback

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Team Portal Screens

### SCREEN 1: Task List View (Main Dashboard)

**Route:** `portal.motionify.studio/projects/:projectId/tasks`
**Role:** All team members can view
**Navigation:** ← Back to Project Dashboard → `portal.motionify.studio/projects/:projectId`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Project: Acme Corp Product Explainer                                     │
│ Tasks (14)                                     Deliverable: Final Video   │
└─────────────────────────────────────────────────────────────────────────┘

  Filters:  [All Tasks ▼] [All Deliverables ▼] [All Status ▼] [+ Create Task]

  ┌─ All Tasks ────┬─ My Tasks ──┬─ Unassigned ─┬─ Followed ───┐
  │ ●              │             │              │              │
  └────────────────┴─────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 🔴 Video editing - Scene 2 color grading                 CLIENT VISIBLE │
│    Status: AWAITING APPROVAL              Due: Nov 18 (2 days overdue)  │
│    Assigned: @sarah, @mike                Followers: 4                   │
│    💬 3 comments   📎 2 files   🕐 Updated 3h ago                       │
│    [View Details →]                                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ Audio mix final adjustments                          CLIENT VISIBLE │
│    Status: IN PROGRESS                    Due: Nov 22 (4 days left)     │
│    Assigned: @alex                        Followers: 2                   │
│    💬 1 comment   📎 No files   🕐 Updated 1h ago                       │
│    [View Details →]                                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 🔒 Client feedback review - internal notes               INTERNAL ONLY  │
│    Status: PENDING                        Due: No deadline              │
│    Assigned: Unassigned                   Followers: 1                   │
│    💬 No comments   📎 No files   🕐 Created 2d ago                     │
│    [View Details →]                                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ Initial script review                                 CLIENT VISIBLE │
│    Status: COMPLETED                      Completed: Nov 12             │
│    Assigned: @sarah                       Followers: 3                   │
│    💬 5 comments   📎 1 file   🕐 Completed 8d ago                      │
│    [View Details →]                                                      │
└─────────────────────────────────────────────────────────────────────────┘

  Showing 4 of 14 tasks  [Load More...]
```

---

### SCREEN 2: Create Task Modal

**Triggered:** User clicks "+ Create Task"

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Create New Task                                                   [X]    │
└─────────────────────────────────────────────────────────────────────────┘

  Task Title *
  ┌───────────────────────────────────────────────────────────────────┐
  │ Fix color grading in scene 3                                      │
  └───────────────────────────────────────────────────────────────────┘

  Description (Markdown supported)
  ┌───────────────────────────────────────────────────────────────────┐
  │ The color grading in scene 3 needs to match the client's brand   │
  │ guidelines. Specifically:                                          │
  │ - Increase blue saturation by 15%                                 │
  │ - Adjust brightness for consistency                               │
  └───────────────────────────────────────────────────────────────────┘

  Link to Deliverable *
  ┌─────────────────────────────────────────────────────────────────┐
  │ Final Video ▼                                                    │
  └─────────────────────────────────────────────────────────────────┘

  Visibility *
  ◉ Client-Visible    ○ Internal-Only
  ℹ️  Client-visible tasks will appear in the client portal

  Deadline (Optional)
  ┌──────────────┐
  │ Nov 25, 2025 │  📅
  └──────────────┘

  Assign To (Optional)
  ┌─────────────────────────────────────────────────────────────────┐
  │ @sarah, @mike                                              [+]   │
  └─────────────────────────────────────────────────────────────────┘

  Selected assignees:
  ┌──────────────┐  ┌──────────────┐
  │ @sarah    [x]│  │ @mike     [x]│
  └──────────────┘  └──────────────┘

                 ┌──────────┐  ┌──────────────┐
                 │  Cancel  │  │  Create Task │
                 └──────────┘  └──────────────┘
```

---

### SCREEN 3: Task Detail View

**Route:** `portal.motionify.studio/projects/:projectId/tasks/:taskId`
**Navigation:** ← Back to Tasks → `portal.motionify.studio/projects/:projectId/tasks`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Tasks                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Video editing - Scene 2 color grading                   CLIENT VISIBLE  │
│                                                                           │
│ Status: AWAITING APPROVAL      Due: Nov 18 (2 days overdue) 🔴         │
│                                                                           │
│ Created by: @john (Nov 10)    Updated: 3h ago by @sarah                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─── Description ──────────────────────────────────────────────────────────┐
│                                                                           │
│ The color grading in scene 2 needs adjustment per client feedback:       │
│ - Increase blue saturation to match brand guidelines                     │
│ - Adjust brightness for consistency with scene 1                         │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Assigned To ──────────────────────────────────────────────────────────┐
│ @sarah (Editor)          @mike (Color Grader)           [+ Assign More] │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Followers (4) ────────────────────────────────────────────────────────┐
│ @sarah  @mike  @john  @alex                          [+ Follow] / [★]   │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Delivery Notes ───────────────────────────────────────────────────────┐
│ Added by @sarah • Nov 16, 3h ago • Editable for 57 minutes              │
│                                                                           │
│ Color grading has been adjusted according to the new brand guidelines.   │
│ We've increased the blue saturation and matched the brightness to        │
│ scene 1. Please review and let us know if further adjustments needed.   │
│                                                                           │
│ [Edit Notes]                                                              │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Status Transitions ───────────────────────────────────────────────────┐
│ Current: AWAITING APPROVAL                                               │
│                                                                           │
│ Available transitions:                                                   │
│ [Mark as Approved] (Client Primary Contact only)                        │
│ [Request Revision] (Client Primary Contact only)                        │
│ [Back to In Progress] (Team only)                                       │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Attached Files (2) ───────────────────────────────────────────────────┐
│ 📹 scene-2-graded-v2.mp4 (450 MB) • Uploaded by @sarah • Nov 16        │
│    [Download] [Preview]                                                  │
│                                                                           │
│ 📄 color-grade-notes.pdf (2.1 MB) • Uploaded by @mike • Nov 15         │
│    [Download] [Preview]                                                  │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Comments (3) ─────────────────────────────────────────────────────────┐
│                                                                           │
│ @mike • 5h ago                                                           │
│ Color grading complete. @sarah ready for your final check before        │
│ submitting to client.                                                     │
│                                                                           │
│ @sarah • 3h ago                                                          │
│ Looks great! Submitted to client for approval.                           │
│                                                                           │
│ @john • 2h ago                                                           │
│ Nice work team! 👏                                                       │
│                                                                           │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ Add a comment... (Markdown supported)                             │  │
│ │ Tip: Use @username to mention someone                             │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│ [Post Comment]                                                            │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Activity Log ─────────────────────────────────────────────────────────┐
│ @sarah changed status from In Progress to Awaiting Approval • 3h ago    │
│ @sarah added delivery notes • 3h ago                                     │
│ @sarah uploaded scene-2-graded-v2.mp4 • 3h ago                          │
│ @mike commented • 5h ago                                                 │
│ @mike uploaded color-grade-notes.pdf • 1d ago                           │
│ @sarah started work (Pending → In Progress) • 2d ago                    │
│ @john assigned @sarah and @mike • 3d ago                                │
│ @john created this task • 3d ago                                         │
│ [Show All Activity...]                                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 4: Multi-Assignee Selector

**Triggered:** User clicks "+ Assign More" or field in Create Task

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Assign Team Members                                               [X]    │
└─────────────────────────────────────────────────────────────────────────┘

  Search team members...
  ┌───────────────────────────────────────────────────────────────────┐
  │ sarah                                                          🔍 │
  └───────────────────────────────────────────────────────────────────┘

  ┌─ Project Team Members ────────────────────────────────────────────┐
  │                                                                    │
  │ ✅ @sarah Johnson (Editor)                      ALREADY ASSIGNED   │
  │    sarah.johnson@acme.com                                         │
  │                                                                    │
  │ ☐ @mike Chen (Color Grader)                     [Assign]          │
  │    mike.chen@motionify.studio                                     │
  │                                                                    │
  │ ☐ @alex Rodriguez (Sound Designer)              [Assign]          │
  │    alex.rodriguez@motionify.studio                                │
  │                                                                    │
  │ ☐ @john Smith (Project Manager)                 [Assign]          │
  │    john.smith@motionify.studio                                    │
  │                                                                    │
  │ ☐ @rachel Lee (Client - Primary Contact)        [Assign]          │
  │    rachel.lee@acme.com                                            │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘

  Currently Assigned (2):
  ┌──────────────────────┐  ┌──────────────────────┐
  │ @sarah Johnson   [×] │  │ @mike Chen       [×] │
  └──────────────────────┘  └──────────────────────┘

                    ┌──────────┐  ┌──────────────┐
                    │  Cancel  │  │  Update      │
                    └──────────┘  └──────────────┘
```

---

### SCREEN 5: Status Transition Control (Inline)

**Location:** Within Task Detail View

```
┌─── Change Task Status ───────────────────────────────────────────────────┐
│                                                                           │
│ Current Status: IN PROGRESS                                              │
│                                                                           │
│ Change to:                                                                │
│ ○ Pending                                                                │
│ ◉ Awaiting Approval (requires delivery notes)                           │
│ ○ Completed                                                              │
│                                                                           │
│ ⚠️  This task is CLIENT-VISIBLE. Delivery notes are required.           │
│                                                                           │
│ Delivery Notes *                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ Scene 2 color grading is complete. We've adjusted the blue       │  │
│ │ saturation and brightness as discussed. Ready for your review.   │  │
│ │                                                                    │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ This will notify:                                                        │
│ • Client Primary Contact (@rachel)                                       │
│ • All assignees and followers (5 people)                                │
│                                                                           │
│              ┌──────────┐  ┌────────────────────────┐                   │
│              │  Cancel  │  │  Update Status & Notify │                  │
│              └──────────┘  └────────────────────────┘                   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 6: Delivery Notes Editor

**Location:** Inline in Task Detail, when status = Awaiting Approval

```
┌─── Delivery Notes ───────────────────────────────────────────────────────┐
│ Added by @sarah • Nov 16, 3h ago • Editable for 57 minutes              │
│                                                                           │
│ ┌ EDIT MODE ──────────────────────────────────────────────────────────┐ │
│ │                                                                       │ │
│ │ Color grading has been adjusted according to the new brand          │ │
│ │ guidelines. We've increased the blue saturation and matched the     │ │
│ │ brightness to scene 1. Please review and let us know if further     │ │
│ │ adjustments needed.                                                  │ │
│ │                                                                       │ │
│ │                                                                       │ │
│ │ [B] [I] [Link] [Bullet List] [Numbered List]    Markdown supported  │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ℹ️  Delivery notes can be edited for 1 hour after submission.           │
│ After that, they become read-only.                                       │
│                                                                           │
│              ┌──────────┐  ┌────────────────────────┐                   │
│              │  Cancel  │  │  Save Changes          │                   │
│              └──────────┘  └────────────────────────┘                   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 7: Follower Management

**Location:** Within Task Detail View

```
┌─── Manage Followers ─────────────────────────────────────────────────────┐
│                                                                           │
│ Following this task (4):                                                 │
│                                                                           │
│ ✅ @sarah Johnson (Editor)              ASSIGNED • Auto-following        │
│    Cannot unfollow while assigned                                       │
│                                                                           │
│ ✅ @mike Chen (Color Grader)            ASSIGNED • Auto-following        │
│    Cannot unfollow while assigned                                       │
│                                                                           │
│ ☑️ @john Smith (Project Manager)         FOLLOWING • [Unfollow]         │
│    Following since Nov 10                                                │
│                                                                           │
│ ☑️ @alex Rodriguez (Sound Designer)      FOLLOWING • [Unfollow]         │
│    Following since Nov 12                                                │
│                                                                           │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ Not following (1):                                                       │
│                                                                           │
│ ☐ @rachel Lee (Client)                   [+ Follow]                     │
│                                                                           │
│ ────────────────────────────────────────────────────────────────────────│
│                                                                           │
│ ℹ️  Followers receive notifications for:                                │
│    • Status changes                                                      │
│    • New comments                                                        │
│    • New file uploads                                                    │
│    • New assignments                                                     │
│                                                                           │
│                             ┌──────────┐                                 │
│                             │  Close   │                                 │
│                             └──────────┘                                 │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Client Portal Screens

### SCREEN 8: Client Task List (Filtered View)

**Route:** `portal.motionify.studio/projects/:projectId/tasks` (client view)
**Role:** Client team members (only see client-visible tasks)
**Navigation:** ← Back to Project Dashboard → `portal.motionify.studio/projects/:projectId`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Project: Acme Corp Product Explainer                                     │
│ Tasks Assigned to You (3)                                                │
└─────────────────────────────────────────────────────────────────────────┘

  ℹ️  You can only see tasks that are marked as "Client-Visible"

┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ Video editing - Scene 2 color grading                                │
│    Status: AWAITING YOUR APPROVAL        Due: Nov 18 (2 days overdue)   │
│    Assigned: @sarah, @mike               Last updated: 3h ago            │
│                                                                           │
│    Delivery Notes from @sarah:                                           │
│    "Color grading adjusted per brand guidelines. Please review."         │
│                                                                           │
│    ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐          │
│    │  View Details   │  │  Approve ✓   │  │  Request Changes │          │
│    └─────────────────┘  └──────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ⏳ Audio mix final adjustments                                          │
│    Status: IN PROGRESS                   Due: Nov 22 (4 days left)      │
│    Assigned: @alex                       Last updated: 1h ago            │
│                                                                           │
│    Motionify Studio is working on this task. You'll be notified when it's      │
│    ready for your review.                                                │
│                                                                           │
│    [View Details]                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ Initial script review                                                │
│    Status: COMPLETED                     Completed: Nov 12              │
│    Assigned: @sarah                                                      │
│                                                                           │
│    You approved this task on Nov 12.                                     │
│                                                                           │
│    [View Details]                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 9: Client Task Approval Interface

**Triggered:** Client clicks task in "Awaiting Approval" status

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Tasks                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Video editing - Scene 2 color grading                                    │
│                                                                           │
│ Status: AWAITING YOUR APPROVAL      Due: Nov 18 (2 days overdue)        │
│ Assigned: @sarah, @mike             Updated: 3h ago                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─── Description ──────────────────────────────────────────────────────────┐
│                                                                           │
│ The color grading in scene 2 needs adjustment per your feedback:         │
│ - Increase blue saturation to match brand guidelines                     │
│ - Adjust brightness for consistency with scene 1                         │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Delivery Notes from @sarah ──────────────────────────────────────────┐
│ Submitted: Nov 16, 3h ago                                                │
│                                                                           │
│ Color grading has been adjusted according to the new brand guidelines.   │
│ We've increased the blue saturation and matched the brightness to        │
│ scene 1. Please review and let us know if further adjustments needed.   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Attached Files (2) ───────────────────────────────────────────────────┐
│ 📹 scene-2-graded-v2.mp4 (450 MB)                                       │
│    [Download] [Preview in Browser]                                       │
│                                                                           │
│ 📄 color-grade-notes.pdf (2.1 MB)                                       │
│    [Download] [Preview]                                                  │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Review This Task ─────────────────────────────────────────────────────┐
│                                                                           │
│ Is this task complete to your satisfaction?                              │
│                                                                           │
│ ┌───────────────────────────┐  ┌────────────────────────────────┐       │
│ │                           │  │                                │       │
│ │   ✓ Approve This Task     │  │   ⚠️ Request Changes           │       │
│ │                           │  │                                │       │
│ │ This task meets our       │  │ This task needs revisions      │       │
│ │ requirements              │  │ before approval                │       │
│ │                           │  │                                │       │
│ └───────────────────────────┘  └────────────────────────────────┘       │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌─── Comments (3) ─────────────────────────────────────────────────────────┐
│ @mike • 5h ago                                                           │
│ Color grading complete. Ready for client review.                         │
│                                                                           │
│ @sarah • 3h ago                                                          │
│ Looks great! Submitted to client for approval.                           │
│                                                                           │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ Add a comment or question...                                       │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│ [Post Comment]                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 10: Client Revision Request Form

**Triggered:** Client clicks "Request Changes"

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Request Changes: Video editing - Scene 2 color grading           [X]    │
└─────────────────────────────────────────────────────────────────────────┘

  What changes would you like to see?

  ┌───────────────────────────────────────────────────────────────────┐
  │ The blue saturation looks better, but could you please adjust    │
  │ the brightness a bit more? Scene 2 still looks slightly darker   │
  │ than scene 1.                                                      │
  │                                                                    │
  │ Also, the transition at 0:45 needs to be smoother.               │
  └───────────────────────────────────────────────────────────────────┘

  ℹ️  This is a TASK-LEVEL revision request.

  Note: This is separate from your project-level deliverable revision quota.
  Task revisions help the team refine work before final deliverable submission.

  What happens next:
  1. Your feedback will be sent to the team (@sarah, @mike)
  2. Task status will change to "Revision Requested"
  3. The team will review and make adjustments
  4. They'll resubmit for your approval

                    ┌──────────┐  ┌────────────────┐
                    │  Cancel  │  │  Submit Request │
                    └──────────┘  └────────────────┘
```

---

### SCREEN 11: Task Approval Confirmation

**Triggered:** Client clicks "Approve This Task"

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Approve Task?                                                     [X]    │
└─────────────────────────────────────────────────────────────────────────┘

  You're about to approve:

  Video editing - Scene 2 color grading

  ✓ I confirm this task is complete and meets our requirements

  What happens next:
  1. Task status will change to "Approved"
  2. The team will be notified
  3. Task will be marked as "Completed"
  4. Work will continue on next tasks

  ℹ️  This is a task approval, separate from final deliverable approval.

                 ┌──────────┐  ┌─────────────────────┐
                 │  Cancel  │  │  Approve This Task  │
                 └──────────┘  └─────────────────────┘
```

---

## Mobile Responsive Views (Optional Future Enhancement)

### SCREEN 12: Mobile Task List

```
┌─────────────────────────┐
│ ☰  Acme Corp Project    │
│                         │
│ Tasks (14)              │
│ [Filters ▼]  [+ Create] │
└─────────────────────────┘

┌─────────────────────────┐
│ 🔴 Scene 2 color        │
│    AWAITING APPROVAL    │
│    @sarah, @mike        │
│    Due: 2 days overdue  │
│    [Details →]          │
└─────────────────────────┘

┌─────────────────────────┐
│ ⚠️ Audio mix final      │
│    IN PROGRESS          │
│    @alex                │
│    Due: 4 days left     │
│    [Details →]          │
└─────────────────────────┘

┌─────────────────────────┐
│ ✅ Script review        │
│    COMPLETED            │
│    @sarah               │
│    Nov 12               │
│    [Details →]          │
└─────────────────────────┘
```

---

## Design Notes

### Color Coding
- 🔴 Red: Overdue tasks
- ⚠️ Yellow: Awaiting approval / attention needed
- ⏳ Blue: In progress
- ✅ Green: Completed
- 🔒 Gray: Internal-only tasks
- ⏸️ Gray: Pending / not started

### Icon Legend
- 💬 Comments
- 📎 Attachments
- 🕐 Last updated time
- ★ Following indicator
- [×] Remove/close button
- [+] Add button

### Status Badge Colors
- PENDING: Gray
- IN PROGRESS: Blue
- AWAITING APPROVAL: Yellow
- APPROVED: Light green
- REVISION REQUESTED: Orange
- COMPLETED: Green

### Accessibility
- All interactive elements have clear focus states
- Screen reader labels for all icons
- Keyboard navigation support
- High contrast color combinations
- Clear error messages and validation

### Responsive Breakpoints
- Desktop: > 1024px (full layout as shown)
- Tablet: 768px - 1024px (condensed sidebar)
- Mobile: < 768px (stacked layout, mobile wireframe shown)
