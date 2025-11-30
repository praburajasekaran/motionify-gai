# Scheduled Jobs Configuration

This document defines all scheduled background jobs for the Motionify Portal. We use **Node-cron** for application-level job scheduling.

---

## Job Scheduling Strategy

### Chosen Approach: Node-cron (Application-Level)

**For MVP**: Simple, reliable, works on all platforms

```typescript
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  // Run job
});
```

**Why Node-cron?**
- ✅ No infrastructure dependencies (unlike Bull/Redis)
- ✅ Works on all Postgres hosts (unlike pg_cron which requires superuser)
- ✅ Simple to configure and monitor
- ✅ Good enough for MVP workload
- ⚠️ Requires app to be running (use PM2/systemd for reliability)

**Future (Production)**: Migrate to Bull/BullMQ + Redis for:
- Better monitoring and retries
- Distributed locking (multiple app instances)
- Persistent job queue
- Advanced scheduling

---

## All Scheduled Jobs

| Job Name | Schedule | Function | Database Feature | Purpose |
|----------|----------|----------|------------------|---------|
| **Cleanup Removed Team Members** | Daily 2:00 AM | `cleanup_removed_team_members()` | team-management | Delete soft-deleted members after 90 days |
| **Cleanup Expired Sessions** | Daily 3:00 AM | `cleanup_expired_sessions()` | authentication-system | Delete expired user sessions |
| **Cleanup Expired Email Verification Tokens** | Weekly Sun 4:00 AM | `cleanup_expired_email_verification_tokens()` | authentication-system | Delete expired email verification tokens |
| **Cleanup Expired Password Reset Tokens** | Weekly Sun 4:10 AM | `cleanup_expired_password_reset_tokens()` | authentication-system | Delete expired password reset tokens |
| **Expire Deliverable Access** | Daily 5:00 AM | `expire_deliverables()` | core-foundation | Mark deliverables as expired after 365 days |
| **Process Email Queue** | Every 1 minute | N/A | notifications-system | Send scheduled notification emails |
| **Check Overdue Payments** | Daily 10:00 AM | N/A | payment-workflow | Send payment reminders |

---

## Implementation

### Directory Structure

```
server/
├── jobs/
│   ├── scheduled.ts          # Main job scheduler
│   ├── cleanup.ts             # Cleanup job functions
│   ├── emailProcessor.ts      # Email queue processor
│   └── paymentChecker.ts      # Payment reminder checker
├── index.ts                   # App entry point
```

### Main Scheduler (server/jobs/scheduled.ts)

```typescript
import cron from 'node-cron';
import { db } from '../db';
import { processEmailQueue } from './emailProcessor';
import { checkOverduePayments } from './paymentChecker';

/**
 * Initialize all scheduled jobs
 * Call this once on application startup
 */
export function initializeScheduledJobs() {
  console.log('[JOBS] Initializing scheduled jobs...');

  // ============================================================================
  // CLEANUP JOBS (Daily/Weekly - Off-Peak Hours)
  // ============================================================================

  // Daily 2:00 AM UTC - Cleanup removed team members (90 day retention)
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[CRON] Running cleanup_removed_team_members...');
      const result = await db.$queryRaw<{ count: number }[]>`
        SELECT cleanup_removed_team_members() as count
      `;
      console.log(`[CRON] Deleted ${result[0]?.count || 0} old team members`);
    } catch (error) {
      console.error('[CRON] cleanup_removed_team_members failed:', error);
    }
  });

  // Daily 3:00 AM UTC - Cleanup expired sessions
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[CRON] Running cleanup_expired_sessions...');
      const result = await db.$queryRaw<{ count: number }[]>`
        SELECT cleanup_expired_sessions() as count
      `;
      console.log(`[CRON] Deleted ${result[0]?.count || 0} expired sessions`);
    } catch (error) {
      console.error('[CRON] cleanup_expired_sessions failed:', error);
    }
  });

  // Weekly Sunday 4:00 AM UTC - Cleanup expired email verification tokens
  cron.schedule('0 4 * * 0', async () => {
    try {
      console.log('[CRON] Running cleanup_expired_email_verification_tokens...');
      const result = await db.$queryRaw<{ count: number }[]>`
        SELECT cleanup_expired_email_verification_tokens() as count
      `;
      console.log(`[CRON] Deleted ${result[0]?.count || 0} expired email tokens`);
    } catch (error) {
      console.error('[CRON] cleanup_expired_email_verification_tokens failed:', error);
    }
  });

  // Weekly Sunday 4:10 AM UTC - Cleanup expired password reset tokens
  cron.schedule('10 4 * * 0', async () => {
    try {
      console.log('[CRON] Running cleanup_expired_password_reset_tokens...');
      const result = await db.$queryRaw<{ count: number }[]>`
        SELECT cleanup_expired_password_reset_tokens() as count
      `;
      console.log(`[CRON] Deleted ${result[0]?.count || 0} expired password reset tokens`);
    } catch (error) {
      console.error('[CRON] cleanup_expired_password_reset_tokens failed:', error);
    }
  });

  // Daily 5:00 AM UTC - Mark deliverables as expired (365 days after delivery)
  cron.schedule('0 5 * * *', async () => {
    try {
      console.log('[CRON] Marking expired deliverables...');

      const result = await db.deliverables.updateMany({
        where: {
          status: { not: 'expired' },
          expiresAt: {
            lte: new Date()
          }
        },
        data: {
          status: 'expired'
        }
      });

      console.log(`[CRON] Marked ${result.count} deliverables as expired`);
    } catch (error) {
      console.error('[CRON] Expire deliverables failed:', error);
    }
  });

  // ============================================================================
  // REAL-TIME PROCESSING JOBS (High Frequency)
  // ============================================================================

  // Every 1 minute - Process email notification queue
  cron.schedule('* * * * *', async () => {
    try {
      const sent = await processEmailQueue();
      if (sent > 0) {
        console.log(`[CRON] Processed ${sent} email batches`);
      }
    } catch (error) {
      console.error('[CRON] Email queue processing failed:', error);
    }
  });

  // ============================================================================
  // BUSINESS LOGIC JOBS (Business Hours)
  // ============================================================================

  // Daily 10:00 AM UTC - Check overdue payments and send reminders
  cron.schedule('0 10 * * *', async () => {
    try {
      console.log('[CRON] Checking overdue payments...');
      const reminded = await checkOverduePayments();
      console.log(`[CRON] Sent ${reminded} payment reminders`);
    } catch (error) {
      console.error('[CRON] Payment check failed:', error);
    }
  });

  console.log('[JOBS] ✓ All scheduled jobs initialized');
  console.log('[JOBS] Active jobs:', cron.getTasks().size);
}

/**
 * Gracefully stop all scheduled jobs
 * Call this on application shutdown
 */
export function stopScheduledJobs() {
  console.log('[JOBS] Stopping all scheduled jobs...');
  const tasks = cron.getTasks();
  tasks.forEach(task => task.stop());
  console.log('[JOBS] ✓ All jobs stopped');
}
```

