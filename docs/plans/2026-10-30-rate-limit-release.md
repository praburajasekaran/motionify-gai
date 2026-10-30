# Release the atomic rate limiter

Migration `038` must reach the application's database before the new functions.
Without it, the new rate limiter denies requests and the Netlify database contract
check fails. The existing application can continue to use the database after the
additive migration.

1. Verify the Netlify production `DATABASE_URL` target without disclosing its
   credentials. Confirm the Neon project, branch, database, schema, existing
   rate-limit table and index, and migration records. Confirm that no unrelated
   migration will run. The earlier catalog check did not verify the Netlify target.
2. Apply only the UP section of `038_atomic_rate_limit.sql` and record version
   `038`, name `atomic_rate_limit`, in the same transaction. Verify the function
   signature and the migration record. Do not run `db:migrate up` unless every
   pending migration has been reviewed, because it applies all pending files.
3. Run the database contract check against that same database. Publish the
   application through the normal Git and Netlify pipeline after it passes.
4. Verify authenticated reads, rate-limit errors, and production logs. Capture
   comparable browser and server timings across repeated successful requests.
   Check both idle and warm behavior and count failures.

Old deployments do not take the new advisory lock. During an overlap with old
handlers, concurrent requests can exceed the configured limit. Minimize the
overlap and monitor the release. The atomic guarantee applies after all requests
use the new handler.

If the release causes a regression, revert the application commit and deploy the
revert. Keep the function and migration record while any new handler may run.
Dropping the function would make those handlers deny requests. Do not remove
rate-limit rows or other production data as part of rollback.
