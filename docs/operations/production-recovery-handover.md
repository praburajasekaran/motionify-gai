# Production recovery handover

This document records the recovery dependencies for Motionify Studio. It does not contain credentials. The recovery owner and the location of each recovery credential must be confirmed outside this public repository.

## Current coverage

| Asset | Current recovery evidence | Remaining work |
| --- | --- | --- |
| PostgreSQL data and schema | Encrypted daily R2 backups and a successful isolated restore drill. See [Database backup and recovery](database-backup-recovery.md). | Repeat the drill at least quarterly. Keep the decryption key and its recovery copy accessible to the designated owner. |
| Project and uploaded files | The private production R2 bucket contains `projects/` and `uploads/`. Its lifecycle rule deletes objects after 365 days. The separate recovery bucket has enabled 395-day lifecycle and lock rules. A supervised backup verified 87 files, and two samples passed local and test-bucket restore checks on 29 October 2026. | Set up and verify scheduled backups, alerts, a full restore, and an end-to-end drill. The database backup does not include file bytes. |
| Application code and deployment | The Git repository and Netlify deploys provide code and deployment history. | Confirm the owner can access both accounts and republish a known-good release. |
| Provider settings and credentials | Production settings exist in provider accounts. Netlify stores production and Deploy Preview values in separate contexts. | Record the configuration and secure recovery access to credentials. Test access without publishing secrets. |

The source bucket deletes project files after 365 days. The recovery owner approved a 395-day lifecycle and lock for recovery copies. A recovery copy can therefore outlive its source file. Check the source file's intended expiry before restoring it to the production bucket. Cloudflare deletes expired objects asynchronously, so deletion can occur after the configured 395 days.

The file-backup script and workflow are drafts. Do not enable or rely on them until the Cloudflare and restore checks below pass. An empty recovery bucket and a configured lifecycle rule are not a backup.

The current draft assigns each file version a recovery key for a 30-day generation and uses conditional writes so it cannot overwrite an existing version. It verifies stored bytes when it reuses a version. It requires every referenced object to have at least 365 days of remaining retention at snapshot start. A 395-day lifecycle and a 395-day bucket lock are required. The lock protects copies from deletion and overwrite. The lifecycle removes them after the lock expires. A file copy can outlive its last snapshot reference by up to 395 days. Prabu approved this retention on 29 October 2026. A single encrypted file larger than 5 GiB is rejected until a safe conditional multipart upload is implemented.

The draft publishes a completion marker after verifying the encrypted manifest. Restore requires that marker and checks the manifest hash before decrypting it. A run that stops earlier must not be treated as a completed snapshot. Run identifiers must be unique.

A write-capable recovery credential can overwrite copies. The recovery bucket is in the source bucket's Cloudflare account and does not protect against losing that account. The source listing and individual file checks do not provide an atomic point-in-time snapshot across the whole bucket. A database restore and file restore can therefore represent different times.

On 29 October 2026, the immutable draft backed up a synthetic encrypted file twice to the recovery bucket and restored it to an isolated local directory. The restored bytes and content type matched. R2 rejected overwrite and delete attempts with `ObjectLockedByBucketPolicy`. Five synthetic objects remain locked until expiry. No production project files were copied during that test. Separate source and recovery credentials were tested for bucket isolation.

Cloudflare bucket locks prevent both deletion and overwriting. A fixed 365-day lock does not protect a shared copy for 365 days after a later snapshot references it. The recovery bucket has enabled 395-day lock and lifecycle rules. A synthetic test confirmed that Cloudflare rejects attempts to overwrite and delete a locked copy. Five small synthetic objects remain locked until their lifecycle expires.

The first supervised production backup on 29 October 2026 verified 87 encrypted objects. Two small files, one from each source prefix, were restored locally and to a unique prefix in the private readiness-test bucket. Their bytes, content type, cache control, content disposition, content encoding, content language, and user metadata matched. The object expiry metadata was not checked in the test bucket. The owner approved use of the test bucket, whose credentials also serve Deploy Previews. The local staging files and test-bucket copies were removed. The temporary drill token expires after 24 hours. The private backup run record identifies the snapshot. This was not a complete restore or an application-level drill. Automatic scheduling and the separate file-backup monitor are not yet enabled.

The draft `scripts/backup/restore_files.py` restores a snapshot into a new local staging directory. It decrypts and checks every file, and records original object keys and metadata in `index.json`. It does not write to any R2 bucket. Treat the staged files and index as private. A separate, reviewed procedure is required to upload them to an isolated bucket and verify application access. Remove the local staging directory securely after the drill under the owner's data-handling policy.

## Assign recovery responsibility

Record the primary owner, a backup owner, and their contact details in an access-controlled handover record. Do not treat the alert recipient as proof of ownership. Confirm that both people can access the recovery instructions and their own provider accounts.

Prabu is the primary recovery owner. Saravanan at Motionify is the backup owner. The primary owner reviews backup alerts, keeps recovery credentials current, and records restore drills. The backup owner takes over when the primary owner is unavailable. Account access for both owners still needs verification.

## Record provider configuration

Keep a private inventory that names the account owner, login method, billing owner, and recovery contact for GitHub, Netlify, Neon, Cloudflare, Razorpay, Resend, and Healthchecks.io. Record Sentry if it is used for production monitoring. Confirm access with each owner. Do not store secret values, session links, API tokens, or authentication recovery codes in the repository.

Record the production domain and DNS settings, Netlify project and production branch, build settings and redirects, Neon project and branch, and R2 bucket names and access settings. Record the Razorpay account, mode, webhook URL, subscribed events, and settlement contact. Record the Resend sender domain and DNS verification records. Record alert destinations, schedules, retention rules, and credential expiry or rotation dates.

Record Netlify environment variable names, scopes, and deploy contexts in the private inventory. The application depends on `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`. Check the live configuration for other variables. Record how to recover each value without copying it into this document. Keep Production and Deploy Preview values distinct.

Store recovery credentials in an owner-controlled secret manager. Keep an independent recovery method for the secret manager. Verify that the owner and backup owner can retrieve the required credentials without printing them in logs or chat. If a credential cannot be recovered, document how to rotate it and which services require updates. A replacement `JWT_SECRET` invalidates existing sessions. Database credentials must match both Neon and Netlify. Payment keys and webhook secrets must match their Razorpay and Netlify settings.

## Recover the service

1. Confirm the incident scope, the last known-good database backup, the file recovery point, and the target environment. Preserve existing backups and provider configuration.
2. Recover access to the required provider accounts and secrets. Verify each target account and environment before making changes.
3. Restore the database into an isolated PostgreSQL target. Follow the database recovery runbook and verify the schema contract and representative data.
4. Restore file objects into a private isolated bucket. Preserve object keys and relevant metadata. Compare a manifest and checksums with the recovery copy. Verify a representative project file and final deliverable.
5. Recreate configuration in an isolated deployment with test-only payment and email providers. Verify login, project access, file preview, and final-file download. Do not send client email or process live payments during the drill.
6. Record the restore point, elapsed time, checks, and any gaps. Obtain the owner's approval before changing production configuration or directing users to the recovered service.

## Remaining handover checks

- Verify both recovery owners' account access.
- Release and enable the project-file backup workflow after review. Configure its separate monitor and verify a scheduled run.
- Verify the source bucket's complete object inventory and metadata coverage for a full restore.
- Restore a complete snapshot into an isolated bucket and compare its bytes and metadata.
- Test the private provider inventory and secret-manager recovery path.
- Record the recovery point and elapsed time for an end-to-end drill that includes database, files, and configuration.
