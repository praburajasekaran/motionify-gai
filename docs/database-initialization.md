# Initialize or upgrade the database

Use the application's `DATABASE_URL` for the intended database. Keep credentials in your environment or secret manager. The commands use the TLS policy in `database/connection.ts`.

## Initialize an empty database

Run these commands from the repository root after installing dependencies.

```sh
npm run db:bootstrap
npm run db:verify-contract
```

`db:bootstrap` requires an empty public schema. It applies the canonical schema, adds the remaining runtime migrations, records the migration versions, and verifies the contract in one transaction. A failure rolls back the schema changes. The command rejects a database that already contains tables.

The schema snapshot already includes several historical upgrades. Bootstrap records those versions without replaying their destructive or duplicate DDL. The exclusions and their reasons are in `database/bootstrap.ts`. Do not apply `schema.sql` manually and then replay every historical migration.

Bootstrap provisions no accounts. After initialization, use the supported account-provisioning process. If an operator must provision the initial administrator through SQL, use the canonical `super_admin` role and the operator-approved email. Verify the account and sign-in before inviting clients. Never include a real administrator account in the schema snapshot or test fixture.

## Upgrade an existing database

Back up the database and inspect its recorded migration state before applying an upgrade.

```sh
npm run db:migrate:status
npm run db:migrate
npm run db:verify-contract
```

Use `db:migrate` for existing databases. Do not run bootstrap, reset the public schema, or mark unapplied migrations as complete. If historical schema drift prevents an upgrade, preserve the data and diagnose the failed migration before retrying.

## Prepare the delivery release

Apply migrations 031 through 035 to a database that already has migration 030. Verify the database contract before deploying the new functions.

Migration 031 reconciles task tables and delivery runtime fields. Migration 032 adds deliverable staff assignment. Migration 033 adds file-specific discussion threads and nullable reviewed-file attribution for revision history. Migration 034 stores private thumbnail keys on uploaded files.

Migration 035 adds authentication token tables, the user's last-login timestamp, and persisted inquiry ownership. The database contract requires these structures for sign-in, account deactivation, and inquiry authorization.

Migration 033 creates file rows for legacy beta and final keys that lack an uploaded-file identity. These rows have explicit legacy labels. It does not assign existing feedback to those rows.

Existing revision requests keep `reviewed_file_id` empty. The application displays these as unknown file versions. Do not infer an identity from a filename or the latest upload. Files with attributed feedback remain referenced by the database and cannot be deleted individually.

These migrations add data structures without dropping existing records. If application code must be rolled back, retain the migrations, feedback, file identities, and payment receipts. Do not run destructive DOWN migrations to revert application code.