### Email Queue Processor (server/jobs/emailProcessor.ts)

```typescript
import { db } from '../db';
import { sendBatchedNotificationEmail } from '../emails/notifications';

/**
 * Process pending email batches
 * Runs every minute
 */
export async function processEmailQueue(): Promise<number> {
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
    },
    take: 50 // Process max 50 batches per minute
  });

  let sentCount = 0;

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

      sentCount++;

    } catch (error) {
      console.error(`Failed to send email batch ${batch.id}:`, error);

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

  return sentCount;
}
```

### Payment Reminder Checker (server/jobs/paymentChecker.ts)

```typescript
import { db } from '../db';
import { sendPaymentReminderEmail } from '../emails/payments';

/**
 * Check for overdue payments and send reminders
 * Runs daily at 10 AM
 */
export async function checkOverduePayments(): Promise<number> {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Find projects with unpaid balance for > 3 days
  const overdueProjects = await db.projectPaymentStatus.findMany({
    where: {
      balancePaid: false,
      advancePaid: true,
      advancePaidAt: {
        lte: threeDaysAgo // Advance paid more than 3 days ago
      }
    },
    include: {
      project: {
        include: {
          projectTeam: {
            where: {
              isPrimaryContact: true
            },
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  let remindersSent = 0;

  for (const paymentStatus of overdueProjects) {
    const primaryContact = paymentStatus.project.projectTeam[0]?.user;
    if (!primaryContact) continue;

    // Check if reminder already sent today
    const existingReminder = await db.paymentReminders.findFirst({
      where: {
        projectId: paymentStatus.projectId,
        status: 'SENT',
        sentAt: {
          gte: new Date(now.setHours(0, 0, 0, 0)) // Today
        }
      }
    });

    if (existingReminder) continue; // Already reminded today

    // Create and send reminder
    try {
      const reminder = await db.paymentReminders.create({
        data: {
          projectId: paymentStatus.projectId,
          paymentId: null, // Generic balance reminder
          type: 'BALANCE_DUE',
          status: 'PENDING',
          scheduledFor: now,
          recipientEmail: primaryContact.email,
          recipientUserId: primaryContact.id,
          emailSubject: 'Payment Reminder: Balance Due',
          emailTemplate: 'payment-reminder-balance'
        }
      });

      await sendPaymentReminderEmail(reminder, paymentStatus);

      await db.paymentReminders.update({
        where: { id: reminder.id },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      });

      remindersSent++;

    } catch (error) {
      console.error(`Failed to send reminder for project ${paymentStatus.projectId}:`, error);
    }
  }

  return remindersSent;
}
```

### Application Startup (server/index.ts)

