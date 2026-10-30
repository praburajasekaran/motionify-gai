# Rate-limit cleanup and project read latency

The request path starts expired-row cleanup immediately after an allowed
rate-limit decision. The cleanup takes the connection just released by the
decision query. The following project query then opens another connection.
This adds connection setup to a cold project-list request even when there
are no expired rows to delete.

The regression test in `rate-limit-performance.test.ts` holds a lock on an
expired row while it performs a rate-limit check and the following read.
The baseline opens two connections and fails the one-connection assertion.
Removing request-time cleanup makes that same test pass.

## Fix and ownership

`scheduled-token-cleanup` already deletes entries older than two hours at
03:00 UTC each day. It now owns cleanup without duplicate work from requests.
The rate-limit decision still counts only entries within its configured
window. Authentication, authorization, the atomic decision function, and
fail-closed behavior are unchanged. No database migration is required.

The Netlify production console showed the schedule and a successful run on
30 October 2026 at 03:00 UTC. Its completion log reported 20 rate-limit rows
deleted. The next run was scheduled for 31 October at 03:00 UTC. No job was
manually invoked during this investigation.

Rows can remain for up to approximately 26 hours when the daily job runs
successfully. They no longer count against a user after their limit window
expires. A failed scheduled job can leave older rows behind, so its logs
remain the operational check for retention.

Project-list responses now distinguish `project_db_acquire` from
`project_db_query` in `Server-Timing`. Authentication keeps the existing
`db_acquire` and `db_query` labels. The new labels contain only durations.

## Controlled comparison

The baseline was production commit `f474405`. Both versions used the same
locked dependencies, Node 22.22.1, disposable local PostgreSQL, and 18
synthetic projects. Each call ran the real authenticated projects handler.
A local TCP proxy delayed each direction by 100 ms. Each mode ran one
unrecorded pair, followed by five alternating baseline/candidate pairs.

| Pool state | Baseline median and range | Candidate median and range | Connections before / after |
| --- | --- | --- | --- |
| Cold | 1,202 ms; 1,169 to 1,207 ms | 935 ms; 929 to 944 ms | 2 / 1 |
| Warm | 618 ms; 615 to 620 ms | 619 ms; 610 to 620 ms | 2 / 1 |

All 20 recorded requests returned HTTP 200 and the expected project IDs.
The proxy recorded no errors. Cold handler time fell by 267.6 ms in this
model. The connection count confirms the removed work. Warm ranges overlap,
so there is no measurable warm-request improvement.

This is not a production speedup measurement. The model excludes TLS,
Netlify initialization and routing, browser rendering, and real network
variation. The remaining three sequential database round trips explain the
roughly 600 ms warm floor in this model. Production functions remain in Ohio
and the database remains in Singapore.

The machine had ten logical cores and a load average of about 2.2 before
the run. Raw samples are in
[`2026-10-30-rate-limit-cleanup-samples.json`](2026-10-30-rate-limit-cleanup-samples.json).

## Reproduce

Use a separate checkout of `f474405` with the same dependencies installed.
The sandbox initializes and removes a disposable loopback database. It does
not load production credentials.

```sh
rtk proxy env RATE_LIMIT_BASELINE_ROOT=/absolute/path/to/baseline \
  READINESS_PERF_OUTPUT=/tmp/rate-limit-connections.json \
  node --import tsx scripts/readiness-sandbox.ts --rate-limit-connections
rtk proxy node --import tsx scripts/readiness-sandbox.ts --rate-limit
rtk proxy node --import tsx scripts/readiness-sandbox.ts --authorization
rtk proxy node --import tsx scripts/readiness-sandbox.ts
rtk npm run typecheck
rtk npm run build
```

## Verification and release

The connection regression failed before the fix and passed afterward.
Eight rate-limit tests passed, including concurrent enforcement, missing
table/function failures, cleanup retention, and repeated cleanup. The
authorization suite passed 193 tests, and the readiness suite passed 16.
Typecheck and the production build passed.

The diff received a sequential manual review under the repository's agent
instructions. The review covered retention, pool release on errors,
authorization scope, fail-closed behavior, and benchmark limitations.
No independent model review was run. No unresolved code finding remains.

PRs 134 and 135 reduced sequential reads and rate-limit queries. PR 136
removed a duplicate project prefetch. None removed the competing cleanup
query. The earlier tests checked limit enforcement and retention but did not
check whether housekeeping occupied the connection needed by the next read.

Production deployment and measurement are pending approval. After release,
compare uncached cold and warm project-list requests, confirm the new timing
labels, and verify that the scheduled cleanup still completes. Rollback is
a revert of this change and a redeploy; there is no schema rollback.
