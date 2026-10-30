# Project navigation performance

On 30 October 2026, the production portal ran commit `dad271b`. A super-admin
focused the Projects navigation link and opened the project list. The browser
sent two successful requests: one scoped to the user and one for all projects.
They took 4,475 ms and 5,426 ms. The trace recorded request scope without user
identifiers. It did not measure the time until the list was visible.

Five subsequent project-list reloads bypassed the browser cache and showed the
project list. Each sent one successful all-projects request. The request times
were 966, 1,044, 1,028, 952, and 962 ms. The median was 966 ms and the range
was 952 to 1,044 ms. Server handler totals were 641 to 647 ms. Database
acquisition was 0.1 ms in each response. This sample is not a percentile or a
before-and-after comparison.

After approximately 35 seconds without a portal read, one uncached request took
2,216 ms. It reported 1,252 ms for database acquisition and 1,893 ms total
handler time. The stages overlap. This observation does not distinguish pool
idle eviction from a function instance restart or other causes.

Netlify's function region is Ohio, and Neon's primary compute is in Singapore.
The Netlify console says the region control requires an upgrade. Netlify's
[documentation](https://docs.netlify.com/build/functions/configuration/) lists
Singapore as a Pro and Enterprise region. Neon says a region move requires a
[new project and a database migration](https://neon.com/docs/import/migrate-neon-to-another-region).
No region or billing setting was changed.

The fix in this branch has passed browser tests for super-admin, support,
client, and team-member project navigation. A deployed browser comparison is
still required to measure its effect on actual users.
