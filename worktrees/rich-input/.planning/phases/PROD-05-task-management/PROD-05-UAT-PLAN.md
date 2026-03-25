# PROD-05: Task Management UAT Plan

**Goal:** Verify task creation, AI generation, assignment, and state management work end-to-end

**Date:** 2026-01-27

---

## System Overview (from Research)

### Task States
```
PENDING → IN_PROGRESS → AWAITING_APPROVAL → COMPLETED
                    ↓                    ↓
              REVISION_REQUESTED ←───────┘
```

### Valid Transitions
| From | To |
|------|-----|
| PENDING | IN_PROGRESS |
| IN_PROGRESS | PENDING, AWAITING_APPROVAL |
| AWAITING_APPROVAL | COMPLETED, REVISION_REQUESTED, IN_PROGRESS |
| REVISION_REQUESTED | IN_PROGRESS, PENDING |
| COMPLETED | IN_PROGRESS (reopen) |

### Key Permissions
| Action | Motionify Team | Client PM | Client Member |
|--------|----------------|-----------|---------------|
| Create task | ✅ | ❌ | ❌ |
| Edit task | ✅ | ❌ | ❌ |
| View all tasks | ✅ | Only visible | Only visible |
| Change status | ✅ | ❌ | ❌ |
| Approve task | ❌ | ✅ | ❌ |
| Comment | ✅ | ✅ | ✅ |

---

## Test Cases

### TASK-01: Task Creation

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| T01-01 | Admin creates task manually | 1. Login as admin<br>2. Go to project<br>3. Click "Add Task"<br>4. Fill title, description<br>5. Save | Task appears in list, saved to DB | ⏳ |
| T01-02 | Task with assignee | 1. Create task<br>2. Assign to team member | Assignee shown, notification sent | ⏳ |
| T01-03 | Task with deadline | 1. Create task<br>2. Set due date | Deadline shown in UI | ⏳ |
| T01-04 | Task visibility toggle | 1. Create task<br>2. Toggle "Visible to client" | Client can/cannot see based on toggle | ⏳ |
| T01-05 | Required field validation | 1. Try to create task without title | Error shown, task not created | ⏳ |
| T01-06 | Task linked to deliverable | 1. Create task<br>2. Link to deliverable | Task shows deliverable association | ⏳ |

### TASK-02: AI Task Generation

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| T02-01 | AI generates tasks on project creation | 1. Create new project with description<br>2. Check tasks generated | 5-7 relevant tasks created | ⏳ |
| T02-02 | AI fallback when no API key | 1. Verify fallback tasks | Default tasks shown if Gemini unavailable | ⏳ |
| T02-03 | Generated tasks are editable | 1. Generate tasks<br>2. Edit a generated task | Changes persist | ⏳ |

### TASK-03: State Machine

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| T03-01 | PENDING → IN_PROGRESS | 1. Find pending task<br>2. Change to In Progress | Status updates, persists | ⏳ |
| T03-02 | IN_PROGRESS → AWAITING_APPROVAL | 1. Find in-progress task<br>2. Change to Awaiting Approval | Status updates, client can see | ⏳ |
| T03-03 | AWAITING_APPROVAL → COMPLETED | 1. Client PM approves task | Status changes to Completed | ⏳ |
| T03-04 | AWAITING_APPROVAL → REVISION_REQUESTED | 1. Client PM requests revision | Status changes, revision count decrements | ⏳ |
| T03-05 | REVISION_REQUESTED → IN_PROGRESS | 1. Team moves task back to In Progress | Status updates | ⏳ |
| T03-06 | COMPLETED → IN_PROGRESS (reopen) | 1. Reopen completed task | Task can be reopened | ⏳ |
| T03-07 | Invalid: PENDING → COMPLETED | 1. Try to skip states | Transition rejected with error | ⏳ |
| T03-08 | Invalid: COMPLETED → PENDING | 1. Try invalid transition | Transition rejected with error | ⏳ |

### TASK-04: Assignment & Notifications

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| T04-01 | Assign task to team member | 1. Create/edit task<br>2. Assign to user | Assignment shows in UI | ⏳ |
| T04-02 | Assignment notification | 1. Assign task<br>2. Check assignee notifications | Email/in-app notification received | ⏳ |
| T04-03 | @mention in comment | 1. Add comment with @username<br>2. Check mentioned user | Notification sent to mentioned user | ⏳ |
| T04-04 | Follow/unfollow task | 1. Click follow on task<br>2. Verify notifications | Get updates when task changes | ⏳ |
| T04-05 | Reassign task | 1. Change assignee<br>2. Check both users | Old assignee loses, new gains access | ⏳ |

### TASK-05: Comments

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| T05-01 | Add comment | 1. Open task<br>2. Add comment | Comment appears, saved to DB | ⏳ |
| T05-02 | Edit comment (within 1 hour) | 1. Add comment<br>2. Edit within 1 hour | Edit succeeds | ⏳ |
| T05-03 | Edit comment (after 1 hour) | 1. Find old comment<br>2. Try to edit | Edit button hidden or disabled | ⏳ |
| T05-04 | @mention autocomplete | 1. Type @ in comment<br>2. Select user from dropdown | Mention formatted, user notified | ⏳ |
| T05-05 | Client can comment | 1. Login as client<br>2. Comment on visible task | Comment saved | ⏳ |

### TASK-06: Permissions & Access Control

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| T06-01 | Client cannot create tasks | 1. Login as client<br>2. Try to create task | No create button or action blocked | ⏳ |
| T06-02 | Client cannot edit tasks | 1. Login as client<br>2. Try to edit task | No edit option | ⏳ |
| T06-03 | Client only sees visible tasks | 1. Create internal task<br>2. Login as client | Internal task not shown | ⏳ |
| T06-04 | Client A cannot see Client B's tasks | 1. Login as Client A<br>2. Try to access Client B project | 404 error (not 403) | ⏳ |
| T06-05 | Client PM can approve | 1. Login as primary contact<br>2. Approve awaiting task | Approval succeeds | ⏳ |
| T06-06 | Non-PM client cannot approve | 1. Login as non-PM client<br>2. Try to approve | Approval button hidden | ⏳ |

---

## Test Environment

### Admin Portal
- URL: http://localhost:5173
- Login: Admin/Super Admin account

### Client Portal
- URL: http://localhost:3000
- Logins needed:
  - Client PM (primary contact)
  - Client Member (non-PM)
  - Different client (for isolation test)

### Test Data Requirements
- Project with existing tasks
- Team members to assign
- Multiple clients for isolation testing

---

## Files to Monitor

| File | Purpose |
|------|---------|
| `netlify/functions/tasks.ts` | API endpoint |
| `landing-page-new/src/lib/portal/components/TaskList.tsx` | Client task list |
| `landing-page-new/src/lib/portal/components/TaskItem.tsx` | Task display |
| `landing-page-new/src/lib/portal/utils/taskStateTransitions.ts` | State validation |
| `services/geminiService.ts` | AI generation |
| `components/tasks/TaskEditModal.tsx` | Admin edit UI |

---

## Execution Notes

Test order recommendation:
1. **T01-xx** - Task creation (foundational)
2. **T06-xx** - Permissions (security baseline)
3. **T03-xx** - State machine (core logic)
4. **T04-xx** - Assignments (notifications)
5. **T05-xx** - Comments
6. **T02-xx** - AI generation (depends on project creation)

---

*Created: 2026-01-27*
