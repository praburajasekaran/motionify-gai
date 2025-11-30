# Status Value Mapping Reference

**Date:** November 2024  
**Purpose:** Complete mapping between database status values and user-facing display labels

This document provides the authoritative mapping for all status values across the Motionify Portal system.

---

## 📋 Status Color System

**Display Format:** Color-only badges with hover tooltips  
**Implementation:** No emoji icons in UI - use CSS color indicators

| Color | Hex Code | Usage |
|---|---|---|
| 🟢 Green | `#10B981` | Completed/Approved/Success states |
| 🔵 Blue | `#3B82F6` | In Progress/Processing states |
| 🟡 Yellow/Orange | `#F59E0B` | Awaiting Action/Warning states |
| ⚫ Gray | `#6B7280` | Pending/Not Started/Inactive states |
| 🔴 Red | `#EF4444` | Overdue/Failed/Error states |
| 🔒 Dark Gray | `#4B5563` | Internal Only/Locked states |

**Hover Behavior:** Full status label appears in tooltip on hover

---

## 🎯 Deliverable Statuses

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `not_started` | "NOT STARTED" | Gray | Deliverable not yet begun |
| `in_progress` | "IN PROGRESS" | Blue | Currently being worked on |
| `beta_ready` | "AWAITING YOU" or "READY FOR REVIEW" | Yellow | Beta version ready for client review |
| `awaiting_approval` | "AWAITING APPROVAL" | Yellow | Submitted for client approval |
| `approved` | "APPROVED" | Green | Client has approved deliverable |
| `revision_requested` | "REVISION REQUESTED" | Orange | Client requested changes |
| `final_delivered` | "COMPLETED" or "DELIVERED" | Green | Final deliverable provided |
| `expired` | "EXPIRED" | Gray | Beta access period has ended |
| `locked` | "LOCKED" | Dark Gray | Awaiting payment before access |

**Notes:**
- `beta_ready` displays as "AWAITING YOU" in client view, "READY FOR REVIEW" in team view
- `final_delivered` displays as "COMPLETED" in lists, "DELIVERED" in detail views

---

## ✅ Task Statuses

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `not_started` | "NOT STARTED" | Gray | Task not yet begun |
| `in_progress` | "IN PROGRESS" | Blue | Currently being worked on |
| `blocked` | "BLOCKED" | Orange | Cannot proceed due to dependency |
| `awaiting_review` | "AWAITING REVIEW" | Yellow | Submitted for internal review |
| `awaiting_client` | "AWAITING CLIENT" | Yellow | Waiting for client input/approval |
| `completed` | "COMPLETED" | Green | Task finished |
| `cancelled` | "CANCELLED" | Gray | Task no longer needed |
| `overdue` | "OVERDUE" | Red | Past due date (computed status) |

**Special Cases:**
- `overdue` is a computed status based on due date, not stored in DB
- Overdue tasks also show their underlying status (e.g., "IN PROGRESS • OVERDUE")

**Client Visibility:**
- Clients only see tasks marked as `client_visible: true`
- Internal tasks show 🔒 gray "INTERNAL ONLY" badge

---

## 📁 File Statuses

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `active` | "ACTIVE" | Green | File is current and accessible |
| `archived` | "ARCHIVED" | Gray | File retained but not active |
| `expired` | "EXPIRED" | Gray | Beta access period ended |
| `processing` | "PROCESSING" | Blue | File upload/conversion in progress |
| `failed` | "FAILED" | Red | Upload or processing error |

---

## 💰 Payment Statuses

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `pending` | "PAYMENT REQUIRED" | Orange | Awaiting payment initiation |
| `processing` | "PROCESSING" | Blue | Payment submitted, awaiting confirmation |
| `completed` | "PAID" | Green | Payment successful and confirmed |
| `failed` | "PAYMENT FAILED" | Red | Payment attempt unsuccessful |
| `refunded` | "REFUNDED" | Gray | Payment returned to customer |
| `cancelled` | "CANCELLED" | Gray | Payment cancelled before completion |

---

## 📊 Project Statuses

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `inquiry` | "INQUIRY" | Gray | Initial inquiry received |
| `proposal_sent` | "PROPOSAL SENT" | Yellow | Awaiting proposal response |
| `terms_pending` | "TERMS PENDING" | Yellow | Awaiting terms acceptance |
| `payment_pending` | "PAYMENT PENDING" | Orange | Awaiting advance payment |
| `in_progress` | "IN PROGRESS" | Blue | Active production |
| `on_hold` | "ON HOLD" | Orange | Temporarily paused |
| `completed` | "COMPLETED" | Green | All deliverables approved |
| `delivered` | "DELIVERED" | Green | Final delivery complete |
| `cancelled` | "CANCELLED" | Gray | Project terminated |

**Display Context:**
- Project list: Show status with week indicator (e.g., "IN PROGRESS - Week 3 of 8")
- Project dashboard: Show full status with timeline details

---

