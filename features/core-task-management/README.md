# Core Task Management

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** November 15, 2025

## Overview

This feature provides the core task management system for the Motionify PM Portal. Tasks are the fundamental unit of work organization, allowing Motionify team members to break down project deliverables into actionable items, assign work to team members (both internal and client), track progress through defined workflows, and maintain visibility across the entire team.

Tasks support visibility controls (client-visible vs. internal-only), multi-assignee collaboration, follower notifications, status-driven workflows with state machine validation, and integrated activity logging. This creates a transparent, organized system for managing video production project work.

## Customer Journey Summary

```
Motionify Team Creates Task
    ↓
Links to Project Deliverable
    ↓
Sets Visibility (Client-Visible / Internal-Only)
    ↓
Assigns to Team Member(s)
    ↓
Task Status: Pending → In Progress → Awaiting Approval
    ↓
┌──────────────────┬─────────────────┐
│  Client Approves │ Client Requests │
│                  │    Revision     │
└────────┬─────────┴────────┬────────┘
         ↓                  ↓
    Completed      Revision Requested
         ↓                  ↓
      Done          Back to In Progress
```

## Key Benefits

- **Organized Work Breakdown** - Decompose deliverables into manageable tasks with clear ownership
- **Transparent Collaboration** - Clients can see progress, comment, and approve work in real-time
- **Flexible Assignment** - Assign tasks to multiple team members and follow tasks without assignment
- **State-Driven Workflow** - Enforced status transitions ensure proper approval flows
- **Activity Visibility** - Complete audit trail of task changes, comments, and status updates
- **Smart Notifications** - Assignees and followers receive relevant updates via email and in-app

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- Step-by-step customer journey
- State transition diagrams
- Workflow decision points
- Automation triggers

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Team Portal:**
  - Task list view with filters
  - Create task modal
  - Task detail view
  - Multi-assignee selector
  - Status transition controls
  - Delivery notes editor
  - Follower management
- **Client Portal:**
  - Filtered task list (client-visible only)
  - Task approval interface
  - Revision request form

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- Task (core task entity)
- TaskStatus enum
- TaskVisibility enum
- TaskAssignment (multi-assignee support)
- TaskFollower (notification subscribers)
- TaskComment
- TaskActivity (audit trail)

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `tasks` - Main task records
- `task_assignments` - Multi-assignee relationships
- `task_followers` - Follower relationships
- `task_comments` - Comment threads
- `activities` - Task activity log (shared table)

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 12 task management endpoints
- 4 assignment endpoints
- 3 follower endpoints
- Status transition validation logic

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 5 team email templates (task created, assigned, status changed, approved, revision requested)
- 3 client notification templates (task ready for review, approved confirmation, revision acknowledged)

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- Task creation and validation
- Multi-assignee workflows
- Status transition state machine
- Follower notification system
- Permission controls (client vs team)
- Delivery notes and approval flows

## Technical Requirements

### Frontend
- ✅ `TaskList.tsx` - Main task list with filtering (implemented)
- ✅ `TaskItem.tsx` - Individual task card with status controls (implemented)
- ✅ `taskStateTransitions.ts` - State machine validation (implemented)
- 📋 `CreateTaskModal.tsx` - Task creation form (needs implementation)
- 📋 `TaskDetailView.tsx` - Full task details with comments and activity (needs implementation)
- 📋 `MultiAssigneeSelector.tsx` - Select multiple assignees (needs implementation)
- 📋 `FollowerManagement.tsx` - Follow/unfollow controls (needs implementation)
- 📋 `DeliveryNotesEditor.tsx` - Rich text editor for delivery notes (needs implementation)
- 📋 `TaskApprovalInterface.tsx` - Client approval/rejection UI (needs implementation)

