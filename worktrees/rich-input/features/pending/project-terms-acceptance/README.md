# Project Terms & Acceptance

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** November 13, 2025

## Overview

The **Project Terms & Acceptance** feature ensures that client primary contacts review and formally accept project terms before work begins. This creates clear expectations, protects scope, and establishes an audit trail for all project agreements.

This feature addresses **User Stories US-025 and US-026**, requiring clients to accept terms (scope, deliverables, revisions, timeline, pricing) before accessing the project, with a workflow for requesting term changes.

## Customer Journey Summary

```
Client Login → Review Terms Modal → Accept or Request Changes
                                          ↓
                            ┌─────────────┴──────────────┐
                            ↓                            ↓
                     Terms Accepted              Request Changes
                     Project Unlocked            → Admin Reviews
                                                 → Terms Updated
                                                 → Client Re-Reviews
```

## Key Benefits

- **Clear Expectations** - Clients understand scope, deliverables, revisions, and timeline before work starts
- **Scope Protection** - Formal acceptance creates accountability and reduces scope creep
- **Audit Trail** - Complete history of term versions, acceptances, and change requests with timestamps

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow including:
- Client terms review and acceptance flow
- Client change request workflow
- Admin term update and versioning flow
- State transition diagrams
- Email notification triggers
- Timeline estimates (0-7 days typical)

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all screens:
- **Client-facing:** Terms Review Modal, Accept Confirmation, Request Changes Form
- **Client-facing:** Re-acceptance Required Modal (when terms updated)
- **Admin:** Terms Editor Screen

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- `ProjectTerms` - Terms content, version, status
- `ProjectTermsAcceptance` - Acceptance records with timestamps
- `ProjectTermsRevision` - Change request history
- `TermsStatus` type with 4 states

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `project_terms` - Stores term versions and content
- `project_terms_acceptance` - Tracks who accepted when
- `project_terms_revisions` - Change request history

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 2 client endpoints (get terms, accept/request changes)
- 2 admin endpoints (update terms, respond to requests)

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 2 client email templates
- 2 admin notification templates

### 7. [Test Cases](./07-test-cases.md)
Comprehensive test scenarios covering:
- Terms acceptance flow (5 tests)
- Change request workflow (5 tests)
- Admin updates & versioning (5 tests)
- Access control & blocking (5 tests)
- Edge cases (2 tests)

## Technical Requirements

### Frontend Components
- `<OnboardingAgreement>` - Terms review modal (blocking)
- `<TermsAcceptanceConfirmation>` - Acceptance confirmation dialog
- `<RequestTermsChanges>` - Change request form
- `<ReacceptanceRequired>` - Re-acceptance modal (when terms updated)
- Route guard to block project access until terms accepted

### Backend API Endpoints
- `GET /api/projects/:id/terms` - Fetch current terms
- `POST /api/projects/:id/terms/accept` - Client accepts terms
- `POST /api/projects/:id/terms/request-revision` - Client requests changes
- `PATCH /api/projects/:id/terms` - Admin updates terms (increments version)

### Database Tables
- `project_terms` - Terms content, versioning
- `project_terms_acceptance` - Acceptance audit trail
- `project_terms_revisions` - Change request tracking

### Infrastructure
- Amazon SES - Email notifications
- PostgreSQL - Neon database with versioning support
- JWT authentication - Client primary contact verification

## Implementation Phases

### Phase 1: Database & API (Week 5, Days 1-2)
- Create database tables with versioning
- Implement GET and POST endpoints
- Add permission checks (client primary contact only)
- **Deliverable:** Working API with term storage and acceptance tracking

### Phase 2: Client UI (Week 5, Days 3-4)
- Build terms review modal with blocking behavior
- Create acceptance confirmation dialog
- Implement change request form
- Add route guard to enforce acceptance
- **Deliverable:** Complete client-facing workflow

### Phase 3: Admin Tools & Emails (Week 5, Day 5)
- Build admin terms editor
- Implement term versioning and re-acceptance flow
- Create all email templates (4 total)
- Test full workflow end-to-end
- **Deliverable:** Production-ready feature

**Estimated Timeline:** 5 days (1 week within Phase 3 of main project)

## Success Metrics

- **100% Acceptance Rate** - All client primary contacts must accept terms before accessing projects
- **< 24 Hour Turnaround** - 90% of terms accepted within 24 hours of client login
- **Change Request Volume** - Track % of clients requesting changes (target: < 15%)
- **Zero Access Violations** - No client access to projects without accepted terms
- **Audit Compliance** - Complete audit trail for all term acceptances and changes

## Related Documentation

- [User Stories](../../docs/user-stories.md#us-025-accept-project-terms-client) - US-025, US-026
- [Implementation Plan](../../docs/IMPLEMENTATION_PLAN.md#33-project-terms--deliverable-approval-workflows-critical---new) - Phase 3, Section 3.3
- [API Documentation](../../docs/api-documentation.md) - General API patterns
- [Database Schema](../../database/schema.sql) - Main schema file

## Workflow State Machine

```
┌──────────────────┐
│ pending_review   │  ← Initial state when project created
└────────┬─────────┘
         │
         ├─────────→ Client accepts terms
         │           ↓
         │      ┌──────────┐
         │      │ accepted │  ← Terms accepted, project unlocked
         │      └──────────┘
         │
         └─────────→ Client requests changes
                     ↓
                ┌─────────────────────┐
                │ revision_requested  │  ← Awaiting admin response
                └─────────┬───────────┘
                          │
                          ├─────→ Admin declines → remains revision_requested
                          │
                          └─────→ Admin updates terms
                                  ↓
                            ┌──────────────────┐
                            │ pending_review   │  ← Version incremented, client must re-review
                            │ (version 2)      │
                            └──────────────────┘
```

## Permission Matrix

| Action | Client Primary Contact | Client Team | Motionify PM | Admin |
|--------|----------------------|-------------|--------------|-------|
| View terms | ✅ | ❌* | ✅ | ✅ |
| Accept terms | ✅ | ❌ | ❌ | ❌ |
| Request changes | ✅ | ❌ | ❌ | ❌ |
| Update terms | ❌ | ❌ | ❌ | ✅ |
| View acceptance history | ✅ | ❌ | ✅ | ✅ |

*Client team members cannot access project until primary contact accepts terms

## Questions or Feedback?

For questions about this feature specification, contact the product team.
