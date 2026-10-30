# Portal performance schema preflight

On 29 October 2026, a catalog-only query inspected the `neondb` database on the
default `main` branch of the Neon project `motionify-pm-portal`. No database
schema or application data was changed.

The `rate_limit_entries` table contains the four columns used by the current
rate limiter. The identifier and action columns are required, and `created_at`
is a nullable timestamp with time zone that defaults to `CURRENT_TIMESTAMP`.
The table has a primary key on `id`, the expected lookup index on
`(identifier, action, created_at)`, an index on `created_at`, and a unique
constraint on `(identifier, action, created_at)`. Migration records `001` and
`037` are present. Migration `001` does not require the extra unique constraint,
so an implementation must work with either schema.

The project's primary compute runs in Singapore. Neon shows a five-minute
scale-to-zero interval on the free plan. A wake-up may affect the first request
after inactivity; the existing production trace did not establish whether that
happened. Changing the interval requires a plan upgrade.

This check covers the default branch only. It does not establish which database
each Netlify deployment uses or validate a preview environment. Removing runtime
DDL still requires an atomic rate limiter, safe fixture setup, and verification
of every target environment. The plan's production-like before-and-after browser
measurements also remain outstanding.

## Production observations

On 29 October 2026, one authenticated super-admin browser session navigated to
an existing test project and then to the inquiry list. These are individual
observations, not percentile measurements. The portal was the deployed version,
without the uncommitted changes in this branch.

- One project-detail navigation produced two successful project reads, taking
  2,312 ms and 3,128 ms. Several concurrent data reads took 5,163 to 5,568 ms.
  One deliverables response reported 1,476.2 ms for authentication, 814.6 ms
  for rate limiting, and 4,358.4 ms total server time. Those stages overlap with
  the browser duration and must not be added to it.
- One inquiry navigation produced two GET requests to the same URL. Both returned
  200, after 5,207 ms and 8,101 ms. A separate client-request read took 4,609 ms.
- The observed API requests returned 200; no failed requests were recorded in
  these two captures. The inquiry page rendered actual rows. The project page
  rendered the selected test project and its deliverable.

The original project visible-data stopwatch matched a project-list heading before
navigation completed, so it is invalid and is not reported. No after measurement
exists. A comparable test requires the candidate code to be available to the
browser, and production deployment remains subject to user approval.

## Deployment and rollback

Netlify's `motionify-studio` project serves `motionify.studio` from the GitHub
repository on `main`. On 29 October 2026, the published deployment was
`6ae33d7404811e8061e70560`, built from commit `4372720`. It includes PR #131,
but not the uncommitted performance changes in this worktree.

The [current deployment](https://app.netlify.com/projects/motionify-studio/deploys/6ae33d7404811e8061e70560)
is the reference for recovery. If a build fails, Netlify keeps the prior
deployment published. If a published change causes a regression, revert its Git
commit and let the normal production pipeline deploy the revert. This does not
undo database changes. The recovery procedure has not been exercised.
