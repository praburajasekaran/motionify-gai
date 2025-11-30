# User Journey: Core Task Management

## Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CORE TASK MANAGEMENT WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Motionify Team Creates Task
    ↓
User clicks "Create Task" button in project view
Fills in task details:
  - Title (required)
  - Description (optional, markdown supported)
  - Linked deliverable (required, dropdown)
  - Visibility: "Client-Visible" or "Internal-Only"
  - Deadline (optional)
  - Initial assignee(s) (optional, multi-select)
    ↓
System validates input and creates task
Status: 'pending'
Activity logged: "Task created by [user]"
    ↓

STEP 2: Task Assignment
    ↓
Team member assigns task to one or more users:
  - Can assign to Motionify team members
  - Can assign to client team members (if client-visible)
  - Assignees automatically become followers
    ↓
System sends email notification to each assignee
Email includes: task title, description, deadline, link to task
Activity logged: "Task assigned to [user1, user2] by [user]"
    ↓

STEP 3: Team Starts Work
    ↓
Assignee clicks task and updates status
Status transition: 'pending' → 'in_progress'
    ↓
System validates transition (any team member can do this)
Activity logged: "Status changed to In Progress by [user]"
Notification sent to: creator, other assignees, followers
    ↓

STEP 4: Work Completion
    ↓
Motionify team member completes work
Adds delivery notes (required for client-visible tasks)
Changes status: 'in_progress' → 'awaiting_approval'
    ↓
System validates:
  - Only Motionify team can transition to awaiting_approval
  - Delivery notes required if client-visible
  - Sends email to Client Primary Contact (if client-visible)
Activity logged: "Status changed to Awaiting Approval by [user]"
    ↓

STEP 5: Client Reviews Task
    ↓
┌──────────────────────┬─────────────────────────┐
│   CLIENT APPROVES    │  CLIENT REQUESTS        │
│                      │  REVISION               │
└──────────┬───────────┴─────────────┬───────────┘
           ↓                         ↓

    APPROVAL PATH              REVISION PATH
           ↓                         ↓
Status: 'approved'            Status: 'revision_requested'
           ↓                         ↓
Activity logged:              Activity logged:
"Task approved by [client]"   "Revision requested by [client]"
           ↓                         ↓
Email to Motionify team:      Client provides feedback
"Task approved"               Team reviews feedback
           ↓                         ↓
Manually mark 'completed'     Status: 'revision_requested' → 'in_progress'
or auto-complete if           Team makes changes
linked to deliverable              ↓
           ↓                   (Loop back to Step 4)
Status: 'completed'
           ↓
     Task Done
```

## Alternative Flow: Internal-Only Tasks

```
Internal-Only Task Created
    ↓
Only Motionify team members can see task
    ↓
Work progresses: pending → in_progress → completed
    ↓
No client approval required
Motionify team can directly mark as 'completed'
```

## State Transition Diagrams

### Task Status Flow

```
┌──────────┐
│ pending  │  ← Initial state (created)
└────┬─────┘
     │ (any team member can start)
     ↓
┌──────────────┐
│ in_progress  │  ← Work in progress
└────┬─────────┘
     │ (Motionify team only)
     ↓
┌──────────────────────┐
│ awaiting_approval    │  ← Ready for client review (client-visible only)
└────┬─────────────────┘
     │
     ├─────────────────┬─────────────────┐
     │ (client)        │ (client)        │
     ↓                 ↓                 │
┌──────────┐    ┌──────────────────┐    │
│ approved │    │ revision_requested│    │
└────┬─────┘    └────┬─────────────┘    │
     │               │ (team restarts)   │
     │               └──────────→ (back to in_progress)
     │
     ↓
┌──────────┐
│completed │  ← Final state
└──────────┘

Alternative: Internal tasks can skip awaiting_approval
in_progress → completed (direct transition for internal tasks)

Admin-only reopening:
completed → in_progress (only super_admin or project_manager)
```

### Task Status State Machine: Two Distinct Flows

The system supports two different status transition flows based on task visibility:

#### Flow 1: Client-Visible Tasks (Requires Client Approval)
```
pending → in_progress → awaiting_approval → approved → completed
                              ↓
                       revision_requested
                              ↓
                         in_progress (loop back)
```

**Rules:**
- Tasks marked as "Client-Visible" MUST follow this flow
- `awaiting_approval` state is REQUIRED before completion
- Only Motionify team can transition to `awaiting_approval`
- Only Client Primary Contact can approve or request revision
- Delivery notes are REQUIRED when transitioning to `awaiting_approval`
- After approval, task can be manually marked as `completed`

#### Flow 2: Internal-Only Tasks (No Client Approval)
```
pending → in_progress → completed (direct)
```

**Rules:**
- Tasks marked as "Internal-Only" can skip approval entirely
- Motionify team can transition directly from `in_progress` to `completed`
- No delivery notes required (optional)
- Client team CANNOT see these tasks at all
- Used for internal project management, administrative tasks, etc.

**Validation:**
- System validates task visibility before allowing status transitions
- API endpoints enforce these rules at the backend
- UI shows/hides status options based on task visibility and user role

### Visibility Control Flow

```
Task Created
    ↓
