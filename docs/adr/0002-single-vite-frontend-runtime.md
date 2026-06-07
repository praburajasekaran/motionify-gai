# Single Vite Frontend Runtime

Status: accepted

Motionify Studio will use one Vite frontend runtime on `https://motionify.studio/`: the Public Site lives at `/`, the authenticated Portal lives under `/portal/*`, and Netlify Functions remain the backend runtime. We chose this over keeping a Next shell around the Portal because the dual frontend/runtime split created duplicated route, API, data, and link behavior. The old separate frontend was removed after proposal review, advance payment, and verification links reached parity in the root runtime.

## Consequences

- Proposal review and advance payment remain public handoff surfaces until authentication is required.
- Portal routes remain canonically under `/portal/*`.
- Old separate frontend code is recoverable from git history only; it must not own production routing, APIs, or build output.
