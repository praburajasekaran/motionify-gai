# Inquiry-to-Project Workflow

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** January 11, 2025

## Overview

This feature implements the complete customer acquisition workflow from initial inquiry through project initiation. It replaces manual email-based inquiry handling with an automated, trackable system that guides potential customers from their first contact to becoming active clients with portal access.

## Customer Journey Summary

```
Customer fills quiz → Admin reviews → Creates proposal → Customer negotiates →
Accepts terms → Admin sets project & payment terms → Payment request email sent →
Customer pays → Account created immediately → Project initiated → Portal access
```

## Key Benefits

- **Automated lead capture** - No more missed inquiries from website
- **Structured proposals** - Consistent pricing and scope presentation
- **Negotiation tracking** - Complete history of customer discussions
- **Seamless onboarding** - Automatic account creation and project setup upon payment
- **Flexible payment terms** - Configurable advance payment percentage per project
- **Client self-service** - Customers can review proposals without admin involvement

## Documentation Structure

This feature is documented across multiple files for modularity and ease of review:

### 1. [User Journey](./01-user-journey.md)
Complete workflow from inquiry submission to project access, including:
- 11-step customer journey map
- State transition diagrams for inquiries, proposals, and accounts
- Workflow decision points and automation triggers

### 2. [Wireframes](./02-wireframes.md)
ASCII wireframes for all 16 screens:
- **Customer-facing:** 6 inquiry form screens, proposal review, payment confirmation
- **Admin:** Inquiry dashboard, detail view, proposal builder
- **Portal:** Welcome email, first login, project agreement

### 3. [Data Models](./03-data-models.md)
TypeScript interfaces for:
- `Inquiry` - Lead information and project requirements
- `Proposal` - Pricing, scope, deliverables, and milestones
- `ProposalFeedback` - Customer change requests and negotiation
- `InquiryNote` - Internal admin notes

### 4. [Database Schema](./04-database-schema.sql)
SQL table definitions for:
- `inquiries` table
- `proposals` table with versioning
- `proposal_feedback` table
- `inquiry_notes` table

### 5. [API Endpoints](./05-api-endpoints.md)
REST API specifications:
- 4 public endpoints (inquiry submission, proposal review)
- 9 admin endpoints (inquiry management, proposal creation)
- 1 webhook endpoint (payment confirmation)

### 6. [Email Templates](./06-email-templates.md)
Notification specifications:
- 7 customer email templates
- 6 admin notification templates
- Trigger conditions and personalization variables

### 7. [Test Cases](./07-test-cases.md)
44 comprehensive test scenarios covering:
- Form validation and submission
- Admin inquiry management
- Proposal creation and versioning
- Customer review and negotiation
- Payment and account creation
- Security and permissions

### 8. [Decisions](./DECISIONS.md)
All design decisions have been finalized, including:
- Inquiry form field selections
- Proposal expiration policies (60 days)
- Payment provider configuration (Razorpay)
- Negotiation workflow limits (unlimited rounds)
- Account creation timing (after payment)
- Notification preferences

## Technical Requirements

### Frontend
- Multi-step form component (5 steps)
- Admin inquiry dashboard with filters
- Proposal builder with rich text editor
- Public proposal review page (no login required)
- Integration with existing project portal

### Backend
- 4 new database tables
- 14 new API endpoints
- Amazon SES email integration
- Razorpay webhook handling
- Automatic account provisioning

### Infrastructure
- Database migrations for new tables
- Email templates in Amazon SES
- Razorpay webhook configuration
- Magic link authentication for new customers

## Implementation Phases

1. **Phase 1:** Database & API foundation
2. **Phase 2:** Public inquiry form
3. **Phase 3:** Admin inquiry management
4. **Phase 4:** Proposal builder
5. **Phase 5:** Negotiation workflow
6. **Phase 6:** Payment & conversion
7. **Phase 7:** Customer onboarding
8. **Phase 8:** Email notifications

**Estimated Timeline:** 3-4 weeks

## Success Metrics

- **Inquiry capture rate** - % of website visitors who submit inquiry
- **Proposal acceptance rate** - % of proposals that convert to projects
- **Time to proposal** - Average time from inquiry to proposal sent
- **Negotiation rounds** - Average number of revisions before acceptance
- **Payment conversion** - % of accepted proposals that complete payment
- **Time to project start** - Total time from inquiry to portal access

## Related Documentation

- [Portal Types & Interfaces](../../portal-types.md) - Existing project data models
- [Authentication System](../../authentication-flow.md) - Magic link implementation
- [Amazon SES Setup](../../setup-amazon-ses.md) - Email configuration
- [Neon PostgreSQL Setup](../../setup-neon-postgres.md) - Database configuration

## Questions or Feedback?

For questions about this feature specification, contact the product team or open an issue in the project repository.
