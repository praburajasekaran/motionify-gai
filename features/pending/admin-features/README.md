# Admin Features

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** November 17, 2025

## Overview

The **Admin Features** provide Super Admins with essential platform management capabilities including user management, project archival, and activity log export. These administrative tools ensure efficient platform governance, data retention compliance, and comprehensive audit trails.

This feature addresses **User Stories US-033, US-034, and US-035**, enabling super admins to add/manage users, view detailed activity logs with export functionality, and manually update project statuses with proper validation.

## Customer Journey Summary

```
Super Admin Login → Access Admin Dashboard → Manage Users/Projects/Logs
                            ↓
                    ┌───────┴────────┐
                    ↓                ↓
            User Management    Activity Monitoring
            - Add users        - View logs
            - Edit roles       - Export CSV
            - Deactivate       - Filter data
                    ↓
            Project Management
            - Update status
            - Archive projects
```

## Key Benefits

- **Centralized User Management** - Add Motionify team members, assign roles, and deactivate users while preserving historical data
- **Comprehensive Audit Trail** - View and export detailed activity logs for compliance, debugging, and project tracking
- **Project Lifecycle Control** - Manually manage project statuses with validation rules to ensure data integrity

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- User management workflow (add, edit, deactivate)
- Activity log viewing and export flow
- Project status management workflow
- State transition diagrams
- Email notification triggers
- Timeline estimates (instant to 5 minutes)

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Admin:** User Management Dashboard
- **Admin:** Add/Edit User Modal
- **Admin:** Activity Log Viewer with Filters
- **Admin:** Project Status Management Panel

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- `User` - User profile with role and status
- `ActivityLog` - Comprehensive activity tracking
- `ProjectStatus` - Project lifecycle states
- `UserRole` type with 4 roles
- `ActivityType` enumeration

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `users` (enhanced with is_active flag)
- `activities` (comprehensive audit log)
- `sessions` (user session tracking)

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 4 user management endpoints
- 3 activity log endpoints
- 2 project status endpoints

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 3 user management email templates
- 2 project status notification templates

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- User management operations (8 tests)
- Activity log viewing and export (6 tests)
- Project status management (8 tests)
- Permission enforcement (5 tests)
- Edge cases and data retention (5 tests)

## Technical Requirements

### Frontend Components
- `<AdminDashboard>` - Main admin navigation hub
- `<UserManagementTable>` - List all users with filters
- `<AddEditUserModal>` - User creation and editing form
- `<ActivityLogViewer>` - Activity feed with advanced filtering
- `<ProjectStatusPanel>` - Project status editor with validation
- Admin-only route guards

### Backend API Endpoints
- `POST /api/admin/users` - Add new user
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id` - Update user details
- `DELETE /api/admin/users/:id` - Soft delete (deactivate)
- `GET /api/projects/:id/activities` - Get activity logs
- `GET /api/activities/export` - Export logs to CSV
- `PATCH /api/projects/:id/status` - Update project status

### Database Tables
- `users` - Enhanced with `is_active` and `deactivated_at` fields
- `activities` - Comprehensive audit log with JSON details
- `sessions` - User session tracking for security

### Infrastructure
- Amazon SES - Email notifications for user management
- PostgreSQL - Neon database with audit logging
- JWT authentication - Admin role verification
- CSV export - Activity log download functionality

## Implementation Phases

### Phase 1: User Management (Week 3, Days 1-2)
- Enhance users table with soft delete support
- Implement user CRUD API endpoints
- Build user management UI with add/edit/deactivate
- Create welcome email template
- **Deliverable:** Complete user management system

### Phase 2: Activity Logging (Week 3, Days 3-4)
- Create activities table with comprehensive fields
- Implement activity logging utility
- Build activity log viewer UI with filtering
- Add CSV export functionality
- **Deliverable:** Full audit trail system

### Phase 3: Project Status Management (Week 3, Day 5)
- Add status validation logic to API
- Build project status update UI
- Implement status change notifications
- Test all admin workflows end-to-end
- **Deliverable:** Production-ready admin features

**Estimated Timeline:** 5 days (1 week within Phase 2 of main project)

## Success Metrics

- **User Onboarding Time** - < 5 minutes to add a new team member with email sent
- **Activity Log Coverage** - 100% of user actions logged with complete details
- **Export Performance** - CSV export completes in < 10 seconds for 10,000 records
- **Status Change Accuracy** - Zero invalid status transitions allowed
- **Data Retention Compliance** - Deactivated users retain all historical data (100% preservation)

## Related Documentation

- [User Stories](../../docs/user-stories.md#epic-8-system-administration) - US-033, US-034, US-035
- [Implementation Plan](../../docs/IMPLEMENTATION_PLAN.md#21-user-management--team-invitations) - Phase 2, Section 2.1
- [API Documentation](../../docs/api-documentation.md) - General API patterns
- [Database Schema](../../database/schema.sql) - Main schema file

## Permission Matrix

| Action | Super Admin | Project Manager | Client |
|--------|-------------|-----------------|--------|
| Add users | ✅ | ❌ | ❌ |
| Edit user roles | ✅ | ❌ | ❌ |
| Deactivate users | ✅ | ❌ | ❌ |
| View all activity logs | ✅ | ✅* | ❌ |
| Export activity logs | ✅ | ✅* | ❌ |
| Change project status | ✅ | ❌ | ❌ |
| Archive projects | ✅ | ❌ | ❌ |

*Project Managers can only view/export logs for their assigned projects

## User Role Hierarchy

```
┌─────────────────┐
│  Super Admin    │  ← Full platform access (all features)
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌──────────────┐  ┌────────────────┐
│Project       │  │ Team Member    │  ← Limited to assigned tasks
│Manager       │  └────────────────┘
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Client     │  ← Read-only + approvals
└──────────────┘
```

## Data Retention Policy

When a user is **deactivated**:
- ✅ **Preserved:** All tasks created/assigned/completed
- ✅ **Preserved:** All comments with user attribution
- ✅ **Preserved:** All files uploaded with metadata
- ✅ **Preserved:** Complete activity log history
- ✅ **Preserved:** Historical project team membership
- ❌ **Removed:** Active login access
- ❌ **Removed:** Future notifications
- 🔒 **Display:** "Deactivated User" badge on historical items

This ensures compliance with audit requirements while preventing active system access.

## Questions or Feedback?

For questions about this feature specification, contact the product team.
