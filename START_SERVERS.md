# Start Local Servers

Motionify Studio now runs one browser runtime locally: the root Vite app. Netlify Functions run beside it for API endpoints.

## Recommended

```bash
npm run dev:all
```

This starts:

- Vite app: `http://localhost:5173`
- Netlify Functions: `http://localhost:8888/.netlify/functions`

## Routes

- Public Site: `http://localhost:5173/`
- Proposal Review Links: `http://localhost:5173/proposal/:proposalId`
- Advance Payment Links: `http://localhost:5173/payment/:proposalId`
- Inquiry Verification Links: `http://localhost:5173/verify-inquiry`
- Portal Login: `http://localhost:5173/portal/login`
- Portal Projects: `http://localhost:5173/portal/projects`
- Admin Inquiries: `http://localhost:5173/portal/admin/inquiries`

## Separate Processes

Run these in separate terminals when you want independent logs:

```bash
npm run dev
npm run dev:functions
```

The legacy `landing-page-new` Next app is retired and kept only as non-runtime reference. Do not start or deploy it.
