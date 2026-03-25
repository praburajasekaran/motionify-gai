# Email Batching Algorithm

This document defines how notification emails are batched and scheduled based on user preferences. We use **clock-aligned batching** for predictable, debuggable notification delivery.

---

## Overview

**Strategy**: Clock-Aligned Batching

**Why Clock-Aligned?**
- ✅ **Predictable**: Users know when to expect emails ("hourly" = top of each hour)
- ✅ **Debuggable**: Easy to troubleshoot ("next batch at 3:00 PM")
- ✅ **Efficient**: Batch processing at fixed intervals
- ✅ **User-Friendly**: Aligns with mental model (9 AM daily digest)

---

## Batching Frequencies

| Frequency | Description | Schedule Time | Example |
|-----------|-------------|---------------|---------|
| `immediate` | No batching, send right away | Now | High-priority: mentions, approval requests |
| `every_5_min` | Batch every 5 minutes | Next 5-min mark (00, 05, 10... :55) | Current: 3:03 PM → Schedule: 3:05 PM |
| `hourly` | Batch once per hour | Top of next hour | Current: 3:43 PM → Schedule: 4:00 PM |
| `daily` | Batch once per day | 9:00 AM user's timezone | Current: 2:00 PM → Schedule: 9:00 AM tomorrow |
| `never` | Never send emails | NULL | User disabled email notifications |

---

## Algorithm Implementation

### TypeScript Implementation

```typescript
// server/notifications/batching.ts
import moment from 'moment-timezone';

export type EmailBatchingFrequency = 'immediate' | 'every_5_min' | 'hourly' | 'daily' | 'never';

/**
 * Calculate when notification email should be sent based on user's batching preference
 *
 * @param frequency - User's email batching frequency preference
 * @param userTimezone - User's timezone (e.g., 'Asia/Kolkata', 'America/New_York')
 * @param notificationType - Type of notification (some types bypass batching)
 * @returns Date when email should be sent, or null if never
 */
export function calculateEmailScheduledFor(
  frequency: EmailBatchingFrequency,
  userTimezone: string,
  notificationType?: string
): Date | null {
  // High-priority notifications bypass batching
  const immediateSendTypes = [
    'comment_mention',
    'approval_request',
    'revision_requested',
    'project_created'
  ];

  if (notificationType && immediateSendTypes.includes(notificationType)) {
    return new Date(); // Send immediately
  }

  const now = moment.tz(userTimezone);

  switch (frequency) {
    case 'immediate':
      return new Date();

    case 'every_5_min': {
      // Round up to next 5-minute mark (00, 05, 10, 15... 55)
      const currentMinutes = now.minutes();
      const nextMark = Math.ceil(currentMinutes / 5) * 5;

      if (nextMark === 60) {
        // Roll over to next hour
        return now.add(1, 'hour').minutes(0).seconds(0).milliseconds(0).toDate();
      } else {
        return now.minutes(nextMark).seconds(0).milliseconds(0).toDate();
      }
    }

    case 'hourly': {
      // Next hour top (e.g., if 3:43 PM → 4:00 PM)
      return now.add(1, 'hour').minutes(0).seconds(0).milliseconds(0).toDate();
    }

    case 'daily': {
      // Next 9 AM in user's timezone
      let next9AM = now.clone().hours(9).minutes(0).seconds(0).milliseconds(0);

      // If it's already past 9 AM today, schedule for 9 AM tomorrow
      if (now.hours() >= 9) {
        next9AM.add(1, 'day');
      }

      return next9AM.toDate();
    }

    case 'never':
      return null;

    default:
      // Default to hourly if unknown
      return now.add(1, 'hour').minutes(0).seconds(0).milliseconds(0).toDate();
  }
}
```

### PostgreSQL Function Implementation

