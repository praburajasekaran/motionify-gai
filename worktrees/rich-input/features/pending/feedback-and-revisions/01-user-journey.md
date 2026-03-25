# User Journey: Feedback & Revisions System

## Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FEEDBACK & REVISIONS WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
WORKFLOW 1: Task/File Comments (Informal Feedback)
═══════════════════════════════════════════════════════════════════════════

STEP 1: Team Member Creates Task/Uploads File
    ↓
Task or File visible to all project team members
    ↓

STEP 2: Any Team Member Adds Comment
    ↓
User clicks "Add Comment" on task or file
    ↓
Writes comment with optional @mentions
Supports Markdown formatting
    ↓
System:
  - Saves comment with timestamp
  - Detects @mentions (e.g., "@John Smith")
  - Creates notifications for mentioned users
  - Sends email to: mentioned users, assignees (tasks), uploader (files)
  - Logs activity: "Comment added by [User]"
    ↓

STEP 3: Recipients Receive Notification
    ↓
Email: "[User] commented on [Task/File Name]"
In-app notification badge appears
    ↓
Click notification → Navigate to task/file with comment highlighted
    ↓

STEP 4: Team Member Responds
    ↓
Add reply comment (threaded)
    ↓
Notifications sent to original commenter and any @mentions
    ↓
(Loop continues as needed)


═══════════════════════════════════════════════════════════════════════════
WORKFLOW 2: Formal Revision Request (Quota-Consuming)
═══════════════════════════════════════════════════════════════════════════

STEP 1: Client Reviews Beta Deliverable
    ↓
Client (PRIMARY_CONTACT) sees deliverable in "Awaiting Approval" status
Downloads beta file (watermarked)
    ↓

STEP 2: Client Decides to Request Revision
    ↓
Clicks "Request Revision" button
    ↓
System checks revision quota:
    ┌─────────────────────────────────────────────────┐
    │ IF usedRevisions < totalRevisions               │
    │   → Show revision request form                  │
    │                                                  │
    │ IF usedRevisions >= totalRevisions              │
    │   → Show "Request Additional Revisions" form    │
    │   → Go to WORKFLOW 3                            │
    └─────────────────────────────────────────────────┘
    ↓

STEP 3: Client Submits Revision Request
    ↓
Required: Feedback describing what needs to change (min 50 chars)
Optional: Attach reference files
    ↓
System automatically:
  - Increments project.usedRevisions
  - Increments deliverable.revisionsConsumed
  - Updates deliverable status: 'awaiting_approval' → 'rejected' → 'revision_requested'
  - Updates related tasks status: → 'Revision Requested'
  - Creates RevisionRequest record with feedback
  - Logs activity: "Revision requested by [Client] (X/Y used)"
  - Sends email to Motionify team with feedback
    ↓

STEP 4: Team Receives Revision Request
    ↓
Email: "Revision Requested: [Deliverable Name]"
Contains:
  - Client feedback (full text)
  - Beta file link
  - Remaining revisions count
  - Link to project
    ↓

STEP 5: Team Makes Changes
    ↓
Team updates assets based on feedback
May use task comments to ask clarifying questions
    ↓
Updates deliverable status: 'revision_requested' → 'in_progress'
    ↓

STEP 6: Team Re-uploads Beta
    ↓
Admin uploads revised beta file
System automatically:
  - Updates deliverable status: 'in_progress' → 'beta_ready' → 'awaiting_approval'
  - Sends email to PRIMARY_CONTACT: "Revised Beta Ready for Review"
    ↓

STEP 7: Client Reviews Again
    ↓
Back to STEP 1 (loop until approved)


═══════════════════════════════════════════════════════════════════════════
WORKFLOW 3: Request Additional Revisions (When Quota Exhausted)
═══════════════════════════════════════════════════════════════════════════

STEP 1: Quota Exhausted
    ↓
Client tries to request revision
usedRevisions >= totalRevisions
    ↓
Warning shown: "All revisions used. Request additional revisions to continue."
    ↓

STEP 2: Client Requests Additional Revisions
    ↓
Clicks "Request Additional Revisions"
    ↓
