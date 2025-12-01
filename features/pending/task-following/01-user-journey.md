# User Journey: Task Following System

## Complete Customer Journey

### Happy Path: User Follows a Task

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TASK FOLLOWING WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: User Views Task
    ↓
[User browses task board or task detail page]
[System checks: Is user already following this task?]
    ↓

STEP 2: User Sees Follow Button
    ↓
[If not following: "Follow" button displayed]
[If already following: "Following" button with checkmark]
[Follower count displayed: "3 followers"]
    ↓

STEP 3: User Clicks "Follow"
    ↓
[Optimistic UI update: Button changes to "Following"]
[API request sent in background]
    ↓

STEP 4: System Creates Follow Relationship
    ↓
[System creates task_followers record]
[System logs activity: "[User] started following this task"]
[Follower count increments: 3 → 4]
    ↓

STEP 5: User Receives Notifications
    ↓
[When task status changes → Email + In-app notification]
[When comment added → Email + In-app notification]
[When file uploaded → Email + In-app notification]
    ↓

STEP 6: User Can Unfollow Anytime
    ↓
[Click "Following" button again]
[Confirmation: "Stop following this task?"]
[On confirm: Remove task_followers record]
[Stop receiving notifications]
```

### Alternative Path: Auto-Follow on Assignment

```
STEP 1: Admin Assigns User to Task
    ↓
[Admin selects user in task assignment dropdown]
[System creates task_assignments record]
    ↓

STEP 2: System Auto-Follows User
    ↓