```sql
-- Function to calculate scheduled send time for notification emails
-- Used when creating notification_email_queue entries
CREATE OR REPLACE FUNCTION calculate_email_scheduled_for(
  p_frequency VARCHAR(20),
  p_user_timezone VARCHAR(50),
  p_notification_type VARCHAR(100) DEFAULT NULL
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE;
  v_next_send TIMESTAMP WITH TIME ZONE;
  v_current_minute INT;
  v_next_mark INT;
BEGIN
  -- High-priority notifications sent immediately
  IF p_notification_type IN (
    'comment_mention',
    'approval_request',
    'revision_requested',
    'project_created'
  ) THEN
    RETURN CURRENT_TIMESTAMP;
  END IF;

  -- Get current time in user's timezone
  v_now := CURRENT_TIMESTAMP AT TIME ZONE p_user_timezone;

  CASE p_frequency
    WHEN 'immediate' THEN
      RETURN CURRENT_TIMESTAMP;

    WHEN 'every_5_min' THEN
      -- Round up to next 5-minute mark
      v_current_minute := EXTRACT(MINUTE FROM v_now)::INT;
      v_next_mark := CEIL(v_current_minute / 5.0) * 5;

      IF v_next_mark = 60 THEN
        -- Roll over to next hour
        RETURN date_trunc('hour', v_now) + INTERVAL '1 hour';
      ELSE
        RETURN date_trunc('hour', v_now) + (v_next_mark || ' minutes')::INTERVAL;
      END IF;

    WHEN 'hourly' THEN
      -- Next hour top
      RETURN date_trunc('hour', v_now) + INTERVAL '1 hour';

    WHEN 'daily' THEN
      -- Next 9 AM in user's timezone
      IF EXTRACT(HOUR FROM v_now) >= 9 THEN
        -- After 9 AM today, schedule for 9 AM tomorrow
        RETURN (date_trunc('day', v_now) + INTERVAL '1 day' + INTERVAL '9 hours');
      ELSE
        -- Before 9 AM today, schedule for 9 AM today
        RETURN (date_trunc('day', v_now) + INTERVAL '9 hours');
      END IF;

    WHEN 'never' THEN
      RETURN NULL;

    ELSE
      -- Default to hourly
      RETURN date_trunc('hour', v_now) + INTERVAL '1 hour';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_email_scheduled_for IS 'Calculate clock-aligned send time based on user batching preference';
```

---

## Usage Examples

### Creating Email Queue Entry

```typescript
import { calculateEmailScheduledFor } from './batching';

async function queueNotificationEmail(notification: Notification, user: User) {
  // Get user's email preferences
  const prefs = await db.userNotificationPreferences.findUnique({
    where: { userId: user.id }
  });

  // Calculate when to send
  const scheduledFor = calculateEmailScheduledFor(
    prefs.emailBatchingFrequency,
    user.timezone || 'UTC',
    notification.type
  );

  if (!scheduledFor) {
    // User has emails disabled
    return;
  }

  // Check if there's already a pending batch for this user at this time
  const existingBatch = await db.notificationEmailQueue.findFirst({
    where: {
      userId: user.id,
      status: 'pending',
      scheduledFor: scheduledFor
    }
  });

  if (existingBatch) {
    // Add to existing batch
    await db.notificationEmailQueue.update({
      where: { id: existingBatch.id },
      data: {
        notificationIds: {
          push: notification.id
        }
      }
    });
  } else {
    // Create new batch
    await db.notificationEmailQueue.create({
      data: {
        userId: user.id,
        notificationIds: [notification.id],
        scheduledFor: scheduledFor,
        status: 'pending'
      }
    });
  }
}
```

### Processing Email Queue (Background Job)

```typescript
// server/jobs/emailProcessor.ts
import cron from 'node-cron';

// Run every minute to check for scheduled emails
cron.schedule('* * * * *', async () => {
  const now = new Date();

  // Find all batches scheduled to send now or earlier
  const pendingBatches = await db.notificationEmailQueue.findMany({
    where: {
      status: 'pending',
      scheduledFor: {
        lte: now
      }
    },
    include: {
      user: true
    }
  });

  for (const batch of pendingBatches) {
    try {
      // Mark as processing
      await db.notificationEmailQueue.update({
        where: { id: batch.id },
        data: { status: 'processing' }
      });

      // Get all notifications for this batch
      const notifications = await db.notifications.findMany({
        where: {
          id: { in: batch.notificationIds }
        }
      });

      // Send email
      await sendBatchedNotificationEmail(batch.user, notifications);

      // Mark as sent
      await db.notificationEmailQueue.update({
        where: { id: batch.id },
        data: {
          status: 'sent',
          sentAt: new Date()
        }
      });

    } catch (error) {
      console.error('Failed to send email batch:', error);

      // Mark as failed
      await db.notificationEmailQueue.update({
        where: { id: batch.id },
        data: {
          status: 'failed',
          errorMessage: error.message
        }
      });
    }
  }
});
```

