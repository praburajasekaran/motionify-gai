# Feedback & Revisions System

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** November 15, 2025

## Overview

This feature manages the complete feedback and revision workflow for Motionify video production projects. It enables clients to provide structured feedback on deliverables, request revisions with context, and track revision quota usage. The system integrates comments on tasks and files, revision request workflows, and quota management to ensure clear communication and scope control.

## Customer Journey Summary

```
Project Active → Client Reviews Beta Deliverable
       ↓
┌──────────────────────────┬──────────────────────────┐
│   Leave Feedback         │   Request Revision       │
│   (Comments on Tasks)    │   (Formal Request)       │
└────────┬─────────────────┴──────────┬───────────────┘
         ↓                            ↓
    Team Reads Comments      Revision Quota Consumed
         ↓                            ↓
    Responds/Updates         Team Makes Changes
         ↓                            ↓
    Client Reviews           Client Reviews Again
         ↓                            ↓
    Approve or More Feedback    Approve or Request More
                                      ↓
                            (If quota exhausted)
                                      ↓
                        Request Additional Revisions
                                      ↓
                            Admin Approves/Declines
```

## Key Benefits

- **Structured Feedback** - Comments on tasks, files, and deliverables with @mentions and threading
- **Revision Quota Management** - Automatic tracking of revision usage (project-level quota)
- **Clear Communication** - Feedback history preserved with timestamps and attribution
- **Scope Control** - Additional revision requests require admin approval when quota exhausted
- **Transparency** - Full audit trail of all feedback, revisions, and quota changes

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- Comment workflow on tasks and files
- Revision request process
- Quota management and tracking
- Additional revision request workflow
- State transition diagrams
- Automation triggers for notifications

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Customer-facing:**
  - Task comment interface
  - File comment interface
  - Revision request modal
  - Revision quota indicator
  - Additional revision request form
- **Admin:**
  - Feedback review dashboard
  - Revision approval interface
  - Quota adjustment controls

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- TaskComment
- FileComment
- RevisionRequest
- AdditionalRevisionRequest
- RevisionQuota
- CommentMention

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `task_comments` - Comments on tasks
- `file_comments` - Comments on files
- `revision_requests` - Formal revision requests with feedback
- `additional_revision_requests` - Requests for extra revisions
- `comment_mentions` - @mention tracking for notifications

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 12 client endpoints (comment CRUD, revision requests, quota viewing)
- 8 admin endpoints (review feedback, approve additional revisions, adjust quotas)
- Webhook endpoints for real-time comment notifications

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 6 customer email templates (comment replies, revision status updates)
- 5 admin notification templates (new feedback, revision requests, quota warnings)

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- Comment workflows (create, edit, delete, mentions)
- Revision request workflows
- Quota management and enforcement
- Additional revision approval workflows
- Permission-based access control

## Technical Requirements

### Frontend
- TaskCommentSection component (with markdown support)
- FileCommentSection component (threaded comments)
- RevisionRequestModal component (with feedback form)
- RevisionQuotaIndicator component (visual quota tracking)
- AdditionalRevisionRequestModal component
- CommentMentionAutocomplete component (@mentions)
- FeedbackHistoryTimeline component (audit trail)

### Backend
- GET `/api/tasks/:id/comments` - List comments on task
- POST `/api/tasks/:id/comments` - Add comment to task
- PATCH `/api/tasks/:id/comments/:commentId` - Edit comment
- DELETE `/api/tasks/:id/comments/:commentId` - Delete comment
- GET `/api/files/:id/comments` - List comments on file
- POST `/api/files/:id/comments` - Add comment to file
- GET `/api/projects/:id/revisions` - Get revision quota status
- POST `/api/deliverables/:id/request-revision` - Request revision
- POST `/api/projects/:id/revisions/request-additional` - Request more revisions
- PATCH `/api/projects/:id/revisions/approve-request` - Admin approves additional revisions
- Comment mention detection and notification dispatch
- Markdown parsing and sanitization

### Infrastructure
- Amazon SES for email notifications
- Real-time WebSocket for live comment updates (optional Phase 3)
- Redis for rate limiting comment creation (anti-spam)

