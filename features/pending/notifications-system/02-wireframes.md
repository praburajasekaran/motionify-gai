# ASCII Wireframes: Notifications System

This document contains all user interface wireframes for the feature.

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Notification Bell:** 🔔 appears in all authenticated screen headers (top right)  
**Status Display:** Unread = blue dot + bold text, Read = regular text  
**Modal Close:** `[×]` for all modals  
**Buttons:** Right-aligned with `[Cancel] [Primary]` order  
**Loading States:** `[Spinner]` notation  
**Note:** See NOTIFICATION_AUDIT.md for complete notification triggers

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Table of Contents

### User-Facing Screens
1. [Notification Bell with Badge](#screen-1-notification-bell-with-badge)
2. [Notification Dropdown](#screen-2-notification-dropdown)
3. [Notification History Page](#screen-3-notification-history-page)
4. [Notification Preferences Screen](#screen-4-notification-preferences-screen)

### Email Templates
5. [Email Notification (Single)](#screen-5-email-notification-single)
6. [Email Notification Digest (Batched)](#screen-6-email-notification-digest-batched)

---

## User-Facing Screens

### SCREEN 1: Notification Bell with Badge

**Purpose:** Display unread notification count and provide access to notification dropdown
**Location:** Top navigation bar (right side)
**Authentication:** Required

```
Top Navigation Bar (Right Side)
┌─────────────────────────────────────────────────────────────────────────┐
│  [Motionify Studio Logo]  Projects  Tasks  Files    [Search]    🔔 (4)  [Jane] │
│                                                           ↑                │
│                                                    Notification Bell       │
│                                                    with Unread Badge       │
└─────────────────────────────────────────────────────────────────────────┘

States:
├─ No Unread:  🔔       (bell icon, no badge)
├─ 1-9 Unread: 🔔 (3)   (bell + red badge with number)
├─ 10-99:      🔔 (47)  (bell + badge with number)
└─ 100+:       🔔 (99+) (bell + badge shows "99+")

Hover State:
┌───────────────────┐
│ 🔔 (4)            │  ← Highlighted background
│ Notifications     │  ← Tooltip appears
└───────────────────┘
```

**Visual Design:**
- Icon: Bell (outlined when no unread, solid when unread)
- Badge: Red circle with white text
- Badge position: Top-right of bell icon
- Animation: Subtle bounce when new notification arrives

**User Actions:**
- Click bell → Opens notification dropdown
- Hover bell → Shows "Notifications" tooltip

---

### SCREEN 2: Notification Dropdown

**Purpose:** Display recent notifications and provide quick access to actions
**Triggered by:** Clicking notification bell
**Authentication:** Required

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATIONS                                      [Mark all as read]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  UNREAD (3)                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🎯 You were assigned to 'Create storyboard concepts'            │   │
│  │    by Mike Johnson • Brand Video Campaign                       │   │
│  │    2 minutes ago                                            [×] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 💬 Sarah mentioned you in a comment                             │   │
│  │    "Can you review @JaneDoe?" • Social Media Campaign           │   │
│  │    15 minutes ago                                           [×] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📁 New file uploaded: final-edit-v3.mp4                         │   │
│  │    by Tom Wilson • Brand Video Campaign                         │   │
│  │    1 hour ago                                               [×] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  EARLIER TODAY (2)                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Task status changed: 'Storyboard review' → Completed         │   │
│  │    Brand Video Campaign • 3 hours ago                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 👥 New team member added: David Chen                            │   │
│  │    Brand Video Campaign • 4 hours ago                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│                        [ View All Notifications ]                         │
└─────────────────────────────────────────────────────────────────────────┘
                             ↑
                        Dropdown Width: 420px
                        Max Height: 500px (scrollable)
```

**Visual Design:**
- Unread notifications: Blue left border, white background
- Read notifications: Gray text, lighter background
- Icons: Emoji or icon specific to notification type
- Grouping: "Unread", "Earlier Today", "This Week"
- Hover: Highlight entire notification card

**Validation Rules:**
- Show maximum 10 notifications in dropdown
- Order: Unread first, then by created_at DESC
- If > 10 notifications: Show "View All" link

**User Actions:**
- Click notification → Mark as read, navigate to related item, close dropdown
- Click [×] → Delete notification (with confirmation if unread)
- Click "Mark all as read" → Bulk update all unread to read
- Click "View All Notifications" → Navigate to full history page
- Click outside dropdown → Close dropdown

**API Calls:**
- On open: `GET /api/notifications?limit=10`
- On click notification: `PATCH /api/notifications/:id/read`, then navigate
- On delete: `DELETE /api/notifications/:id`
- On mark all read: `POST /api/notifications/mark-all-read`

---

### SCREEN 3: Notification History Page

**Purpose:** Display full notification history with filtering and search
**Route:** `portal.motionify.studio/notifications`
**Authentication:** Required

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [< Back to Dashboard]                                                    │
│                                                                           │
│  NOTIFICATION HISTORY                                                     │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search notifications...                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Filters:                                                                 │
│  [All Notifications ▾]  [All Projects ▾]  [All Types ▾]  [Unread Only]  │
│                                                                           │
│  Showing 47 notifications                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  TODAY (5)                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🎯 You were assigned to 'Create storyboard concepts'            │   │
│  │    by Mike Johnson • Brand Video Campaign                       │   │
│  │    2 minutes ago                                            [×] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 💬 Sarah mentioned you in a comment                             │   │
│  │    "Can you review @JaneDoe?" • Social Media Campaign           │   │
│  │    15 minutes ago                                           [×] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  [... more notifications ...]                                             │
│                                                                           │
│  YESTERDAY (8)                                                            │
│  [... notifications ...]                                                  │
│                                                                           │
│  THIS WEEK (34)                                                           │
│  [... notifications ...]                                                  │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Showing 1-50 of 47     [< Prev]  [1] 2 3 ...  [Next >]           │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Search: Min 2 characters to trigger search
- Filters: Multiple filters can be combined (AND logic)
- Pagination: 50 notifications per page

**User Actions:**
- Search → Filter notifications by text match (title, message, project name)
- Filter by project → Show only notifications from selected project
- Filter by type → Show only specific notification types (task_assigned, mention, etc.)
- Toggle "Unread Only" → Show only unread notifications
- Click notification → Mark as read and navigate
- Delete notification → Soft delete with confirmation
- Pagination → Load next/previous page

**API Calls:**
- On load: `GET /api/notifications?limit=50&offset=0`
- On filter: `GET /api/notifications?limit=50&offset=0&filter=...`
- On search: `GET /api/notifications?limit=50&offset=0&search=...`

---

### SCREEN 4: Notification Preferences Screen

**Purpose:** Allow users to customize notification delivery preferences
**Route:** `portal.motionify.studio/settings/notifications`
**Authentication:** Required

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [< Back to Settings]                                                     │
│                                                                           │
│  NOTIFICATION PREFERENCES                                                 │
│                                                                           │
│  Choose how you want to receive notifications for different events.      │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  TASK NOTIFICATIONS                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Task Assigned                                                    │   │
│  │ Receive notifications when you are assigned to a task           │   │
│  │                                                                  │   │
│  │   [✓] In-App Notification    [✓] Email Notification            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Task Status Changed                                              │   │
│  │ Notifications when task status updates                          │   │
│  │                                                                  │   │
│  │   [✓] In-App Notification    [  ] Email Notification            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  COMMENT & MENTION NOTIFICATIONS                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Mentions                                                         │   │
│  │ When someone @mentions you in a comment                         │   │
│  │                                                                  │   │
│  │   [✓] In-App Notification    [✓] Email Notification            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  FILE NOTIFICATIONS                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ File Uploaded                                                    │   │
│  │ When new files are uploaded to your projects                    │   │
│  │                                                                  │   │
│  │   [✓] In-App Notification    [  ] Email Notification            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  APPROVAL & REVISION NOTIFICATIONS                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Approval Request                                                 │   │
│  │ When deliverables are awaiting your approval                    │   │
│  │                                                                  │   │
│  │   [✓] In-App Notification    [✓] Email Notification            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Revision Requested                                               │   │
│  │ When clients request revisions (Motionify Studio team only)            │   │
│  │                                                                  │   │
│  │   [✓] In-App Notification    [✓] Email Notification            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  TEAM NOTIFICATIONS                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Team Member Added                                                │   │
│  │ When team members join your projects                            │   │
│  │                                                                  │   │
│  │   [✓] In-App Notification    [✓] Email Notification            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Team Member Removed                                              │   │
│  │ When team members leave your projects                           │   │
│  │                                                                  │   │
│  │   [✓] In-App Notification    [✓] Email Notification            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│                                                                           │
│  NOTIFICATION FREQUENCY                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Email Batching                                                   │   │
│  │ Group multiple notifications into a single email                │   │
│  │                                                                  │   │
│  │   ○ Immediately (send each notification separately)             │   │
│  │   ● Every 5 minutes (recommended)                               │   │
│  │   ○ Hourly digest                                               │   │
│  │   ○ Daily digest                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│                ┌──────────────┐  ┌──────────────┐                        │
│                │    Cancel    │  │  Save Changes│                        │
│                └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- At least one delivery method (in-app or email) must be enabled per category
- Cannot disable both in-app and email for critical notifications (approval requests)
- Changes apply immediately upon save

**User Actions:**
- Toggle in-app checkbox → Enable/disable in-app notifications for category
- Toggle email checkbox → Enable/disable email notifications for category
- Select email frequency → Change batching strategy
- Click "Save Changes" → Update preferences via API
- Click "Cancel" → Discard changes and return to previous page

**API Calls:**
- On load: `GET /api/users/me/notification-preferences`
- On save: `PATCH /api/users/me/notification-preferences`

---

## Email Templates

### SCREEN 5: Email Notification (Single)

**Purpose:** Email notification for individual high-priority events
**Triggered by:** Immediate-send events (task assignment, @mention, approval request)
**Recipient:** Specific user based on event

```
┌─────────────────────────────────────────────────────────────────────────┐
│ From: Motionify Studio Portal <hello@motionify.studio>                          │
│ To: jane.smith@client.com                                                │
│ Subject: [Motionify Studio] You were assigned to a task - Brand Video Campaign  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  [Motionify Studio Logo]                                                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   Hi Jane,                                                                │
│                                                                           │
│   You have a new notification from the Brand Video Campaign project:     │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │  🎯 You were assigned to 'Create storyboard concepts'           │   │
│   │                                                                  │   │
│   │  Assigned by: Mike Johnson                                      │   │
│   │  Project: Brand Video Campaign                                  │   │
│   │  Due Date: January 25, 2025                                     │   │
│   │                                                                  │   │
│   │  Task Description:                                              │   │
│   │  Develop 3 initial storyboard concepts for the promotional      │   │
│   │  video showing different visual directions and styles.          │   │
│   │                                                                  │   │
│   │              ┌──────────────────────────┐                       │   │
│   │              │   View Task in Portal    │                       │   │
│   │              └──────────────────────────┘                       │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   Need to update your notification settings?                             │
│   Manage your preferences in the portal.                                 │
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────  │
│                                                                           │
│   Motionify Studio Portal                                                     │
│   © 2025 Motionify Studio. All rights reserved.                          │
│                                                                           │
│   Unsubscribe from these emails | Update notification preferences        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Email Properties:**
- From: `Motionify Studio Portal <hello@motionify.studio>`
- Reply-To: `noreply@motionify.studio`
- Subject Pattern: `[Motionify Studio] {notification_message} - {project_name}`
- Content-Type: `multipart/alternative` (plain text + HTML)

**Dynamic Variables:**
- `{{user_name}}` - Recipient's first name
- `{{notification_icon}}` - Emoji/icon for notification type
- `{{notification_message}}` - Main notification message
- `{{project_name}}` - Project name
- `{{actor_name}}` - Who triggered the notification
- `{{task_title}}` / `{{file_name}}` / etc. - Context-specific details
- `{{action_url}}` - Deep link to related item in portal
- `{{unsubscribe_url}}` - Link to manage preferences

---

### SCREEN 6: Email Notification Digest (Batched)

**Purpose:** Batched email digest for multiple notifications
**Triggered by:** Email batching job (every 2-5 minutes)
**Recipient:** Users with multiple pending notifications

```
┌─────────────────────────────────────────────────────────────────────────┐
│ From: Motionify Studio Portal <hello@motionify.studio>                          │
│ To: jane.smith@client.com                                                │
│ Subject: [Motionify Studio] You have 3 new notifications - Brand Video Campaign │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  [Motionify Studio Logo]                                                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   Hi Jane,                                                                │
│                                                                           │
│   You have 3 new notifications from your projects:                       │
│                                                                           │
│   ──────────────────────────────────────────────────────────────────    │
│                                                                           │
│   🎯 You were assigned to 'Create storyboard concepts'                   │
│      by Mike Johnson • Brand Video Campaign                              │
│      2 minutes ago                                                        │
│                                                                           │
│      ┌──────────────────┐                                                │
│      │   View Task      │                                                │
│      └──────────────────┘                                                │
│                                                                           │
│   ──────────────────────────────────────────────────────────────────    │
│                                                                           │
│   💬 Sarah mentioned you in a comment                                    │
│      "Can you review @JaneDoe?" • Social Media Campaign                  │
│      15 minutes ago                                                       │
│                                                                           │
│      ┌──────────────────┐                                                │
│      │  View Comment    │                                                │
│      └──────────────────┘                                                │
│                                                                           │
│   ──────────────────────────────────────────────────────────────────    │
│                                                                           │
│   📁 New file uploaded: final-edit-v3.mp4                                │
│      by Tom Wilson • Brand Video Campaign                                │
│      1 hour ago                                                           │
│                                                                           │
│      ┌──────────────────┐                                                │
│      │   View File      │                                                │
│      └──────────────────┘                                                │
│                                                                           │
│   ──────────────────────────────────────────────────────────────────    │
│                                                                           │
│              ┌──────────────────────────────────┐                        │
│              │  View All Notifications in Portal│                        │
│              └──────────────────────────────────┘                        │
│                                                                           │
│   You can manage what types of notifications you receive in your         │
│   notification preferences.                                               │
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────  │
│                                                                           │
│   Motionify Studio Portal                                                     │
│   © 2025 Motionify Studio. All rights reserved.                          │
│                                                                           │
│   Unsubscribe from these emails | Update notification preferences        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Email Properties:**
- From: `Motionify Studio Portal <hello@motionify.studio>`
- Subject Pattern: `[Motionify Studio] You have {count} new notification(s) - {project_name}`
  - If multiple projects: `[Motionify Studio] You have {count} new notifications`
- Batching: Group 2-10 notifications within 2-5 minute window

**Dynamic Variables:**
- `{{user_name}}` - Recipient's first name
- `{{notification_count}}` - Total notifications in digest
- `{{notifications}}` - Array of notification objects
  - Each with: icon, message, project, timestamp, action_url
- `{{view_all_url}}` - Link to notification history page
- `{{preferences_url}}` - Link to notification preferences
- `{{unsubscribe_url}}` - Unsubscribe link

**Batching Logic:**
- Group notifications by recipient
- Wait 2-5 minutes for additional notifications
- Max 10 notifications per email
- If > 10: Send digest of most recent 10, queue remaining for next batch
- High-priority notifications bypass batching
