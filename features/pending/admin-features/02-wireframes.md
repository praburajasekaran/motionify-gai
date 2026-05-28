# ASCII Wireframes: Admin Features

This document contains all user interface wireframes for the admin features.

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio/admin/...` pattern  
**Parameters:** `:userId`, `:projectId` (consistent naming)  
**Status Badges:** Colors only, hover for full label tooltips  
**Modal Close:** `[×]` for all modals  
**Buttons:** Right-aligned with `[Cancel] [Primary]` order  
**Loading States:** `[Spinner]` notation

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Table of Contents

### Admin Screens
1. [User Management Dashboard](#screen-1-user-management-dashboard)
2. [Add/Edit User Modal](#screen-2-addedit-user-modal)
3. [Activity Log Viewer](#screen-3-activity-log-viewer)
4. [Project Status Management Panel](#screen-4-project-status-management-panel)

---

## Admin Screens

### SCREEN 1: User Management Dashboard

**Purpose:** Super Admin can view all users, filter by status, and perform user management actions
**Route:** `portal.motionify.studio/admin/users`
**Authentication:** Required (super_admin only)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Motionify Studio Portal - Admin        [🔔]  [Profile ▼]                          [Logout]│
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Dashboard  |  User Management  |  Activity Logs  |  Settings                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  USER MANAGEMENT                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search users...                                    [+ Add User]           │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  Filters:  [All Users ▼]  [All Roles ▼]  [Active ▼]                                │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ NAME              EMAIL                    ROLE            STATUS   ACTIONS  │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 👤 Sarah Mitchell  sarah@motionify.studio  Project Manager  ● Active  [⋮]   │   │
│  │                    Last login: 2 hours ago                                   │   │
│  │                    Created: Jan 15, 2025                                     │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 👤 Mike Johnson    mike@motionify.studio   Team Member      ● Active  [⋮]   │   │
│  │                    Last login: 1 day ago                                     │   │
│  │                    Created: Jan 10, 2025                                     │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 👤 Jane Smith      jane@motionify.studio   Super Admin      ● Active  [⋮]   │   │
│  │                    Last login: 5 minutes ago                                 │   │
│  │                    Created: Jan 1, 2025                                      │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 👤 Tom Wilson      tom@motionify.studio    Project Manager  ○ Deactivated   │   │
│  │                    Deactivated: Feb 1, 2025 by Jane Smith                   │   │
│  │                    Created: Dec 20, 2024                          [Reactivate]│   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  Showing 4 of 4 users                          [< Previous]  [1]  [Next >]          │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

Actions Menu (on click [⋮]):
┌────────────────────┐
│ Edit User          │
│ Change Role        │
│ Deactivate User    │
│ View Activity      │
└────────────────────┘
```

**Validation Rules:**
- Only super_admin role can access this page
- Search is case-insensitive, searches name and email
- Filters combine with AND logic

**User Actions:**
- **Click "Add User"** → Opens Add User Modal (Screen 2)
- **Click [⋮] → Edit User** → Opens Edit User Modal with pre-filled data
- **Click [⋮] → Deactivate User** → Shows confirmation dialog
- **Click "Reactivate"** → Reactivates deactivated user with confirmation
- **Type in search** → Filters users in real-time (debounced 300ms)

**API Calls:**
```
GET /api/admin/users?search=sarah&status=active&role=project_manager
```

---

### SCREEN 2: Add/Edit User Modal

**Purpose:** Super Admin can create new users or edit existing user details
**Route:** Modal overlay on `portal.motionify.studio/admin/users`
**Authentication:** Required (super_admin only)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  [×]  │
│  ADD NEW USER                                                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Full Name *                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ Sarah Mitchell                                                               │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  Email Address *                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ sarah@motionify.studio                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│  ℹ️  A welcome email with login instructions will be sent to this address           │
│                                                                                       │
│  Role *                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ Project Manager                                                           ▼  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│    Options: Super Admin, Project Manager, Team Member                               │
│                                                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                                                       │
│  What happens next?                                                                  │
│  1. User account created with status "Pending Activation"                           │
│  2. Welcome email sent with magic link (expires in 15 minutes)                      │
│  3. User clicks link to activate account and log in                                 │
│  4. You'll be notified when user activates their account                            │
│                                                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                                                       │
│                              [Cancel]  [Send Invitation]                             │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

EDIT MODE (when editing existing user):
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  EDIT USER - Sarah Mitchell                                                     [×]  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Full Name *                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ Sarah Mitchell                                                               │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  Email Address                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ sarah@motionify.studio                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│  ⚠️  Email cannot be changed. Contact support if email update needed.               │
│                                                                                       │
│  Role *                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ Super Admin                                                               ▼  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│  ⚠️  Changing from Super Admin to another role will reduce permissions               │
│                                                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                                                       │
│  User Status: ● Active                                                               │
│  Created: Jan 15, 2025                                                               │
│  Last Login: 2 hours ago                                                             │
│                                                                                       │
│                              [Cancel]  [Save Changes]                                │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- **Full Name**: Required, 2-100 characters, letters and spaces only
- **Email**: Required, valid email format, unique (not already in system)
- **Role**: Required, must be one of: super_admin, project_manager, team_member
- **Email field disabled** in edit mode (cannot change email after creation)