[System automatically creates task_followers record]
[User doesn't need to manually click "Follow"]
[User starts receiving notifications immediately]
    ↓

STEP 3: User Can Still Unfollow
    ↓
[Even though assigned, user can unfollow]
[This stops notifications but keeps assignment]
[Distinction: Assignment = responsibility, Following = awareness]
```

## State Transition Diagrams

### Task Following Status Flow

```
                 ┌─────────────────┐
                 │  Not Following  │  ← Initial state
                 └────────┬────────┘
                          │
            ┌─────────────┼─────────────┐
            ↓                           ↓
   [User clicks Follow]         [User assigned to task]
            ↓                           ↓
       ┌──────────┐                ┌──────────┐
       │Following │ ←──────────────│Following │
       └────┬─────┘                └────┬─────┘
            │                           │
            │                           │
            └──────────┬────────────────┘
                       ↓
             [User clicks "Unfollow"]
                       ↓
            [Confirmation dialog shown]
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
         [Confirm]          [Cancel]
              ↓                 ↓
     ┌─────────────────┐  [Stays Following]
     │  Not Following  │
     └─────────────────┘

Terminal States:
- Not Following (can re-follow anytime)
- Following (receives notifications)

Special Cases:
- Task deleted → All followers automatically removed
- User removed from project → All follows in that project removed
```

### Notification Flow for Followers

```
Task Event Occurs
    ↓
┌────────────────────────────────────┐
│ System queries task_followers      │
│ for this task_id                   │
└────────────────┬───────────────────┘
                 ↓
     [Gets list of follower user IDs]
                 ↓
     ┌───────────┴───────────┐
     ↓                       ↓
[Create in-app           [Send email to each
 notifications]           follower (batched)]
     ↓                       ↓
[Followers see bell    [Followers receive
 icon notification]     email with task link]
```

## Decision Points

### User: Follow or Ignore?

```
User sees task they're interested in

Option A: Follow Task              Option B: Ignore Task
    ↓                                    ↓
Receive notifications              No notifications
Stay informed on updates           Focus only on assigned tasks
Can filter "My Followed Tasks"     Cleaner task board view
    ↓                                    ↓
[Click "Follow" button]            [Do nothing, browse other tasks]
```

### User: Unfollow or Keep Following?

```
User receives too many notifications

Option A: Unfollow Task            Option B: Keep Following
    ↓                                    ↓
Stop receiving notifications       Continue staying informed
Still see task on task board       Adjust notification settings
Can re-follow anytime              Mute specific notification types
    ↓                                    ↓
[Click "Following" → "Unfollow"]   [Go to Notification Settings]
```

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type | Timing |
|--------------|------------|------------|--------|
| Task status changed | All followers | `task-status-changed` | Immediate |
| New comment added | All followers | `task-comment-added` | Immediate |
| File uploaded to task | All followers | `task-file-uploaded` | Immediate |
| Task priority changed | All followers | `task-priority-changed` | Immediate |
| Task assigned/unassigned | Affected user | `task-assignment-changed` | Immediate |

### In-App Notifications (Automatic)

| Trigger Event | Recipients | Notification Type |
|--------------|------------|-------------------|
| Any task update | All followers | Bell icon notification |
| Task completed | All followers | Success notification |
| Task blocked | All followers | Warning notification |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| User assigned to task | Auto-create task_followers record |
| User unassigned from task | Keep task_followers record (don't auto-unfollow) |
| Task deleted | Delete all task_followers records (CASCADE) |
| User removed from project | Delete all task_followers for that user in that project |
| Task created | Creator auto-follows task |

## Timeline Estimates

### Typical Flow: Follow and Monitor

```
Day 0, 9:00 AM:   User browses task board
Day 0, 9:01 AM:   User clicks "Follow" on interesting task
Day 0, 9:01 AM:   System creates follower record (< 100ms)
Day 0, 9:01 AM:   UI updates to show "Following" (instant)
Day 1, 2:00 PM:   Task status updated by assignee
Day 1, 2:00 PM:   Follower receives email notification (< 1 min)
Day 1, 2:05 PM:   Follower clicks email link, views task update
Day 2, 10:00 AM:  New comment added to task
Day 2, 10:00 AM:  Follower receives notification
                  ↓
Total engagement: 2 notifications over 2 days
```

### Alternative Flow: Assigned and Auto-Followed

```
Day 0, 10:00 AM:  Admin assigns user to task
Day 0, 10:00 AM:  System auto-creates follower record
Day 0, 10:01 AM:  User receives assignment email
Day 0, 11:30 AM:  User logs in, sees notification
Day 0, 3:00 PM:   Status changed, user receives notification
Day 1, 9:00 AM:   Comment added, user receives notification
Day 1, 2:00 PM:   User decides notifications too frequent
Day 1, 2:01 PM:   User clicks "Unfollow"
Day 1, 2:01 PM:   Notifications stop (still assigned to task)
                  ↓
Total: User controlled notification volume
```

## Edge Cases & Error Handling

### Edge Case: User Tries to Follow Task in Project They're Not a Member Of

**Description:** User somehow accesses task URL from different project

**Expected Behavior:**
- API checks `project_team` table
- Returns 403 Forbidden: "You must be a project member to follow tasks"
- Frontend shouldn't allow this (UI hidden for non-members)

**Resolution:** Permission denied at API level

---

### Edge Case: User Follows Task, Then Gets Removed from Project

**Description:** Admin removes user from project after they followed tasks

**Expected Behavior:**
- When user removed from `project_team`
- Trigger cascades: Delete all `task_followers` where user_id = removed user AND task belongs to that project
- User loses access to task immediately
- No more notifications sent

**Resolution:** Database CASCADE on project membership removal

---

### Edge Case: Task Deleted While User is Viewing It

**Description:** Admin deletes task while user has detail page open

**Expected Behavior:**
- DELETE CASCADE removes all `task_followers` records
- If user clicks "Unfollow": API returns 404 Not Found
- Frontend handles gracefully: "This task has been deleted"
- Redirect user back to task board

**Resolution:** Frontend error handling + database CASCADE

---

### Edge Case: Multiple Users Follow Same Task Simultaneously

**Description:** 5 users click "Follow" button at the same exact time

**Expected Behavior:**
- Each API call creates separate `task_followers` record
- Composite UNIQUE constraint prevents duplicates (user_id, task_id)
- Concurrent inserts handled by database
- All 5 users successfully follow
- Follower count increments correctly: 5 → 10

**Resolution:** Database handles concurrency, UNIQUE constraint prevents dupes

---

### Error Case: User Tries to Follow Already-Followed Task

**Description:** Network lag causes user to click "Follow" twice

**Expected Behavior:**
- First request: Creates record, returns 200 OK
- Second request: UNIQUE constraint violation
- API returns 400 Bad Request: "You're already following this task"
- Frontend shows: "You're already following this task"
- Button stays in "Following" state

**Resolution:** Idempotent operation, database constraint prevents duplicates

---

### Error Case: Follower Notification Fails to Send

**Description:** Email service (SES) is down when notification triggered

**Expected Behavior:**
- API logs error but doesn't fail the task update
- In-app notification still created (separate system)
- Retry queue picks up failed emails (3 retries over 1 hour)
- If all retries fail: Admin alerted, email sent manually

**Resolution:** Graceful degradation, notification non-blocking

---

## Permission Guards

### Frontend Guards

```typescript
// Check before showing follow button
if (user.isProjectMember(task.projectId)) {
  const isFollowing = await checkFollowStatus(task.id);
  showFollowButton(isFollowing); // Show "Follow" or "Following"
} else {
  hideFollowButton(); // Not a project member
}
```

### Backend API Guards

```typescript
// POST /api/tasks/:id/follow
if (!user.isProjectMember(task.projectId)) {
  throw new ForbiddenError('Must be project member to follow tasks');
}

// Check if already following
const existingFollow = await db.taskFollowers.findOne({
  userId: user.id,
  taskId: task.id
});

if (existingFollow) {
  throw new BadRequestError('Already following this task');
}
```

## Metrics & Analytics

### Key Metrics to Track

1. **Follow Rate**: % of tasks that have at least 1 follower
2. **Average Followers per Task**: Track engagement (target: 2-4)
3. **Notification Open Rate**: % of follower emails opened
4. **Unfollow Rate**: % of follows that result in unfollow within 7 days
5. **Auto-Follow Retention**: % of auto-followed users who stay following

### Success Criteria

- **> 60% follow rate** - Most tasks have followers
- **2-4 average followers** per task
- **> 40% notification open rate** - Followers engaged
- **< 20% unfollow rate** - Low notification fatigue

---

## Workflow Summary

| Step | Actor | Action | Duration |
|------|-------|--------|----------|
| 1 | User | Browse tasks | Ongoing |
| 2 | User | Click "Follow" button | Instant |
| 3 | System | Create follower record | < 100ms |
| 4 | System | Update UI optimistically | Instant |
| 5 | System | Send confirmation notification | < 1 min |
| 6 | User | Receive task updates | As they occur |
| 7 | User | Click "Unfollow" (optional) | Instant |
| 8 | System | Remove follower record | < 100ms |

**Total Time to Follow:** < 1 second (optimistic UI)
**Total Time to Unfollow:** < 1 second
