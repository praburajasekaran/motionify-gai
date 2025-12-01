# Notifications System

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** November 17, 2025

## Overview

The **Notifications System** keeps team members informed about project updates through both in-app notifications and email alerts. This real-time communication system ensures users never miss critical project events like task assignments, status changes, mentions, file uploads, and approval requests.

This feature addresses **User Stories US-030, US-031, and US-032**, providing a comprehensive notification infrastructure that supports both immediate in-app alerts and email delivery with customizable preferences.

## Customer Journey Summary

```
Event Occurs → Notification Created → Delivered via In-App + Email
                                               ↓
                                User Opens Portal → Sees Unread Badge
                                User Clicks → Views Notification → Marks Read
                                               ↓
                                User Clicks Link → Navigates to Related Item
```

## Key Benefits

- **Real-Time Awareness** - Stay informed about project updates instantly with in-app notifications and unread badges
- **Reduced Email Overload** - Smart email batching and user preferences prevent notification fatigue
- **Enhanced Collaboration** - @mentions and targeted notifications ensure the right people are alerted at the right time

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- In-app notification delivery and interaction flow
- Email notification triggers and delivery
- Notification preference management
- State transition diagrams for read/unread states
- Timeline estimates (instant to 5 minutes for batched emails)

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **User-facing:** Notification Bell with Badge, Notification Dropdown, Notification History Page
- **User-facing:** Notification Preferences Screen
- **Email:** HTML notification template examples

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- `Notification` - Core notification model with type, content, status
- `NotificationPreference` - User preference settings per category
- `EmailNotificationBatch` - Batched email tracking
- Supporting types: `NotificationType`, `NotificationCategory`, `NotificationStatus`

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `notifications` - Stores all notifications with read status
- `user_notification_preferences` - Per-user, per-category preferences
- `notification_email_queue` - Email delivery queue with batching

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 4 notification endpoints (list, mark read, mark all read, delete)
- 2 preference endpoints (get, update)
- Real-time WebSocket/SSE integration notes

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 6 core email templates (task assignment, mention, status change, file upload, approval request, team change)
- Batched notification digest template
- Email delivery guidelines and spam prevention

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- In-app notification creation and delivery (6 tests)
- Email notification delivery (5 tests)
- Notification preferences (6 tests)
- Real-time updates (5 tests)
- Edge cases and error handling (3 tests)

## Technical Requirements

### Frontend Components
- `<NotificationBell>` - Bell icon with unread count badge (already implemented)
- `<NotificationDropdown>` - Dropdown showing recent notifications
- `<NotificationHistoryPage>` - Full notification history with filtering
- `<NotificationPreferences>` - Settings page for user preferences
- Real-time listener for new notifications (WebSocket/SSE)

### Backend API Endpoints
- `GET /api/notifications` - List notifications with pagination
- `PATCH /api/notifications/:id/read` - Mark single notification as read
- `POST /api/notifications/mark-all-read` - Bulk mark as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/users/me/notification-preferences` - Get preferences
- `PATCH /api/users/me/notification-preferences` - Update preferences

### Database Tables
- `notifications` - Notification records with read status
- `user_notification_preferences` - User preference configuration
- `notification_email_queue` - Email delivery queue

### Infrastructure
- Amazon SES - Email delivery service
- PostgreSQL - Neon database with JSON support for metadata
- WebSocket/SSE - Real-time notification delivery (optional Phase 2)
- Background job processor - For email batching and cleanup

## Implementation Phases

### Phase 1: In-App Notifications (Week 7, Days 1-2)
- Create database schema and notification creation logic
- Build notification API endpoints
- Implement notification dropdown UI
- Add notification creation triggers for all event types
- **Deliverable:** Working in-app notification system

### Phase 2: Email Notifications (Week 7, Days 3-4)
- Create email templates and delivery service
- Implement email batching logic
- Add email queue processing
- Configure Amazon SES integration
- **Deliverable:** Email notifications sent for all events

### Phase 3: Preferences & Polish (Week 7, Day 5 - Week 8, Day 1)
- Build notification preferences UI
- Implement preference filtering logic
- Add notification cleanup job (auto-delete after 90 days)
- Test full notification workflow
- **Deliverable:** Production-ready notification system with preferences

**Estimated Timeline:** 6 days (1.5 weeks within Phase 4 of main project)

## Success Metrics

- **< 2 Second Delivery** - 95% of in-app notifications appear within 2 seconds of event
- **< 5 Minute Email Delivery** - 95% of emails delivered within 5 minutes (for batched notifications)
- **< 10% Opt-Out Rate** - Less than 10% of users disable email notifications
- **> 60% Click-Through Rate** - More than 60% of notification clicks navigate to related item
- **Zero Missed Notifications** - 100% of triggered events create notifications (no data loss)

## Related Documentation

- [User Stories](../../docs/user-stories.md#epic-7-notifications) - US-030, US-031, US-032
- [Implementation Plan](../../docs/IMPLEMENTATION_PLAN.md#42-notification-system) - Phase 4, Section 4.2
- [API Documentation](../../docs/api-documentation.md#notification-endpoints) - Endpoints 27-28
- [Database Schema](../../database/schema.sql) - Main schema file

## Notification Types Matrix

| Notification Type | Triggered By | In-App | Email | Default State |
|------------------|-------------|--------|-------|---------------|
| Task Assigned | Task assignee added | ✅ | ✅ | Enabled |
| Task Status Changed | Task status updated | ✅ | ❌* | Enabled |
| Comment Mention | @mention in comment | ✅ | ✅ | Enabled |
| File Uploaded | New file added to deliverable | ✅ | ❌* | Enabled |
| Approval Request | Deliverable awaiting approval | ✅ | ✅ | Enabled |
| Revision Requested | Client requests revision | ✅ | ✅ | Enabled |
| Team Member Added | User added to project team | ✅ | ✅ | Enabled |
| Team Member Removed | User removed from project | ✅ | ✅ | Enabled |

*Email disabled by default for high-frequency events; users can enable in preferences

## Permission Matrix

| Action | All Users | Client | PM | Admin |
|--------|-----------|--------|-----|-------|
| View own notifications | ✅ | ✅ | ✅ | ✅ |
| Mark own as read | ✅ | ✅ | ✅ | ✅ |
| Delete own notifications | ✅ | ✅ | ✅ | ✅ |
| Update own preferences | ✅ | ✅ | ✅ | ✅ |
| View others' notifications | ❌ | ❌ | ❌ | ❌ |
| Global notification settings | ❌ | ❌ | ❌ | ✅ |

## Questions or Feedback?

For questions about this feature specification, contact the product team.