**User Actions:**
- **Click "Send Invitation"** → Creates user, sends email, shows success toast
- **Click "Save Changes"** → Updates user details, shows success toast
- **Click "Cancel" or [×]** → Closes modal without saving
- **Change role dropdown** → If changing from super_admin, shows warning

**API Calls:**
```
POST /api/admin/users
{
  "fullName": "Sarah Mitchell",
  "email": "sarah@motionify.studio",
  "role": "project_manager"
}

PATCH /api/admin/users/:userId
{
  "fullName": "Sarah Mitchell",
  "role": "super_admin"
}
```

---

### SCREEN 3: Activity Log Viewer

**Purpose:** View and export comprehensive activity logs with filtering
**Route:** `portal.motionify.studio/admin/activity-logs` (Super Admin) or `/projects/:id/activity` (Project Manager)
**Authentication:** Required (super_admin or project_manager)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Motionify Studio Portal - Admin        [🔔]  [Profile ▼]                          [Logout]│
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Dashboard  |  User Management  |  Activity Logs  |  Settings                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  ACTIVITY LOGS - Brand Video Campaign                          [Export to CSV]      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Filters:                                                                            │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐  │
│  │ Last 7 Days   ▼  │ │ All Users     ▼  │ │ All Actions   ▼  │ │ All Items ▼  │  │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────┘  │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ TIMESTAMP          USER              ACTION                DETAILS           │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 2 hours ago        Sarah Mitchell    Task Status Changed                    │   │
│  │ Jan 17, 2:30 PM    Project Manager   "Review storyboards"                   │   │
│  │                                       In Progress → Awaiting Approval        │   │
│  │                                       [View Task]                            │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 5 hours ago        Mike Johnson      File Uploaded                          │   │
│  │ Jan 17, 11:15 AM   Team Member       storyboard-concept-2.pdf (2.1 MB)      │   │
│  │                                       Deliverable: Concept Development       │   │
│  │                                       [View File]                            │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 1 day ago          John Doe          Deliverable Approved                   │   │
│  │ Jan 16, 3:45 PM    Client (Primary)  Concept Development ✓                  │   │
│  │                                       Comment: "Looks great!"                │   │
│  │                                       [View Deliverable]                     │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 2 days ago         Tom Wilson        User Deactivated                       │   │
│  │ Jan 15, 10:00 AM   (Deactivated)     By: Jane Smith (Super Admin)           │   │
│  │                                       Reason: Left company                   │   │
│  ├─────────────────────────────────────────────────────────────────────────────┤   │
│  │ 3 days ago         Sarah Mitchell    Team Member Added                      │   │
│  │ Jan 14, 9:00 AM    Project Manager   Added Mike Johnson to project          │   │
│  │                                       Role: Team Member                      │   │
│  │                                       [View Team]                            │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  Showing 5 of 2,347 activities                    [< Previous]  [1]  [Next >]       │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

Date Range Dropdown Options:
┌──────────────────┐
│ Last 24 hours    │
│ Last 7 days      │
│ Last 30 days     │
│ Last 3 months    │
│ Custom range...  │
└──────────────────┘

Action Type Dropdown Options:
┌──────────────────────┐
│ All Actions          │
│ Task Created         │
│ Task Status Changed  │
│ File Uploaded        │
│ Comment Added        │
│ Team Member Added    │
│ User Deactivated     │
│ Deliverable Approved │
│ Project Status       │
└──────────────────────┘
```

**Validation Rules:**
- Super Admin can view all projects' activity logs
- Project Managers can only view logs for their assigned projects
- Filters combine with AND logic
- Maximum 100 results per page

**User Actions:**
- **Select date range** → Filters activities by time period
- **Select user** → Shows only activities by that user
- **Select action type** → Filters by specific action
- **Click "Export to CSV"** → Opens export modal with options
- **Click activity links** → Navigates to referenced item (task, file, etc.)

**API Calls:**
```
GET /api/projects/:id/activities?
  dateFrom=2025-01-10&
  dateTo=2025-01-17&
  userId=uuid&
  actionType=task_status_changed&
  page=1&
  limit=50
