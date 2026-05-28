# ASCII Wireframes: Task Following System

This document contains all user interface wireframes for the feature.

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Parameters:** `:projectId`, `:taskId` (consistent naming)  
**Status Badges:** Colors only, hover for full label tooltips  
**Loading States:** `[Spinner]` notation  
**Note:** Followed task notifications use "Task Status Changed" preference

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Table of Contents

### Main Screens
1. [Task Detail Page with Follow Button](#screen-1-task-detail-page-with-follow-button)
2. [Follower List Popover](#screen-2-follower-list-popover)
3. [Task Board with Followed Tasks Filter](#screen-3-task-board-with-followed-tasks-filter)

---

## Main Screens

### SCREEN 1: Task Detail Page with Follow Button

**Purpose:** Display follow button on task detail page, allowing users to follow/unfollow

**Route:** `portal.motionify.studio/projects/:projectId/tasks/:taskId`
**Authentication:** Required (project member)
**Trigger:** User clicks on task from task board

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Tasks                                     [User Name] ▾   Logout  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TASK-123: Design homepage mockups                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  Status: In Progress         Priority: High         Due: Nov 20, 2025       │
│                                                                              │
│  Assigned to: Sarah Johnson, Mike Chen                                      │
│                                                                              │
│  ┌──────────────────┐  ┌────────────────────────┐                          │
│  │   ★ Following    │  │ 👥 5 followers         │                          │
│  └──────────────────┘  └────────────────────────┘                          │
│       (hover: "Click to unfollow")  (click to see list)                     │
│                                                                              │
│  Description                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Create wireframes for the homepage redesign. Include desktop and mobile    │
│  versions. Focus on conversion optimization and accessibility.               │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Activity Feed                                                        │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │                                                                       │  │
│  │  Nov 13, 2:30 PM - John Doe started following this task              │  │
│  │  Nov 13, 10:15 AM - Sarah Johnson changed status to "In Progress"    │  │
│  │  Nov 12, 4:00 PM - Mike Chen added a comment                         │  │
│  │  Nov 12, 3:45 PM - Task created by Admin                             │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Files (3)                                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📎 homepage-sketch-v1.pdf (2.1 MB)                                          │
│  📎 requirements.docx (450 KB)                                               │
│  📎 reference-designs.zip (8.5 MB)                                           │
│                                                                              │
│  Comments (2)                                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [Comments section...]                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**States of Follow Button:**

**Not Following:**
```
┌──────────────────┐
│   ☆ Follow       │
└──────────────────┘
```

**Following:**
```
┌──────────────────┐
│   ★ Following    │
└──────────────────┘
(hover shows: "Click to unfollow")
```

**Loading (optimistic update):**
```
┌──────────────────┐
│   ⏳ Following   │
└──────────────────┘
```

**Validation Rules:**
- Button only visible if user is project member
- If not following: Shows empty star "☆ Follow"
- If following: Shows filled star "★ Following"
- Hover on "Following" shows unfollow hint

**User Actions:**
- **Click "Follow"** → Optimistic UI update, API call to follow
- **Click "Following"** → Show confirmation dialog, unfollow
- **Click follower count** → Show follower list (Screen 2)

**API Call:**
```
POST /api/tasks/TASK-123/follow
→ Returns: { success: true, followerCount: 6 }

Or:

DELETE /api/tasks/TASK-123/follow
→ Returns: { success: true, followerCount: 4 }
```

---

### SCREEN 2: Follower List Popover

**Purpose:** Show list of users following the task

**Route:** Popover on `portal.motionify.studio/projects/:projectId/tasks/:taskId`
**Authentication:** Required
**Trigger:** User clicks on follower count

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TASK-123: Design homepage mockups                                          │
│                                                                              │
│  Status: In Progress                    ┌─────────────────────────────┐    │
│                                          │  Followers (5)              │    │
│  Assigned to: Sarah Johnson, Mike       │  ━━━━━━━━━━━━━━━━━━━━━━━━  │    │
│                                          │                             │    │
│  ┌──────────────────┐  ┌────────────────│  👤 Sarah Johnson          │    │
│  │   ★ Following    │  │ 👥 5 followers │     (Assignee)             │    │
│  └──────────────────┘  └────────────────│                             │    │
│                                          │  👤 Mike Chen              │    │
│                                          │     (Assignee)             │    │
│  Description                             │                             │    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  👤 John Doe               │    │
│  Create wireframes for the homepage      │     (You)                  │    │
│  versions. Focus on conversion           │                             │    │
│                                          │  👤 Emily Davis            │    │
│                                          │     (Client Lead)          │    │
│                                          │                             │    │
│                                          │  👤 Admin User             │    │
│                                          │     (Motionify Studio Admin)      │    │
│                                          │                             │    │
│                                          └─────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Shows all users following the task
- Marks assignees with "(Assignee)" label
- Highlights current user with "(You)" label
- Displays user role in parentheses

**User Actions:**
- **Click outside popover** → Close popover
- **Hover on username** → Show user profile tooltip (optional)

**API Call:**
```
GET /api/tasks/TASK-123/followers
→ Returns: [
  { id: "uuid1", name: "Sarah Johnson", role: "project_manager", isAssignee: true },
  { id: "uuid2", name: "Mike Chen", role: "project_manager", isAssignee: true },
  { id: "uuid3", name: "John Doe", role: "client", isAssignee: false },
  ...
]
```

---

### SCREEN 3: Task Board with Followed Tasks Filter

**Purpose:** Show task board with filter for followed tasks

**Route:** `portal.motionify.studio/projects/:projectId/tasks`
**Authentication:** Required
**Trigger:** User selects "Followed Tasks" filter

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROJECT: Brand Video Campaign Q1 2025                    [User] ▾   Logout  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tasks                                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  Filters:  [ All Tasks ▾ ]  [ All Status ▾ ]  [ All Assignees ▾ ]          │
│                                                                              │
│  ┌──────────────────────────────┐                                           │
│  │ ☑ All Tasks                  │                                           │
│  │ ☐ My Assigned Tasks          │                                           │
│  │ ☑ My Followed Tasks ← Selected                                           │
│  │ ☐ Unassigned Tasks           │                                           │
│  └──────────────────────────────┘                                           │
│                                                                              │
│  Showing 3 followed tasks                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TASK-123: Design homepage mockups                      ★ Following   │  │
│  │ Status: In Progress | Assignee: Sarah J., Mike C. | Due: Nov 20     │  │
│  │ 👥 5 followers | 💬 2 comments | 📎 3 files                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TASK-089: Write product copy                           ★ Following   │  │
│  │ Status: Awaiting Approval | Assignee: Emily D. | Due: Nov 18        │  │
│  │ 👥 3 followers | 💬 5 comments | 📎 1 file                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TASK-045: Client feedback review                       ★ Following   │  │
│  │ Status: Pending | Assignee: Mike C. | Due: Nov 15                    │  │
│  │ 👥 7 followers | 💬 12 comments | 📎 0 files                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Only shows tasks current user is following
- Star icon "★" indicates followed status
- Shows follower count, comment count, file count

**User Actions:**
- **Select "My Followed Tasks"** → Filter to followed tasks only
- **Click on task** → Navigate to task detail
- **Click star icon** → Unfollow (removes from this filtered view)

**API Call:**
```
GET /api/projects/:projectId/tasks?filter=followed
→ Returns tasks where user is in task_followers table
```

---

## Design Notes

### Responsive Behavior

**Mobile (< 768px):**
- Follow button full width on mobile
- Follower list becomes bottom sheet (not popover)
- Task filter becomes slide-out drawer

**Tablet (768px - 1024px):**
- Follow button maintains standard size
- Follower popover stays as popover
- Standard layout

**Desktop (> 1024px):**
- Standard button sizing
- Popover positioned relative to follower count
- Optimal layout

### Accessibility

- Follow button has aria-label: "Follow this task" / "Unfollow this task"
- Follower count has aria-label: "5 people are following this task"
- Keyboard navigation: Tab to follow button, Enter to toggle
- Screen reader announces: "You are now following TASK-123"

### Loading States

- Optimistic UI: Button updates immediately on click
- If API fails: Revert button state, show error toast
- Skeleton loader for follower list while fetching

### Error Handling

- **Network error:** "Unable to follow task. Please try again."
- **Already following:** Prevent duplicate follows, show current state
- **Not project member:** Hide follow button entirely

### Animation & Transitions

- Follow button: 150ms fade transition between states
- Follower count: Animated increment/decrement
- Popover: 200ms slide-down animation
- Star icon: Bounce animation on follow action