## Implementation Phases

1. **Phase 1: Basic Comments (Week 3-4)**
   - Task comments CRUD operations
   - File comments CRUD operations
   - Markdown support
   - Basic notifications (email only)
   - Comment timestamps and attribution

2. **Phase 2: Advanced Comments & Mentions (Week 4-5)**
   - @mention detection and autocomplete
   - Mention notifications (email + in-app)
   - Comment editing (1-hour window)
   - Comment deletion (own comments only)
   - Comment count badges on tasks/files

3. **Phase 3: Revision Workflow (Week 6-7)**
   - Revision request form (with required feedback)
   - Automatic quota consumption
   - Revision quota indicator on project overview
   - Warning when approaching quota limit
   - Revision history tracking

4. **Phase 4: Additional Revision Requests (Week 7-8)**
   - Additional revision request modal
   - Admin approval/decline workflow
   - Quota adjustment on approval
   - Email notifications for request lifecycle
   - Activity log for quota changes

**Estimated Timeline:** 4-5 weeks (spans Phases 1-4)

## Success Metrics

- **Feedback Quality** - Average comment length and detail level
- **Revision Efficiency** - Average revisions per deliverable (target: ≤2)
- **Quota Utilization** - Percentage of projects that exceed initial revision quota
- **Response Time** - Average time from comment to team response
- **Approval Rate** - Percentage of deliverables approved after first revision

## Integration Points

### With deliverable-approval Feature
- Revision requests tied to specific deliverables
- Revision quota consumed when deliverable rejected
- Feedback from revision request populates task comments
- Deliverable status changes trigger notifications

### With Existing Portal
- Uses existing `projects` table (foreign key: project_id)
- Uses existing `users` table (foreign key: author_id, mentioned_user_id)
- Uses existing `tasks` table (foreign key: task_id for task_comments)
- Uses existing `files` table (foreign key: file_id for file_comments)
- Uses existing `activities` table (new activity types for comments and revisions)
- Uses existing `notifications` table (new notification types)

## Business Rules

1. **Comment Permissions:**
   - Any team member can comment on tasks/files in their projects
   - Users can edit own comments within 1 hour of creation
   - Users can delete own comments at any time
   - Admins can delete any comment (moderation)
   - Deleted comments show "[deleted]" with original metadata

2. **Mention Rules:**
   - Can only @mention users who are members of the project
   - Mentions create notifications (in-app + email)
   - Autocomplete shows active project team members only
   - Multiple mentions in one comment allowed

3. **Revision Quota Rules:**
   - Quota set at project creation (default: 3 revisions)
   - Each deliverable rejection = 1 revision consumed (project-level)
   - Quota shared across all deliverables in project
   - Warning shown when 1 revision remaining
   - Cannot request revision when quota exhausted (must request additional first)

4. **Additional Revision Workflow:**
   ```
   Client requests additional revisions
          ↓
   Admin receives email notification
          ↓
   Admin reviews request and context
          ↓
   ┌──────────────┬──────────────┐
   │   Approve    │   Decline    │
   └──────┬───────┴──────┬───────┘
          ↓              ↓
   Increment quota   Send decline message
          ↓              ↓
   Notify client    Client sees reason
          ↓              ↓
   Client can now  Must approve deliverable
   request revision   as-is or negotiate
   ```

5. **Comment Formatting:**
   - Supports Markdown (bold, italic, lists, code blocks)
   - Links auto-detected and made clickable
   - Max length: 5000 characters
   - Rate limit: 10 comments per minute per user (anti-spam)

## Related Documentation

- `features/deliverable-approval/` - How deliverables are approved/rejected
- `docs/user-stories.md` - US-019 (File Comments), US-020 (Task Comments), US-024 (Revision Tracking), US-028 (Request Revisions), US-029 (Request Additional Revisions)
- `docs/FEATURE_STATUS_MATRIX.md` - Implementation tracking
- `docs/api-documentation.md` - Complete API specifications

## Questions or Feedback?

For questions about this feature specification, contact the product team.
