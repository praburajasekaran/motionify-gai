# What's Next

This note supersedes the old dual-runtime navigation task. Motionify Studio now has one active browser runtime: the root Vite app.

Use these surfaces for future work:

- Public Site: `/`
- Public Proposal Review: `/proposal/:proposalId`
- Public Advance Payment: `/payment/:proposalId`
- Inquiry Verification: `/verify-inquiry`
- Authenticated Portal: `/portal/*`
- Backend APIs: `/.netlify/functions/*`

Do not add work to the retired `landing-page-new` reference. If a past implementation detail is needed, recover it from version history or the retained non-runtime reference, then port the behavior into the root Vite app or Netlify Functions.
