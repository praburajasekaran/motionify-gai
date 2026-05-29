# Single Vite Frontend Runtime

Status: accepted

Motionify Studio will use one Vite frontend runtime on `https://motionify.studio/`: the Public Site lives at `/`, the authenticated Portal lives under `/portal/*`, and Netlify Functions remain the backend runtime. We chose this over keeping a Next shell around the Portal because the dual frontend/runtime split created duplicated route, API, data, and link behavior; we also rejected a big-bang deletion of `landing-page-new` because proposal review, advance payment, and verification links need parity and compatibility before the production publish path changes.

## Consequences

- Proposal review and advance payment remain public handoff surfaces until authentication is required.
- Portal routes remain canonically under `/portal/*`.
- `landing-page-new` can remain temporarily as a non-runtime legacy reference, but it must not own production routing, APIs, or build output after the migration completes.