### Backend
- `POST /api/projects/:id/tasks` - Create new task
- `GET /api/projects/:id/tasks` - List tasks with filters
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update task properties
- `PATCH /api/tasks/:id/status` - Change task status (with validation)
- `DELETE /api/tasks/:id` - Delete task (admin only)
- `POST /api/tasks/:id/assign` - Assign task to users
- `DELETE /api/tasks/:id/assign/:userId` - Remove assignee
- `POST /api/tasks/:id/follow` - Follow task
- `DELETE /api/tasks/:id/follow` - Unfollow task
- `GET /api/tasks/:id/followers` - List followers
- `PATCH /api/tasks/:id/delivery-notes` - Update delivery notes
- State machine validation middleware
- Permission checks (team vs client, primary contact)

### Infrastructure
- PostgreSQL database (existing)
- Amazon SES for email notifications (existing)
- Activity logging system (existing)

## Implementation Phases

1. **Phase 1: Core CRUD Operations (Week 3)**
   - Task creation, editing, deletion
   - Link to deliverables
   - Visibility controls (client-visible vs internal)
   - Basic listing and filtering
   - Single assignee support

2. **Phase 2: Multi-Assignee & Followers (Week 4-5)**
   - Multi-assignee assignment system
   - Follower functionality
   - Advanced filtering (My Tasks, Followed Tasks, etc.)
   - Assignee/follower notification system

3. **Phase 3: Status Workflow & Approvals (Week 5-6)**
   - Status transition validation (state machine)
   - Delivery notes feature
   - Client approval interface
   - Revision request workflow
   - Activity logging for all transitions

4. **Phase 4: Polish & Integration (Week 6)**
   - Comment system on tasks
   - Search functionality
   - Deadline management
   - Integration testing with deliverables feature

**Estimated Timeline:** 3-4 weeks

## Success Metrics

- **Task Completion Rate** - Percentage of tasks moved to "Completed" status
- **Average Time to Completion** - Days from task creation to completion
- **Client Approval Rate** - Percentage of tasks approved on first submission (no revisions)
- **Follower Engagement** - Number of users following tasks they're not assigned to
- **Notification Effectiveness** - Open rate of task notification emails

## Integration Points

### With Existing Portal
- Uses existing `projects` table (foreign key: project_id)
- Uses existing `users` table (foreign keys: created_by, assignees, followers)
- Uses existing `deliverables` table (foreign key: deliverable_id)
- Uses existing `activities` table (new activity types for tasks)
- Integrates with existing permission system (roles: super_admin, project_manager, client)

### With Deliverables Feature
- Tasks are always linked to a specific deliverable
- Task progress contributes to deliverable completion percentage
- When deliverable is approved, all associated tasks should be completed

## Business Rules

1. **Task Creation Permissions:**
   - Only Motionify team members (super_admin, project_manager) can create tasks
   - Clients cannot create tasks but can comment and approve

2. **Assignment Rules:**
   - Tasks can have 0 or more assignees
   - Assignees can be any project team member (Motionify or client)
   - Assignees automatically become followers
   - Assignees can remove themselves from tasks

3. **Follower Rules:**
   - Any project team member can follow any task
   - Followers receive notifications for: status changes, new comments, new assignments
   - Followers do not imply responsibility (unlike assignees)

4. **Status Transition Rules:**
   ```
   pending → in_progress (any team member)
   in_progress → awaiting_approval (Motionify team only)
   awaiting_approval → approved (Client Primary Contact only)
   awaiting_approval → revision_requested (Client Primary Contact only)
   revision_requested → in_progress (Motionify team only)
   approved → completed (auto or manual by team)
   completed → in_progress (reopen, admin only)
   ```

5. **Visibility Rules:**
   - "Client-Visible" tasks appear in client portal
   - "Internal-Only" tasks hidden from all client users
   - Motionify team sees all tasks regardless of visibility

6. **Delivery Notes:**
   - Required when transitioning to "awaiting_approval"
   - Included in email notification to client
   - Editable within 1 hour of submission
   - Support markdown formatting

## Related Documentation

- `docs/user-stories.md` - US-009 through US-014 (Epic 3: Task Management)
- `docs/FEATURE_STATUS_MATRIX.md` - Implementation tracking
- `features/deliverable-approval/` - Related approval workflow
- `docs/IMPLEMENTATION_PLAN.md` - Overall project timeline

## Questions or Feedback?

For questions about this feature specification, contact the product team.