## 👥 Team Member Statuses

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `active` | "ACTIVE" | Green | Current team member |
| `invited` | "INVITED" | Yellow | Invitation sent, not yet accepted |
| `inactive` | "INACTIVE" | Gray | Removed from project |
| `expired` | "EXPIRED" | Gray | Invitation expired |

---

## 🔔 Notification Statuses

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `unread` | Bold text | Blue dot | New notification |
| `read` | Normal text | No indicator | Notification viewed |
| `archived` | Hidden | N/A | User dismissed |

**Display:**
- Unread: Blue dot indicator + bold text
- Read: Regular text, no indicator
- Count badge shows unread count only

---

## 🔄 Revision Request Statuses

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `open` | "OPEN" | Orange | Active revision request |
| `in_progress` | "IN PROGRESS" | Blue | Being worked on |
| `resolved` | "RESOLVED" | Green | Changes completed |
| `cancelled` | "CANCELLED" | Gray | Request no longer applicable |

---

## 📝 Inquiry Statuses (Admin)

| Database Value | Display Label | Color | Description |
|---|---|---|---|
| `new` | "NEW" | Red | Just received, unassigned |
| `assigned` | "ASSIGNED" | Yellow | Assigned to team member |
| `in_review` | "IN REVIEW" | Blue | Being evaluated |
| `proposal_sent` | "PROPOSAL SENT" | Green | Proposal created and sent |
| `accepted` | "ACCEPTED" | Green | Customer accepted proposal |
| `rejected` | "REJECTED" | Gray | Customer declined |
| `expired` | "EXPIRED" | Gray | No response within timeframe |

---

## 🎨 Implementation Guidelines

### Frontend Display

```typescript
// Example status badge component usage
<StatusBadge 
  value="in_progress"         // Database value
  type="deliverable"           // Entity type
  showLabel={true}             // Show text label
  showTooltip={true}           // Show full label on hover
/>

// Renders:
// <span class="status-badge status-blue" title="IN PROGRESS">
//   <span class="status-dot"></span>
//   IN PROGRESS
// </span>
```

### CSS Classes

```css
/* Color classes */
.status-green { color: #10B981; }
.status-blue { color: #3B82F6; }
.status-yellow { color: #F59E0B; }
.status-gray { color: #6B7280; }
.status-red { color: #EF4444; }
.status-dark-gray { color: #4B5563; }

/* Dot indicators */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  display: inline-block;
  margin-right: 8px;
}
```

### Database Enum Definitions

```sql
-- Deliverable status enum
CREATE TYPE deliverable_status AS ENUM (
  'not_started',
  'in_progress',
  'beta_ready',
  'awaiting_approval',
  'approved',
  'revision_requested',
  'final_delivered',
  'expired'
);

-- Task status enum
CREATE TYPE task_status AS ENUM (
  'not_started',
  'in_progress',
  'blocked',
  'awaiting_review',
  'awaiting_client',
  'completed',
  'cancelled'
);

-- Add other enums as needed
```

---

## 🔍 Status Transition Rules

### Deliverable Status Flow

```
not_started
  ↓
in_progress
  ↓
beta_ready (admin uploads beta)
  ↓
awaiting_approval (client views beta)
  ├→ approved (client approves)
  │   ↓
  │  final_delivered (admin uploads final)
  │
  └→ revision_requested (client requests changes)
      ↓
     in_progress (back to work)
```

**Special Transitions:**
- `beta_ready` → `expired` (automatic after N days if not viewed)
- `locked` state when payment not completed (applies to entire project)

### Task Status Flow

```
not_started
  ↓
in_progress
  ├→ blocked (dependency issue)
  │   ↓
  │  in_progress (issue resolved)
  │
  ├→ awaiting_review (internal review)
  │   ↓
  │  completed or in_progress (if changes needed)
  │
  ├→ awaiting_client (client input needed)
  │   ↓
  │  in_progress (client responded)
  │
  └→ completed (finished)
```

---

## 📊 Status Filters

### Standard Filter Options

**Deliverables:**
- All Statuses
- In Progress
- Awaiting You (client view: beta_ready + awaiting_approval)
- Completed
- Revision Requested

**Tasks:**
- All Tasks
- Not Started
- In Progress
- Blocked
- Awaiting Review
- Completed

**Projects (Admin):**
- All Projects
- Active (in_progress + payment_pending + terms_pending)
- Awaiting Payment
- Completed
- On Hold

---

## 🔗 Related Documentation

- [WIREFRAME_CONFLICT_ANALYSIS.md](/features/WIREFRAME_CONFLICT_ANALYSIS.md) - Complete design decisions
- [USER_JOURNEY_CONFLICT_ANALYSIS.md](/features/USER_JOURNEY_CONFLICT_ANALYSIS.md) - User flow documentation
- Individual feature wireframes - UI implementation details

---

**Last Updated:** November 2024  
**Maintained By:** Product & Engineering Teams  
**Review Schedule:** Quarterly or when adding new features