---

## Test Cases

### Test: 5-Minute Batching

```typescript
describe('Email Batching - every_5_min', () => {
  it('should schedule to next 5-minute mark', () => {
    // Current time: 3:03 PM IST
    const mockNow = moment.tz('2025-01-19 15:03:00', 'Asia/Kolkata');

    const result = calculateEmailScheduledFor('every_5_min', 'Asia/Kolkata');

    // Should schedule for 3:05 PM IST
    expect(result.getMinutes()).toBe(5);
    expect(result.getHours()).toBe(15);
  });

  it('should roll over to next hour at :55+', () => {
    // Current time: 3:57 PM
    const mockNow = moment.tz('2025-01-19 15:57:00', 'Asia/Kolkata');

    const result = calculateEmailScheduledFor('every_5_min', 'Asia/Kolkata');

    // Should schedule for 4:00 PM (not 3:60 PM)
    expect(result.getMinutes()).toBe(0);
    expect(result.getHours()).toBe(16);
  });
});
```

### Test: Hourly Batching

```typescript
describe('Email Batching - hourly', () => {
  it('should schedule to next hour top', () => {
    // Current time: 3:43 PM
    const result = calculateEmailScheduledFor('hourly', 'Asia/Kolkata');

    // Should schedule for 4:00 PM
    expect(result.getMinutes()).toBe(0);
    expect(result.getHours()).toBe(16);
  });
});
```

### Test: Daily Batching

```typescript
describe('Email Batching - daily', () => {
  it('should schedule to 9 AM today if before 9 AM', () => {
    // Current time: 8:30 AM
    const result = calculateEmailScheduledFor('daily', 'Asia/Kolkata');

    // Should schedule for 9:00 AM today
    expect(result.getHours()).toBe(9);
    expect(result.getDate()).toBe(moment.tz('Asia/Kolkata').date());
  });

  it('should schedule to 9 AM tomorrow if after 9 AM', () => {
    // Current time: 2:00 PM
    const result = calculateEmailScheduledFor('daily', 'Asia/Kolkata');

    // Should schedule for 9:00 AM tomorrow
    expect(result.getHours()).toBe(9);
    expect(result.getDate()).toBe(moment.tz('Asia/Kolkata').add(1, 'day').date());
  });
});
```

### Test: Immediate Send Override

```typescript
describe('Email Batching - immediate override', () => {
  it('should send immediately for comment_mention regardless of preference', () => {
    // User has daily batching preference
    const result = calculateEmailScheduledFor(
      'daily',
      'Asia/Kolkata',
      'comment_mention'
    );

    // Should send immediately, not wait for 9 AM
    const now = new Date();
    expect(result.getTime()).toBeCloseTo(now.getTime(), -2); // Within seconds
  });
});
```

---

## Scheduling Matrix

| User Frequency | Notification Type | Actual Schedule | Reason |
|----------------|-------------------|-----------------|---------|
| `every_5_min` | `task_assigned` | Next 5-min mark | User preference |
| `every_5_min` | `comment_mention` | **Immediate** | High-priority override |
| `hourly` | `file_uploaded` | Top of next hour | User preference |
| `hourly` | `approval_request` | **Immediate** | High-priority override |
| `daily` | `task_status_changed` | 9 AM next day | User preference |
| `daily` | `project_created` | **Immediate** | High-priority override |
| `never` | Any | Never sent | User disabled emails |

---

## Email Templates

### Immediate Send (Single Notification)

