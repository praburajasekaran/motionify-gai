# Team Management

> **Version:** 1.0
> **Status:** MVP Development Phase (Critical Enhancement)
> **Last Updated:** November 16, 2025

## Overview

The Team Management system enables secure invitation-based collaboration where client primary contacts can invite team members to projects via email, and administrators can manage team membership with proper access control and data retention. All invitations use token-based security with 7-day expiration, and removed members' historical contributions are preserved while access is immediately revoked.

## Customer Journey Summary

```
Invite → Email Sent → Accept Link → Account Creation → Auto-Added to Project → Collaborate → (Optional) Removal with Data Retention
```

## Key Benefits

- **Secure Invitations** - Token-based email invitations with automatic expiration prevent unauthorized access
- **Role-Based Collaboration** - Clear distinction between Motionify team, client leads, and client team members
- **Data Integrity** - Historical contributions (tasks, comments, files) preserved even after team member removal
- **Access Control** - Immediate access revocation upon removal while maintaining audit trail

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
- **Invite Modal** - Email-based team invitation interface
- **Team Management Page** - List of team members with roles
- **Invitation Acceptance** - Public page for accepting invites
- **Removal Confirmation** - Safety dialogs for member removal

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- `ProjectInvitation` - Invitation with token and expiry
- `ProjectTeamMember` - Team member with role and status
- `InvitationAcceptance` - Acceptance flow data

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `project_invitations` - Pending and accepted invitations
- `project_team` - Team members with soft delete for data retention

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 6 invitation & team management endpoints
- Token-based acceptance flow
- Role-based permission checks

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 4 team-related email templates
- Invitation, acceptance, removal notifications

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- Invitation creation and acceptance (18 cases)
- Team member removal with data retention (12 cases)
- Permission and security checks (8 cases)

## Technical Requirements

### Frontend
- Invite team member modal (US-021)
- Team management page with member list (US-021, US-022)
- Public invitation acceptance page
- Removal confirmation dialogs (US-022)
- ✅ **Existing:** `/src/lib/portal/components/TeamManagement.tsx`
- ✅ **Existing:** `/src/lib/portal/components/InviteModal.tsx` (simplified version)

### Backend
- `POST /api/projects/:id/invitations` - Create invitation
- `GET /api/projects/:id/invitations` - List invitations
- `POST /api/invitations/:token/accept` - Accept invitation (public)
- `DELETE /api/invitations/:id` - Revoke invitation
- `POST /api/invitations/:id/resend` - Resend invitation email
- `DELETE /api/projects/:id/team/:userId` - Remove team member (soft delete)

### Infrastructure
- Amazon SES for invitation emails
- Token generation with crypto.randomBytes
- 7-day invitation expiry (auto-cleanup job)
- Data retention: 90 days for soft-deleted team members

## Implementation Phases

1. **Phase 1 (MVP - Weeks 2-3):** Enhanced Invitation System
   - Token-based email invitations
   - 7-day expiry with validation
   - Accept/resend/revoke flows
   - Auto-add to project on acceptance

2. **Phase 2 (MVP - Week 3):** Team Member Removal
   - Soft delete with data retention
   - Permission checks (can't remove self, last PM, primary contact)
   - Immediate access revocation
   - Removal notifications

3. **Phase 3 (Post-MVP - Week 8):** Advanced Features
   - Role transfer (change primary contact)
   - Bulk invitations
   - Team member activity analytics
   - Invitation templates

**Estimated Timeline:** 2-3 weeks (MVP core), +1 week (enhancements)

## Success Metrics

- **Invitation Acceptance Rate** - >80% of invitations accepted within 7 days
- **Time to Accept** - Median <24 hours from invitation to acceptance
- **Access Revocation** - 100% immediate for removed members
- **Data Integrity** - 0 orphaned records after member removal

## Related Documentation

- [User Stories](/docs/user-stories.md) - US-021 (Invitations), US-022 (Removal)
- [API Documentation](/docs/api-documentation.md) - Team management endpoints
- [User Roles](/docs/user-stories.md#user-roles) - Role permissions matrix
- [Data Retention Policy](/docs/user-stories.md#data-retention-policy) - 90-day retention rules

## Questions or Feedback?

For questions about this feature specification, contact the product team.