Form appears:
  - How many additional revisions needed? (dropdown: 1-5)
  - Reason for request (required, min 100 chars)
  - Context about why more work is needed
    ↓
System:
  - Creates AdditionalRevisionRequest record
  - Sets status: 'pending'
  - Logs activity: "Additional revisions requested by [Client]"
  - Sends email to Admin team
    ↓

STEP 3: Admin Reviews Request
    ↓
Email: "Additional Revision Request: [Project Name]"
Contains:
  - Requested count: X revisions
  - Client reason (full text)
  - Current usage: Y/Z revisions used
  - Project context
  - Links: [Approve] [Decline]
    ↓
Admin logs into portal
Reviews request in "Additional Revision Requests" queue
    ↓
┌─────────────────────────┬─────────────────────────┐
│    ADMIN APPROVES       │    ADMIN DECLINES       │
└──────────┬──────────────┴──────────┬──────────────┘
           ↓                         ↓

APPROVAL PATH                 DECLINE PATH
           ↓                         ↓
Clicks "Approve"            Clicks "Decline"
           ↓                         ↓
Optional: Adjust count      Required: Reason for decline
(e.g., approve 2 instead    (e.g., "Out of scope")
of 5 requested)
           ↓                         ↓
System:                     System:
  - Adds to totalRevisions    - Updates request status: 'declined'
  - Updates request:          - Logs activity
    status → 'approved'       - Sends email to client
  - Logs activity
  - Sends email to client
           ↓                         ↓
Email: "Additional          Email: "Additional
Revisions Approved"         Revisions Declined"
           ↓                         ↓
Client can now request      Client must either:
revision on deliverable       - Approve deliverable as-is
                              - Negotiate with team via comments
                              - Submit new request with more context


═══════════════════════════════════════════════════════════════════════════
WORKFLOW 4: Edit/Delete Comment
═══════════════════════════════════════════════════════════════════════════

STEP 1: User Wants to Edit/Delete Own Comment
    ↓
Hovers over own comment
"Edit" and "Delete" buttons appear
    ↓
┌──────────────┬───────────────┐
│     EDIT     │    DELETE     │
└──────┬───────┴───────┬───────┘
       ↓               ↓

EDIT PATH           DELETE PATH
       ↓                   ↓
Clicks "Edit"       Clicks "Delete"
       ↓                   ↓
Inline editor       Confirmation dialog:
appears             "Delete this comment?"
       ↓                   ↓
Can edit if         User confirms
< 1 hour old               ↓
       ↓            System:
Updates text          - Soft delete (keep in DB)
       ↓              - Display: "[deleted]"
System:               - Preserve metadata
  - Updates             (author, timestamp)
    comment.text      - Log activity
  - Sets edited:true
  - Stores
    editedAt timestamp
  - No new notifications
```

## State Transition Diagrams

### Comment Lifecycle

```
┌──────────┐
│ created  │  ← Initial state
└────┬─────┘
     │
     ├─────────────────────────────┐
     │                             │
     ↓                             ↓
┌──────────┐                  ┌──────────┐
│ active   │                  │ edited   │
└────┬─────┘                  └────┬─────┘
     │                             │
     │←────────────────────────────┘
     │ (can be edited within 1 hour)
     │
     ↓
┌──────────┐
│ deleted  │  ← Terminal state (soft delete)
└──────────┘
```

### Revision Request Lifecycle

```
┌─────────────────┐
│ deliverable:    │
│ awaiting_       │
│ approval        │  ← Starting point
└────────┬────────┘
         │
    ┌────┴────┐
    │ Client  │
    │ requests│
    │ revision│
    └────┬────┘
         │
         ↓
┌─────────────────┐
│ Check quota     │
└────────┬────────┘
         │
    ┌────┴─────┐
    ↓          ↓
