# Task Following System

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** November 13, 2025

## Overview

The **Task Following System** allows team members to stay informed about tasks they're interested in, even when they're not directly assigned. This feature enables collaborative awareness across the team—Motionify members can follow client tasks, clients can follow internal tasks, and anyone can track progress on critical work without cluttering assignments.

This feature implements **User Story US-011** and is critical for MVP collaboration workflows.

## Customer Journey Summary

```
Team Member Browses Tasks
    ↓
Finds Interesting Task
    ↓
Clicks "Follow" Button
    ↓
Receives Notifications for:
  • Status changes
  • New comments
  • File uploads
  • Priority changes
    ↓
Can Unfollow Anytime
```

## Key Benefits

- **Collaborative Awareness** - Stay informed without being assigned
- **Flexible Notifications** - Follow critical tasks, ignore routine ones
- **Separate from Assignment** - Distinction between responsibility and awareness
- **Team Transparency** - See who's following what

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- Following/unfollowing tasks
- Automatic following when assigned
- Notification triggers for followers
- Timeline estimates

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Task Detail Page:** Follow button, follower list
- **Task Board:** Followed tasks filter
- **Notification Settings:** Follow preferences

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- `TaskFollower` - Follower records
- `TaskFollowerNotification` - Notification preferences
- Supporting types and validation

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `task_followers` - Follower relationships
- Indexes for performance

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 3 follower management endpoints
- Permission rules and error handling

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- Follower notification preferences
- Digest email templates

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- Follow/unfollow workflow (5 tests)
- Notification delivery (5 tests)
- Permission checks (5 tests)
- Edge cases (3 tests)

## Technical Requirements

### Frontend Components
- `<FollowButton>` - Toggle follow/unfollow on task detail
- `<FollowersList>` - Show who's following a task
- `<FollowedTasksFilter>` - Filter to show only followed tasks
- Route guard: Check follow status on task load

### Backend API Endpoints
- `POST /api/tasks/:id/follow` - Follow a task
- `DELETE /api/tasks/:id/follow` - Unfollow a task
- `GET /api/tasks/:id/followers` - Get list of followers

### Database Tables
- `task_followers` - Many-to-many relationship (user ↔ task)

### Infrastructure
- Amazon SES - Email notifications to followers
- PostgreSQL - Neon database with composite indexes
- Real-time updates - Optional WebSocket for live follower count

## Implementation Phases

### Phase 1: Database & API (Week 5, Days 1-2)
- Create `task_followers` table
- Implement follow/unfollow endpoints
- Add permission checks (project member only)
- **Deliverable:** Working API with follower management

### Phase 2: Frontend UI (Week 5, Days 3-4)
- Build follow button component
- Create follower list display
- Add "Followed Tasks" filter to task board
- Implement optimistic UI updates
- **Deliverable:** Complete user interface

### Phase 3: Notifications & Testing (Week 5, Day 5)
- Integrate with notification system
- Send emails to followers on task updates
- Add notification preferences
- Test full workflow end-to-end
- **Deliverable:** Production-ready feature

**Estimated Timeline:** 5 days (1 week within Phase 1 of main project)

## Success Metrics

- **Adoption Rate** - % of active users who follow at least 1 task
- **Average Follows per User** - Track engagement (target: 3-5 tasks)
- **Notification Engagement** - % of follower notifications opened/clicked
- **Unfollow Rate** - Track if users unfollow due to noise (target: < 20%)

## Related Documentation

- [User Stories](../../docs/user-stories.md#us-011-followunfollow-task) - US-011
- [Implementation Plan](../../docs/IMPLEMENTATION_PLAN.md#task-following-system) - Phase 1, Task Management
- [API Documentation](../../docs/api-documentation.md) - General API patterns
- [Task Management System](../task-management/) - Related feature

## Relationship to Other Features

### Dependencies
- **Task Management** - Must have tasks before following them
- **User Authentication** - JWT-based auth required
- **Notification System** - Integrates with US-030, US-031

### Integration Points
- **Task Comments (US-020)** - Followers notified of new comments
- **File Uploads (US-015, US-016)** - Followers notified of file activity
- **Task Status Updates (US-012)** - Followers notified of status changes

## Permission Matrix

| Action | Motionify Admin | Motionify PM | Client Primary | Client Team | Non-Member |
|--------|----------------|--------------|----------------|-------------|------------|
| Follow task | ✅ | ✅ | ✅ | ✅ | ❌ |
| Unfollow task | ✅ | ✅ | ✅ | ✅ | ❌ |
| View followers | ✅ | ✅ | ✅ | ✅ | ❌ |
| Auto-follow when assigned | ✅ | ✅ | ✅ | ✅ | N/A |

**Rule:** Can only follow tasks in projects you're a member of

## Workflow State Machine

```
┌──────────────────┐
│   Not Following  │  ← Initial state (for any task)
└────────┬─────────┘
         │
         ├──────→ User clicks "Follow"
         │        ↓
         │   ┌──────────┐
         │   │Following │  ← Receiving notifications
         │   └────┬─────┘
         │        │
         │        ├──────→ User clicks "Unfollow"
         │        │        ↓
         │        │   [Returns to Not Following]
         │        │
         │        └──────→ User assigned to task
         │                 ↓
         │            [Auto-follows, status: Following]
         │
         └──────→ Task deleted
                  ↓
             [Follower record deleted]
```

## Questions or Feedback?

For questions about this feature specification, contact the product team or refer to the user stories document.