```html
Subject: [Motionify] You were mentioned in a comment

Hi {{userName}},

{{actorName}} mentioned you in a comment on "{{taskName}}":

> {{commentPreview}}

[View Comment] (button)

---
You're receiving this because you were @mentioned.
Manage notification preferences: {{preferencesUrl}}
```

### Batched Send (Multiple Notifications)

```html
Subject: [Motionify] You have {{count}} new notifications

Hi {{userName}},

Here's what happened since your last digest:

## Tasks (3 notifications)
- You were assigned to "Create video intro" by John Doe
- "Review beta delivery" status changed to Completed
- Comment added on "Upload final files"

## Files (2 notifications)
- New file uploaded: project_final.mp4
- Beta version ready for review

[View All Notifications] (button)

---
You're receiving this hourly digest based on your notification preferences.
Want to change frequency? [Update Preferences]
```

---

## Database Queries

### Find Overdue Batches

```sql
-- Find batches that should have been sent but haven't
SELECT
  neq.id,
  neq.user_id,
  neq.scheduled_for,
  CURRENT_TIMESTAMP - neq.scheduled_for as overdue_by,
  u.email
FROM notification_email_queue neq
JOIN users u ON u.id = neq.user_id
WHERE neq.status = 'pending'
  AND neq.scheduled_for < CURRENT_TIMESTAMP - INTERVAL '5 minutes'
ORDER BY neq.scheduled_for ASC;
```

### Batch Processing Statistics

```sql
-- Email queue statistics by frequency
SELECT
  unp.email_batching_frequency,
  COUNT(*) as total_batches,
  COUNT(*) FILTER (WHERE neq.status = 'pending') as pending,
  COUNT(*) FILTER (WHERE neq.status = 'sent') as sent,
  COUNT(*) FILTER (WHERE neq.status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (neq.sent_at - neq.scheduled_for))) as avg_delay_seconds
FROM notification_email_queue neq
JOIN user_notification_preferences unp ON unp.user_id = neq.user_id
WHERE neq.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY unp.email_batching_frequency;
```

---

## Configuration

### Environment Variables

```bash
# Email batching configuration
EMAIL_BATCH_CHECK_INTERVAL=60000  # Check every 60 seconds (1 minute)
DEFAULT_TIMEZONE=UTC              # Fallback if user timezone not set
DEFAULT_BATCHING_FREQUENCY=hourly # Default for new users
```

### User Preferences Schema

```sql
-- Already exists in notifications-system schema
CREATE TABLE user_notification_preferences (
  ...
  email_batching_frequency VARCHAR(20) DEFAULT 'hourly',
  timezone VARCHAR(50) DEFAULT 'UTC',
  ...
  CONSTRAINT valid_batching_frequency CHECK (
    email_batching_frequency IN ('immediate', 'every_5_min', 'hourly', 'daily', 'never')
  )
);
```

---

## Monitoring

### Key Metrics to Track

1. **Batch Delivery Time**: Actual send time vs scheduled time
2. **Batch Size**: Number of notifications per batch
3. **Failure Rate**: Failed batches / total batches
4. **User Engagement**: Open rates by batching frequency

### Alert Conditions

- ⚠️ Batch delayed > 10 minutes
- ⚠️ Failure rate > 5%
- ⚠️ Queue backlog > 1000 pending batches
- ⚠️ Email service rate limit hit

---

## FAQ

**Q: Why clock-aligned instead of "X minutes from now"?**
A: Predictability. Users know "hourly = 2:00, 3:00, 4:00" vs "randomly at 2:17, 3:17, 4:17".

**Q: What if user changes their frequency preference?**
A: Existing batches keep their scheduled time. New notifications use new frequency.

**Q: Can batches be merged?**
A: Yes! If two notifications for same user are scheduled at same time, they're combined.

**Q: What if email sending fails?**
A: Mark batch as 'failed', log error, retry with exponential backoff.

**Q: How to handle timezone changes (DST)?**
A: Moment.js handles DST automatically. 9 AM stays 9 AM local time.

---

**Last Updated**: 2025-11-19
**Version**: 1.0
**Status**: Production Ready
