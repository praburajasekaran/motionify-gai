# Database backup and recovery

This procedure covers the Neon PostgreSQL database. R2 project files, database roles, secrets and provider configuration need separate recovery procedures.

## Configuration and ownership

The owner is responsible for the independent monitor, decryption-key recovery, and periodic restore drills. Use an access-controlled, private R2 Standard bucket dedicated to database backups. Apply a 30-day lifecycle expiration to that bucket; confirm it does not apply to the application bucket. Create an R2 key limited to this bucket with upload and download permissions. Keep the age private key and a recovery copy outside GitHub and Cloudflare.

Create an independent Healthchecks-compatible heartbeat with a 24-hour period and 2-hour grace period. Configure failure and stale-check alerts for `prabu@paretoid.com`, and verify that address receives both. The URL is a secret. Do not expose it in logs, screenshots, commits or shell history. Monitor the monitor separately as appropriate for the owner's operations.

Set these GitHub Actions secrets: `BACKUP_DATABASE_URL`, `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY`, and `BACKUP_HEARTBEAT_URL`. Set these repository variables: `BACKUP_BUCKET`, `BACKUP_R2_ENDPOINT`, `BACKUP_AGE_RECIPIENT`, `BACKUP_EXPECTED_HOST`, and `BACKUP_EXPECTED_DATABASE`. Independently verify the expected host and database against production before setting them. Set the R2 region to `auto`; the workflow already does so. The connection must use TLS and point to the verified production database. A separate read-only backup role is preferred only after an isolated restore proves it can dump every schema, table, sequence and row, including tables protected by row-level security. Never store the age private key in GitHub.

The workflow is scheduled for 03:17 India time each day and supports manual dispatch. Scheduled execution stays disabled unless the repository variable `BACKUP_SCHEDULE_ENABLED` is exactly `true`. GitHub requires the workflow to exist on the default branch before manual dispatch. After the bucket, credentials, encryption key and monitor are ready, merge with scheduling disabled, run and verify it manually, then set the variable to `true`. GitHub can delay or drop scheduled runs, and a public repository's schedule can be disabled after inactivity. Verify the independent stale alert, and review the last successful backup regularly.

## Validate the first backup

1. Run the workflow manually after configuration. Check that it succeeds and the independent monitor receives the success heartbeat. Confirm the private bucket contains an encrypted archive and matching manifest. No plaintext archive should be uploaded.
2. Inspect the manifest's database identity, server and `pg_dump` versions, timestamp, object name, size and SHA-256. Download the encrypted archive and compare its SHA-256 against the manifest before decryption. Confirm lifecycle scope and retention.
3. Test a failed backup and a missing heartbeat against a disposable database and a separate test monitor. Verify the alert reaches the owner. Do not disable production monitoring to test it.
4. Perform the restore drill below using the production backup in a private, isolated target. Record start and end times, checks, source backup time and any issues. Prove that the owner can recover the age private key.

## Restore drill

1. Create an empty, isolated PostgreSQL database of a compatible version. Disable production integrations, and restrict access because the restored data is real client data. Verify the target host and database name independently. Never use a production connection for a drill.
2. Download the encrypted archive and manifest using the restricted backup credentials. Check the encrypted archive's SHA-256 against `archive_sha256` in the manifest. Stop if it differs.
3. On a private operator machine, decrypt the archive with the independently stored age identity. Run `pg_restore --list` against the decrypted archive. Use `pg_restore --no-owner --no-acl` against the empty isolated target. Supply the target's `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` and `PGSSLMODE` through the environment; `PGDATABASE` is the database name, not a connection URL. Do not use `--clean` against production.
4. Check migration status and run `npm run db:verify-contract` with the isolated target in `DATABASE_URL`. Compare expected table and schema coverage, key row counts and representative project, payment and membership relationships with appropriate source evidence. Confirm the application health check in an isolated deployment using test-only providers. Do not trigger real payments or send client email.
5. Record recovery duration and results. Remove local plaintext and the isolated copy using its normal lifecycle after the drill. Repeat at least quarterly and after major database or backup-tool changes.

## Failure and rollback

On an alert, inspect the workflow result and the timestamp of the latest verified object. Do not print connection strings, access keys, heartbeat URLs or database contents. Correct the fault and run a manual backup. If the pipeline must be stopped, disable its schedule and revoke the new backup credentials only as needed. Preserve the existing Neon recovery settings and verified backup objects. Escalate immediately if no readable backup exists.
