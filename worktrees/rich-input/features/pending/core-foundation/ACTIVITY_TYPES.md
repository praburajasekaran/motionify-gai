# Activity Types Reference

This document lists all valid `action_type` values for the `activities` table. When adding a new activity type, update this document.

---

## Format

Each activity type follows the pattern: `{entity}_{action}`

**Examples:**
- `user_created` - A user was created
- `task_assigned` - A task was assigned to someone
- `file_uploaded` - A file was uploaded

---

## Complete List by Category

### User Management

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `user_created` | New user account created | user | core-foundation |
| `user_activated` | User account activated | user | admin-features |
| `user_deactivated` | User account deactivated | user | admin-features |
| `user_role_changed` | User role modified | user | admin-features |
| `user_login` | User logged in | user | authentication-system |
| `user_logout` | User logged out | user | authentication-system |
| `password_reset_requested` | User requested password reset | user | authentication-system |
| `password_reset_completed` | Password successfully reset | user | authentication-system |
| `email_verified` | User verified their email | user | authentication-system |

---

### Project Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `project_created` | New project created | project | inquiry-to-project |
| `project_status_changed` | Project status updated | project | admin-features |
| `project_archived` | Project archived | project | admin-features |
| `inquiry_created` | New inquiry submitted | project | inquiry-to-project |
| `proposal_sent` | Proposal sent to customer | project | inquiry-to-project |
| `proposal_accepted` | Customer accepted proposal | project | inquiry-to-project |
| `proposal_rejected` | Customer rejected proposal | project | inquiry-to-project |

---

### Task Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `task_created` | New task created | task | core-task-management |
| `task_updated` | Task details modified | task | core-task-management |
| `task_status_changed` | Task moved to new status | task | core-task-management |
| `task_assigned` | Task assigned to user | task | core-task-management |
| `task_unassigned` | User unassigned from task | task | core-task-management |
| `task_followed` | User started following task | task | core-task-management |
| `task_unfollowed` | User stopped following task | task | core-task-management |
| `task_deleted` | Task soft-deleted | task | core-task-management |
| `task_completed` | Task marked as completed | task | core-task-management |

---

### File Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `file_uploaded` | File uploaded to deliverable | file | file-management |
| `file_downloaded` | File downloaded by user | file | file-management |
| `file_deleted` | File soft-deleted | file | file-management |
| `beta_file_uploaded` | Beta deliverable uploaded | file | deliverable-approval |
| `final_file_uploaded` | Final deliverable uploaded | file | deliverable-approval |

---

### Comment Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `comment_added` | Comment posted | comment | feedback-and-revisions |
| `comment_edited` | Comment text modified | comment | feedback-and-revisions |
| `comment_deleted` | Comment soft-deleted | comment | feedback-and-revisions |
| `comment_mention` | User @ mentioned in comment | comment | feedback-and-revisions |

---

### Team Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `team_member_added` | Member added to project team | team | team-management |
| `team_member_removed` | Member removed from project team | team | team-management |
| `team_member_role_changed` | Member's role updated | team | team-management |
| `team_invitation_sent` | Invitation sent to join team | team | team-management |
| `team_invitation_accepted` | Invitation accepted | team | team-management |
| `team_invitation_declined` | Invitation declined | team | team-management |

---

### Deliverable Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `deliverable_created` | Deliverable added to project | deliverable | core-foundation |
| `deliverable_status_changed` | Deliverable status updated | deliverable | deliverable-approval |
| `deliverable_approved` | Client approved deliverable | deliverable | deliverable-approval |
| `deliverable_rejected` | Client rejected deliverable | deliverable | deliverable-approval |
| `deliverable_revision_requested` | Client requested revisions | deliverable | deliverable-approval |
| `deliverable_beta_uploaded` | Beta version uploaded | deliverable | deliverable-approval |
| `deliverable_final_uploaded` | Final version uploaded | deliverable | deliverable-approval |
| `deliverable_expired` | Access to deliverable expired | deliverable | payment-workflow |

---

### Terms Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `terms_created` | Project terms document created | terms | project-terms-acceptance |
| `terms_accepted` | Client accepted project terms | terms | project-terms-acceptance |
| `terms_rejected` | Client rejected project terms | terms | project-terms-acceptance |
| `terms_revision_requested` | Client requested terms changes | terms | project-terms-acceptance |
| `terms_updated` | Terms document modified | terms | project-terms-acceptance |

---

### Payment Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `payment_initiated` | Payment process started | payment | payment-workflow |
| `payment_completed` | Payment successfully processed | payment | payment-workflow |
| `payment_failed` | Payment attempt failed | payment | payment-workflow |
| `invoice_uploaded` | Invoice PDF uploaded | payment | payment-workflow |
| `invoice_email_sent` | Invoice emailed to client | payment | payment-workflow |
| `payment_reminder_sent` | Payment reminder sent | payment | payment-workflow |

---

### Revision Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `revision_request_created` | Revision requested | revision | feedback-and-revisions |
| `revision_request_approved` | Revision approved by admin | revision | feedback-and-revisions |
| `revision_request_rejected` | Revision rejected by admin | revision | feedback-and-revisions |
| `additional_revision_purchased` | Extra revisions purchased | revision | deliverable-approval |

---

### Notification Actions

| Action Type | Description | Entity Type | Added By Feature |
|------------|-------------|-------------|------------------|
| `notification_sent` | Notification created | notification | notifications-system |
| `notification_read` | Notification marked as read | notification | notifications-system |
| `notification_deleted` | Notification deleted | notification | notifications-system |

---

## Adding New Activity Types

When adding a new activity type:

1. **Follow naming convention:** `{entity}_{action}` (all lowercase, underscores)
2. **Update this document:** Add to appropriate category table
3. **Document in feature:** Mention in feature's API endpoints documentation
4. **Use descriptive names:** Clear, unambiguous action names

**Example:**
```typescript
await prisma.activities.create({
  data: {
    projectId,
    userId,
    actionType: 'deliverable_approved',  // ← Must follow convention
    entityType: 'deliverable',
    entityId: deliverableId,
    description: `${userName} approved ${deliverableName}`,
    details: {
      deliverableName,
      approvalDate: new Date()
    }
  }
});
```

---

## Validation

While there's no database constraint on `action_type`, application code should:

1. **Use constants:** Define action types as constants, not magic strings
2. **TypeScript types:** Create a union type of all valid action types
3. **Runtime validation:** Validate action types before insertion

**Example:**
```typescript
// constants/activityTypes.ts
export const ACTIVITY_TYPES = {
  // User Management
  USER_CREATED: 'user_created',
  USER_ACTIVATED: 'user_activated',
  // ... etc
} as const;

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];

// Usage
import { ACTIVITY_TYPES, ActivityType } from './constants/activityTypes';

function logActivity(actionType: ActivityType, ...) {
  // TypeScript ensures only valid types are passed
}

logActivity(ACTIVITY_TYPES.USER_CREATED, ...);  // ✅ Valid
logActivity('invalid_action', ...);  // ❌ TypeScript error
```

---

## Quick Reference

**Total Activity Types:** 60+

**Most Common:**
- `task_created`, `task_assigned`, `task_status_changed`
- `file_uploaded`, `file_downloaded`
- `comment_added`
- `deliverable_approved`, `deliverable_revision_requested`
- `payment_completed`

**Entity Types:**
- user, project, task, file, comment, deliverable, team, terms, payment, revision, notification

---

**Last Updated:** 2025-11-19
**Maintained By:** Development Team
**Version:** 1.0