```

---

### SCREEN 4: Project Status Management Panel

**Purpose:** Super Admin can update project status with validation
**Route:** `portal.motionify.studio/projects/:projectId` (Project Overview page, admin section)
**Authentication:** Required (super_admin only)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Project: Brand Video Campaign                                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Overview  |  Tasks  |  Files  |  Team  |  Activity                                 │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PROJECT STATUS                                                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Current Status:  ┌───────────────────┐                                             │
│                   │ In Progress    ▼  │                                             │
│                   └───────────────────┘                                             │
│                                                                                       │
│  Options:                                                                            │
│  • In Progress    - Project is actively being worked on                             │
│  • Completed      - All deliverables finished and approved                          │
│  • On Hold        - Project temporarily paused                                      │
│  • Archived       - Project hidden from main views (read-only)                      │
│                                                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                                                       │
│  Project Details:                                                                    │
│  • Start Date: Jan 15, 2025                                                          │
│  • Target End: Mar 1, 2025                                                           │
│  • Deliverables: 2 of 4 approved (50%)                                              │
│  • Team Members: 5 (3 Motionify Studio, 2 Client)                                          │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

CONFIRMATION MODAL (when changing to "Completed"):
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  CONFIRM STATUS CHANGE                                                          [×]  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ⚠️  Warning: Not All Deliverables Approved                                          │
│                                                                                       │
│  You are about to mark this project as "Completed", but the following               │
│  deliverables have not been approved yet:                                           │
│                                                                                       │
│  • Video Production (Status: Awaiting Approval)                                     │
│  • Social Media Cutdowns (Status: In Progress)                                      │
│                                                                                       │
│  Recommended Action:                                                                 │
│  Complete all deliverable approvals before marking project as complete.             │
│                                                                                       │
│  If you proceed:                                                                     │
│  • Project status will change to "Completed"                                         │
│  • All team members will be notified via email                                      │
│  • Activity will be logged with "Admin Override" note                               │
│  • Project will move to "Completed Projects" view                                   │
│                                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────────┐     │
│  │ ☑ I acknowledge that not all deliverables are approved                    │     │
│  └───────────────────────────────────────────────────────────────────────────┘     │
│                                                                                       │
│                        [Cancel]  [Mark as Completed Anyway]                          │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

ARCHIVE CONFIRMATION MODAL:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  ARCHIVE PROJECT                                                                [×]  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ⚠️  Important: Projects must be "Completed" before archiving                        │
│                                                                                       │
│  Current Status: In Progress                                                         │
│                                                                                       │
│  You cannot archive a project that is still in progress. Please:                    │
│  1. Complete all deliverables                                                        │
│  2. Change project status to "Completed"                                             │
│  3. Then archive the project                                                         │
│                                                                                       │
│  What happens when you archive a project?                                           │
│  • Project hidden from main project list                                             │
│  • All data remains accessible (read-only)                                           │
│  • Accessible via "View Archived Projects" toggle                                   │
│  • Team members notified of archival                                                 │
│  • Cannot be un-archived (create new project if work resumes)                       │
│                                                                                       │
│                                      [Close]                                         │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Only super_admin can change project status
- Status transitions must be valid (see state machine in user journey)
- Cannot archive unless status is "Completed"
- Checkbox required for override confirmations

**User Actions:**
- **Select new status** → Shows appropriate confirmation modal
- **Check override checkbox** → Enables confirmation button
- **Click "Confirm"** → Updates status, sends notifications
- **Click "Cancel"** → Closes modal without changes

**API Calls:**
```
PATCH /api/projects/:id/status
{
  "status": "completed",
  "override": true,
  "reason": "Client requested early completion"
}
```

---

## Design Notes

### Responsive Behavior

**Desktop (> 1024px):**
- Full table layout with all columns visible
- Modals centered at 600px width
- Side-by-side filters

**Tablet (768px - 1024px):**
- Condensed table, hide "Created" dates
- Stack filters vertically
- Modals at 90% width

**Mobile (< 768px):**
- Card-based layout instead of tables
- Single column filters
- Full-width modals
- Hamburger menu for actions

### Accessibility

- All form fields have visible labels
- Keyboard navigation: Tab through all interactive elements
- Focus indicators: 2px blue outline
- Screen reader announcements for status changes
- Color-blind safe status indicators (icons + colors)
- ARIA labels on icon buttons

### Loading States

- **Initial page load:** Skeleton loaders for tables
- **Filter changes:** Subtle loading overlay, disable controls
- **Modal actions:** Button shows spinner, text changes to "Saving..."
- **CSV export:** Progress bar with percentage

### Error Handling

- **Inline validation:** Red border + error text below field
- **API errors:** Toast notification (top-right, 5sec auto-dismiss)
- **Network errors:** Retry button with error message
- **Permission errors:** Redirect to dashboard with message

### Color Coding

- **Active user:** Green dot (●)
- **Deactivated user:** Gray outline circle (○)
- **Pending activation:** Yellow dot (●)
- **Status badges:**
  - In Progress: Blue background
  - Completed: Green background
  - On Hold: Orange background
  - Archived: Gray background