```typescript
import express from 'express';
import { initializeScheduledJobs, stopScheduledJobs } from './jobs/scheduled';

const app = express();
const PORT = process.env.PORT || 3000;

// ... middleware, routes, etc.

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize scheduled jobs
  initializeScheduledJobs();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');

  stopScheduledJobs();

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');

  stopScheduledJobs();

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

---

## Cron Schedule Syntax

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, Sunday = 0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Schedules

| Pattern | Description | Example |
|---------|-------------|---------|
| `* * * * *` | Every minute | Process email queue |
| `0 * * * *` | Every hour | Check something hourly |
| `0 2 * * *` | Daily at 2 AM | Cleanup jobs |
| `0 10 * * 1` | Every Monday 10 AM | Weekly report |
| `0 4 * * 0` | Every Sunday 4 AM | Weekly cleanup |
| `*/5 * * * *` | Every 5 minutes | Frequent checks |
| `0 9-17 * * 1-5` | 9 AM-5 PM on weekdays | Business hours |

---

## Database Cleanup Functions

### Defined in Features

#### team-management/04-database-schema.sql

```sql
-- Function: Cleanup old soft-deleted team members (90 days retention)
CREATE OR REPLACE FUNCTION cleanup_removed_team_members()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM project_team
  WHERE removed_at IS NOT NULL
    AND removed_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

#### authentication-system/04-database-schema.sql

```sql
-- Function: Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup expired email verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_email_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_verification_tokens
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup expired password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Process Management

### Running in Production

**Option 1: PM2 (Recommended)**

```bash
# Install PM2
npm install -g pm2

# Start application with PM2
pm2 start dist/index.js --name motionify-portal

# Enable startup on boot
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs motionify-portal
```

**Option 2: systemd**

```ini
# /etc/systemd/system/motionify-portal.service
[Unit]
Description=Motionify Portal
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/var/www/motionify-portal
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable motionify-portal
sudo systemctl start motionify-portal
sudo journalctl -u motionify-portal -f
```

---

## Monitoring & Logging

### Log Format

```typescript
// Good logging format for jobs
console.log('[CRON] Job started: cleanup_removed_team_members');
console.log('[CRON] ✓ Job completed: Deleted 42 records in 1.2s');
console.error('[CRON] ✗ Job failed: cleanup_expired_sessions -', error);
```

### Monitoring Checklist

- [ ] Jobs are running (check logs daily)
- [ ] No failures in past 24 hours
- [ ] Cleanup jobs deleting expected counts
- [ ] Email queue not backing up (< 100 pending)
- [ ] Payment reminders being sent
- [ ] Process is running (PM2/systemd status)

### Alerts

Set up alerts for:
- Job failures (3+ consecutive failures)
- Email queue backlog (> 1000 pending)
- Cleanup job deleting 0 records for 7 days (might indicate issue)
- Process downtime

---

## Environment Variables

```bash
# .env
NODE_ENV=production

# Job scheduling (optional overrides)
CRON_TIMEZONE=UTC
ENABLE_EMAIL_QUEUE_JOB=true
ENABLE_CLEANUP_JOBS=true
ENABLE_PAYMENT_REMINDERS=true
```

---

## Testing Jobs Manually

### Run Individual Job

```typescript
// server/scripts/run-job.ts
import { db } from '../db';

async function runJob(jobName: string) {
  switch (jobName) {
    case 'cleanup-team-members':
      const result = await db.$queryRaw`SELECT cleanup_removed_team_members()`;
      console.log('Deleted:', result);
      break;

    case 'process-emails':
      const { processEmailQueue } = await import('../jobs/emailProcessor');
      const sent = await processEmailQueue();
      console.log('Sent:', sent);
      break;

    default:
      console.error('Unknown job:', jobName);
  }

  process.exit(0);
}

const jobName = process.argv[2];
runJob(jobName);
```

```bash
# Run manually
npm run job cleanup-team-members
npm run job process-emails
```

---

## FAQ

**Q: What if I have multiple application instances?**
A: Use Bull/BullMQ with Redis for distributed job scheduling. Node-cron will run on each instance (duplicate jobs).

**Q: How do I disable jobs temporarily?**
A: Set environment variable `ENABLE_CLEANUP_JOBS=false` or comment out in code.

**Q: Can I run jobs on different schedule in dev vs prod?**
A: Yes, use environment-based schedules:
```typescript
const schedule = process.env.NODE_ENV === 'production'
  ? '0 2 * * *'  // Production: 2 AM daily
  : '*/5 * * * *'; // Dev: Every 5 minutes
```

**Q: What if a job takes longer than the schedule interval?**
A: Node-cron won't start a new instance until previous completes. But long jobs can block others. Consider separate workers.

**Q: How to test jobs in development?**
A: Use shorter schedules (`*/5 * * * *`) or run manually via script.

---

## Future Improvements (v2)

When migrating to production-grade job queue:

1. **Bull/BullMQ + Redis**
   - Persistent job queue
   - Retries and backoff
   - Job prioritization
   - Better monitoring (Bull Board UI)

2. **Distributed Locking**
   - Prevent duplicate jobs across multiple instances
   - Use Redis locks or database locks

3. **Job History**
   - Store job execution history in database
   - Track success/failure rates
   - Performance metrics

4. **Dynamic Scheduling**
   - User-configurable job times
   - Per-tenant job schedules

---

**Last Updated**: 2025-11-19
**Version**: 1.0
**Status**: Production Ready (MVP)