┌─────────────────┬──────────────────┐
│ Client-Visible  │  Internal-Only   │
└────────┬────────┴──────┬───────────┘
         │               │
         ↓               ↓
Visible to:        Visible to:
- Motionify team   - Motionify team ONLY
- Client team      - Hidden from ALL clients
         │               │
         ↓               ↓
Requires approval  No client approval
from client        (team completes directly)
```

## Decision Points

### User: Task Creation - Visibility Setting
```
Should this task be visible to the client?

    YES (Client-Visible)              NO (Internal-Only)
          │                                 │
          ↓                                 ↓
    Client can see task              Hidden from client
    Requires client approval         No client approval needed
    Appears in client portal         Team completes directly
    Delivery notes required          Delivery notes optional
```

### User: Assignment Strategy
```
Who should work on this task?

Single Assignee           Multiple Assignees        No Assignee (Unassigned)
      │                         │                          │
      ↓                         ↓                          ↓
Clear ownership          Collaborative work        Pick up from pool
1 notification sent      Multiple notifications    Appears in "Unassigned"
Simple accountability    Shared responsibility     Any team member can claim
```

### User: Following Tasks
```
Want to stay updated on this task without being assigned?

        YES (Follow)                    NO (Don't Follow)
            │                                 │
            ↓                                 ↓
    Receive all notifications         Only see in task list
    Status changes                    No email updates
    New comments                      Can still comment
    New assignments                   Can follow later
```

### Client: Review Decision
```
Is the delivered work acceptable?

    APPROVE                         REQUEST REVISION
       │                                   │
       ↓                                   ↓
Status: 'approved'                Status: 'revision_requested'
Task complete (or →               Team reviews feedback
manually marked                   Returns to 'in_progress'
'completed')                      Work continues
Payment may trigger               No revision quota consumed
(if final deliverable)            (task-level revisions separate
                                  from project-level deliverable
                                  revisions)
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type |
|--------------|------------|------------|
| Task created | Assignees (if any) | `task-created` |
| Task assigned to user | New assignee(s) | `task-assigned` |
| Task status changed | Assignees + Followers | `task-status-changed` |
| Task → awaiting_approval | Client Primary Contact | `task-ready-for-review` |
| Task approved | Assignees + Followers + Creator | `task-approved` |
| Task revision requested | Assignees + Followers | `task-revision-requested` |
| New comment added | Assignees + Followers (except commenter) | `task-commented` |
| User mentioned in comment | Mentioned user | `task-mention` |
| Deadline approaching (24h) | Assignees | `task-deadline-reminder` |
| Deadline passed | Assignees + Creator | `task-overdue` |

### Activity Logging (Automatic)

| Trigger Event | Activity Log Entry | Visible To |
|--------------|-------------------|------------|
| Task created | "Task created by [user]" | Project team |
| Task title/description edited | "Task updated by [user]" | Project team |
| Task assigned | "Assigned to [user] by [user]" | Project team |
| Assignee removed | "[user] removed from assignees by [user]" | Project team |
| User follows task | "[user] is now following this task" | Project team |
| User unfollows task | "[user] stopped following this task" | Project team |
| Status changed | "Status changed from [old] to [new] by [user]" | Project team |
| Delivery notes added | "Delivery notes added by [user]" | Project team |
| Comment added | "[user] commented on this task" | Project team |
| Task deleted | "Task deleted by [user]" | Project admins only |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Task assigned to user | User automatically added to followers list |
| User unassigned from task | User remains in followers (manual unfollow required) |
| Task → awaiting_approval without delivery notes | Show validation error, prevent transition |
| Client user tries to change status to awaiting_approval | Show permission error, prevent transition |
| Non-primary-contact client tries to approve/reject | Show permission error, prevent transition |
| Task linked to deliverable approved | Consider suggesting task completion (prompt user) |
| All tasks for deliverable completed | Update deliverable progress to 100% |

### Follower Auto-Add (Automatic)

| Trigger Event | Who Gets Added as Follower |
|--------------|---------------------------|
| Task created | Creator |
| Task assigned | All assignees |
| User comments on task | Commenter (if not already following) |

## Timeline Estimates

### Typical Flow: Simple Task (Client-Visible)
```
Day 0:   Motionify team creates task, assigns to team member
         → Email notification sent
Day 1:   Assignee starts work (pending → in_progress)
         → Status notification sent to followers
Day 2-3: Team completes work, adds delivery notes
         → Status changes to awaiting_approval
         → Email sent to Client Primary Contact
Day 4:   Client reviews and approves task
         → Status: approved
         → Email to team confirming approval
Day 4:   Team marks as completed
         → Status: completed
         ↓
Total: ~4 days
```

### Typical Flow: Complex Task with Revision
```
Day 0:   Task created and assigned
Day 1-3: Team works on task (in_progress)
Day 4:   Team submits for approval (awaiting_approval)
Day 5:   Client requests revision
         → Status: revision_requested
         → Email to team with feedback
Day 6-7: Team makes revisions (back to in_progress)
Day 8:   Resubmit for approval
Day 9:   Client approves
Day 9:   Mark as completed
         ↓
Total: ~9 days
```

### Fast Track: Internal-Only Task
```
Day 0:   Task created (internal-only)
Day 1:   Team completes work
         → Direct transition: in_progress → completed
         ↓
Total: ~1 day (no client approval needed)
```

## Edge Cases & Error Handling

### Edge Case: Task with No Assignees
- **Description:** Task created but not assigned to anyone
- **Expected behavior:**
  - Task appears in "Unassigned Tasks" filter
  - Any team member can assign themselves or others
  - No assignment notification sent initially
- **Resolution:** Team member assigns task or self-assigns when ready to work

### Edge Case: All Assignees Remove Themselves
- **Description:** Task becomes unassigned mid-progress
- **Expected behavior:**
  - Status remains (e.g., stays 'in_progress')
  - Task returns to "Unassigned Tasks" pool
  - Activity logged: "All assignees removed, task unassigned"
  - Email notification to task creator
- **Resolution:** Creator or admin re-assigns task

### Edge Case: Client Approves Internal-Only Task (Should Never Happen)
- **Description:** Client tries to access/approve internal task via direct URL
- **Expected behavior:**
  - 403 Forbidden error
  - Task not visible in client portal
  - No approval buttons shown
- **Resolution:** System enforces permission checks on API level

### Edge Case: Delivery Notes Edited After Submission
- **Description:** Team member wants to update delivery notes after transitioning to awaiting_approval
- **Expected behavior:**
  - Editable for 1 hour after initial submission
  - After 1 hour, read-only (prevents changing context after client sees it)
  - Edit activity logged
  - No re-notification to client (to avoid spam)
- **Resolution:** If critical change needed after 1 hour, use comments instead

### Edge Case: Task Status Changed While Client Reviewing
- **Description:** Team member changes status back to in_progress while client is reviewing
- **Expected behavior:**
  - Client sees real-time update (if they refresh)
  - Client's approve/reject buttons disabled
  - Message: "This task is no longer awaiting approval"
  - Email notification to client about status change
- **Resolution:** Team can re-submit when ready

### Error Case: Deadline Passed, Task Not Started
- **Description:** Task deadline expires while still in 'pending' status
- **Expected behavior:**
  - Task marked with overdue indicator (red flag)
  - Email to assignees (if any) and creator
  - Email subject: "Overdue Task: [Task Title]"
  - Task remains actionable (not locked)
- **Recovery process:**
  - Team can update deadline
  - Or complete task (late)
  - Or delete task if no longer relevant

### Error Case: Client Primary Contact Leaves Project
- **Description:** Primary contact removed from project while tasks await approval
- **Expected behavior:**
  - System prevents removal if tasks are in 'awaiting_approval'
  - Error message: "Cannot remove primary contact with pending approvals"
  - Admin must either:
    1. Assign new primary contact first
    2. Or move tasks back to 'in_progress'
- **Recovery process:** Assign new primary contact, then remove old one

### Error Case: Task Deleted While In Progress
- **Description:** Admin deletes task that team is actively working on
- **Expected behavior:**
  - Soft delete (task archived, not permanently deleted)
  - Activity logged: "Task deleted by [admin]"
  - Email to all assignees and followers: "Task deleted: [Title]"
  - Data retained for 90 days (per data retention policy)
- **Recovery process:** Admin can undelete task within 90 days if needed

### Error Case: Concurrent Status Updates
- **Description:** Two users try to change task status simultaneously
- **Expected behavior:**
  - Optimistic locking with version check
  - Second update fails with error: "Task was updated by another user"
  - User must refresh and retry
- **Recovery process:** Refresh page, review current status, retry if still valid

### Edge Case: Multiple Assignees, Only One Active
- **Description:** Task assigned to 3 people, only 1 is actively working
- **Expected behavior:**
  - All assignees receive notifications
  - Any assignee can update status
  - Activity log shows who made changes
  - Inactive assignees can remove themselves
- **Resolution:** Expected behavior, no action needed

### Edge Case: Follower Count Very High (>20)
- **Description:** Popular task with many followers
- **Expected behavior:**
  - Email notifications still sent to all (may trigger rate limits)
  - Consider batching notifications (digest mode)
  - UI shows follower count, click to see list
- **Resolution:** System handles gracefully, possible future optimization

### Edge Case: Task Linked to Deleted Deliverable
- **Description:** Deliverable deleted while tasks still reference it
- **Expected behavior:**
  - System prevents deliverable deletion if active tasks exist
  - Error: "Cannot delete deliverable with active tasks"
  - Admin must either:
    1. Complete/delete tasks first
    2. Or reassign tasks to different deliverable
- **Resolution:** Clean up tasks before deleting deliverable