┌──────┐   ┌──────────────┐
│ Has  │   │ Quota        │
│ quota│   │ exhausted    │
└──┬───┘   └──┬───────────┘
   │          │
   │          ↓
   │     ┌──────────────────────┐
   │     │ additional_revision_ │
   │     │ request: pending     │
   │     └──────┬───────────────┘
   │            │
   │       ┌────┴────┐
   │       ↓         ↓
   │  ┌─────────┐ ┌──────────┐
   │  │approved │ │ declined │
   │  └────┬────┘ └─────┬────┘
   │       │            │
   │       │            ↓
   │       │      Client must approve
   │       │      or negotiate
   │       ↓
   │   Quota increased
   │       │
   └───────┴──────────→
           ↓
   ┌────────────────┐
   │ revision_      │
   │ request:       │
   │ submitted      │
   └────┬───────────┘
        │
        ↓
   ┌────────────────┐
   │ deliverable:   │
   │ revision_      │
   │ requested      │
   └────┬───────────┘
        │
        ↓
   Team re-uploads beta
        │
        ↓
   ┌────────────────┐
   │ deliverable:   │
   │ awaiting_      │
   │ approval       │
   └────────────────┘
   (cycle repeats)
```

### Revision Quota States

```
┌──────────────────┐
│ quota available  │  usedRevisions < totalRevisions
└────────┬─────────┘
         │
         │ (client requests revision)
         ↓
┌──────────────────┐
│ quota warning    │  usedRevisions = totalRevisions - 1
└────────┬─────────┘
         │
         │ (client requests revision)
         ↓
┌──────────────────┐
│ quota exhausted  │  usedRevisions >= totalRevisions
└────────┬─────────┘
         │
         │ (cannot request revision)
         │ (must request additional)
         ↓
┌────────────────────────┐
│ additional pending     │
└────────┬───────────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐  ┌──────────┐
│approved │  │ declined │
└────┬────┘  └──────────┘
     │
     │ (totalRevisions increased)
     ↓
┌──────────────────┐
│ quota available  │
└──────────────────┘
(cycle continues)
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Template |
|--------------|------------|----------------|
| Comment added on task | Task assignees, followers, @mentions | `task-comment-added` |
| Comment added on file | File uploader, @mentions | `file-comment-added` |
| Revision requested | Motionify team, project manager | `revision-requested` |
| Additional revisions requested | Admin team | `additional-revisions-requested` |
| Additional revisions approved | Client PRIMARY_CONTACT | `additional-revisions-approved` |
| Additional revisions declined | Client PRIMARY_CONTACT | `additional-revisions-declined` |
| Revised beta ready | Client PRIMARY_CONTACT | `revised-beta-ready` |
| Quota warning (1 remaining) | Client PRIMARY_CONTACT, Motionify PM | `revision-quota-warning` |
| Comment reply (@mention) | Mentioned user | `comment-mention` |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| Client requests revision | Deliverable: `awaiting_approval` → `rejected` → `revision_requested` |
| Client requests revision | Related tasks: → `Revision Requested` |
| Team re-uploads beta | Deliverable: `revision_requested` → `in_progress` → `awaiting_approval` |
| Additional revision approved | AdditionalRevisionRequest: `pending` → `approved` |
| Additional revision declined | AdditionalRevisionRequest: `pending` → `declined` |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Client requests revision | Increment `project.usedRevisions` |
| Client requests revision | Increment `deliverable.revisionsConsumed` |
| Additional revision approved | Add approved count to `project.totalRevisions` |
| Comment with @mention | Create notification record for mentioned user |
| Comment posted | Increment comment count on parent entity (task/file) |
| usedRevisions = totalRevisions - 1 | Send quota warning email |
| Comment older than 1 hour | Disable edit button (read-only) |

## Timeline Estimates

### Typical Comment Thread
```
Hour 0:   Client adds comment on task: "Can we change the color to blue?"
Hour 1:   Team member replies: "@JohnDoe yes, we can do that"
Hour 2:   Designer updates mockup and comments: "Updated! See attached"
Hour 3:   Client reviews: "Perfect, approved!"
         ↓
Total: 3 hours for feedback loop
```

### Revision Request Flow
```
Day 0:   Beta deliverable uploaded (awaiting_approval)
Day 1:   Client reviews and requests revision with detailed feedback
         usedRevisions: 0 → 1 (of 3)
Day 3:   Team completes changes, re-uploads beta
Day 4:   Client reviews revised version
Day 4:   Client approves
         ↓
Total: 4 days with 1 revision
```

### Additional Revision Request Flow
```
Day 0:   Quota exhausted (usedRevisions = 3)
Day 0:   Client requests 2 additional revisions
Hour 2:  Admin reviews request
Hour 3:  Admin approves 2 additional revisions
         totalRevisions: 3 → 5
         Client can now request revision
Day 1:   Client submits revision request
Day 3:   Team re-uploads
Day 4:   Client approves
         ↓
Total: 4 days including admin approval
```

## Edge Cases & Error Handling

### Edge Case: Quota Exhausted During Review
- **Scenario:** Client has usedRevisions = totalRevisions and wants to request revision
- **Behavior:** "Request Revision" button replaced with "Request Additional Revisions" button
- **Resolution:** Client must submit additional revision request → Admin approves → Client can then request revision

### Edge Case: Comment Spam Prevention
- **Scenario:** User tries to post 11 comments in 1 minute
- **Behavior:** Rate limit triggered (max 10 comments/minute)
- **Resolution:** Error message: "Slow down! Please wait before commenting again." Retry after 1 minute.

### Edge Case: Edit Window Expired
- **Scenario:** User tries to edit comment posted 2 hours ago
- **Behavior:** Edit button disabled, tooltip: "Comments can only be edited within 1 hour"
- **Resolution:** User must post new comment with correction or contact admin for edit

### Edge Case: Mention Non-Existent User
- **Scenario:** User types "@NonExistentUser" in comment
- **Behavior:** Autocomplete shows no results, @mention not linkified
- **Resolution:** Plain text displayed, no notification created, comment still posted

### Edge Case: Multiple Simultaneous Revisions
- **Scenario:** Client requests revision on deliverable A and B at same time (project has 2 remaining)
- **Behavior:** First request consumes 1 quota (succeeds), second request consumes 1 quota (succeeds)
- **Resolution:** usedRevisions incremented atomically (database transaction ensures no race condition)

### Edge Case: Admin Approves Partial Additional Revisions
- **Scenario:** Client requests 5 additional revisions, admin approves only 2
- **Behavior:** System increments totalRevisions by 2 (not 5)
- **Resolution:** Client notified: "Approved: 2 additional revisions" and can submit another request if needed

### Edge Case: Comment on Deleted Task/File
- **Scenario:** User has comment form open, admin deletes parent task/file before submission
- **Behavior:** Comment submission fails with 404 error
- **Resolution:** Error message: "This task/file has been deleted. Comment not saved."

### Edge Case: Revision Request After Approval
- **Scenario:** Client approves deliverable, then tries to request revision (changed mind)
- **Behavior:** "Request Revision" button disabled after approval
- **Resolution:** Client must contact admin to reopen deliverable manually

### Error Handling: Comment Save Failure
- **Scenario:** Network error or database issue during comment submission
- **Behavior:** Comment not saved, user sees error message
- **Resolution:** Error: "Failed to save comment. Please try again." Comment text preserved in form for retry.

### Error Handling: Notification Delivery Failure
- **Scenario:** Email service (SES) returns error when sending comment notification
- **Behavior:** Comment still saved, in-app notification created, email logged as failed
- **Resolution:** Background job retries email delivery (3 attempts). Admin alerted if all retries fail.

## Permission Matrix

### Comment Permissions

| Action | Own Comment | Others' Comment | Admin |
|--------|-------------|-----------------|-------|
| Create comment | ✅ (if project member) | N/A | ✅ |
| View comment | ✅ | ✅ (if project member) | ✅ |
| Edit comment | ✅ (< 1 hour) | ❌ | ✅ |
| Delete comment | ✅ (any time) | ❌ | ✅ |

### Revision Request Permissions

| Action | Client Team | Client PRIMARY_CONTACT | Motionify Team | Admin |
|--------|-------------|------------------------|----------------|-------|
| Request revision | ❌ | ✅ | ❌ | ✅ (override) |
| Request additional revisions | ❌ | ✅ | ❌ | ✅ (override) |
| Approve additional revisions | ❌ | ❌ | ❌ | ✅ |
| Decline additional revisions | ❌ | ❌ | ❌ | ✅ |
| Adjust quota manually | ❌ | ❌ | ❌ | ✅ |
| View revision history | ✅ | ✅ | ✅ | ✅ |
