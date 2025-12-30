# How to Start Both Apps (Unified Port Strategy)

## Architecture

We're running both apps through a **unified port strategy**:

```
Port 5174 (Next.js) - Main entry point
  ↓
  ├─ /proposal/* → Next.js handles (landing page routes)
  ├─ /payment/* → Next.js handles (landing page routes)
  ├─ / → Next.js handles (landing page home)
  └─ /admin/* → Proxies to Vite on port 5173 (admin portal)

Port 5173 (Vite) - Admin portal backend
  ↓
  └─ Runs React admin portal, accessed via Next.js proxy
```

**Result:** Everything accessible at `http://localhost:5174`  
**Benefit:** Shared localStorage! 🎉

---

## Starting the Servers

### Step 1: Start Vite (Admin Portal Backend)

**Terminal 1:**
```bash
cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1
npm run dev
```

**Expected output:**
```
VITE v6.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

✅ **Keep this terminal running!**

---

### Step 2: Start Next.js (Main App on Port 5174)

**Terminal 2:**
```bash
cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new
npm run dev
```

**Expected output:**
```
▲ Next.js 16.0.1
- Local:   http://localhost:5174
```

✅ **Keep this terminal running too!**

---

## Access Points

Once both servers are running:

### Admin Portal
```
http://localhost:5174/admin/inquiries
```
- Create proposals
- Manage inquiries
- Uses Vite (port 5173) via Next.js proxy

### Proposal Pages (Client View)
```
http://localhost:5174/proposal/[proposal-id]
```
- Public proposal review
- No login required
- Served directly by Next.js

### Landing Page
```
http://localhost:5174/
```
- Home page
- Quiz
- Other marketing pages

---

## How It Works

1. **You access:** `http://localhost:5174/admin/inquiries`
2. **Next.js receives the request**
3. **Next.js proxies to:** `http://localhost:5173/admin/inquiries`
4. **Vite serves:** React admin portal
5. **Browser sees:** Everything on port 5174!

**localStorage is shared** because everything appears to be on `localhost:5174`! ✨

---

## Testing the Proposal Flow

### 1. Create Proposal (Admin)
1. Open: `http://localhost:5174/admin/inquiries`
2. Click on an inquiry
3. Click "Create Proposal"
4. Fill in details
5. Click "Send Proposal"
6. **Copy the link from the alert**

### 2. View Proposal (Client)
1. **Paste the proposal link** (should be `http://localhost:5174/proposal/[id]`)
2. **Page loads!** ✅
3. You can now:
   - Accept proposal
   - Request changes
   - Decline proposal

---

## Troubleshooting

### "Proposal not found"
**Cause:** localStorage mismatch or proposal doesn't exist

**Fix:**
1. Check console for errors
2. Verify both servers are running
3. Try creating a fresh proposal
4. Check: `localStorage.getItem('motionify_proposals')` in browser console

### "Port already in use"
**Cause:** Previous instance still running

**Fix:**
```bash
# Kill process on port 5174
lsof -ti:5174 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Restart both servers
```

### "Cannot connect to admin portal"
**Cause:** Vite (port 5173) not running

**Fix:**
1. Start Vite first (Terminal 1)
2. Wait for it to show "ready"
3. Then start Next.js (Terminal 2)

### Proxy not working
**Cause:** Next.js config issue

**Fix:**
1. Check `landing-page-new/next.config.ts` has rewrites
2. Restart Next.js server
3. Hard refresh browser (Cmd+Shift+R)

---

## Quick Start Script

Save this as `start-dev.sh`:

```bash
#!/bin/bash

# Start Vite in background
cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1
npm run dev &
VITE_PID=$!

# Wait for Vite to start
sleep 3

# Start Next.js in background
cd landing-page-new
npm run dev &
NEXTJS_PID=$!

echo "✅ Servers started!"
echo "Vite (Admin): PID $VITE_PID (port 5173)"
echo "Next.js (Main): PID $NEXTJS_PID (port 5174)"
echo ""
echo "Access admin: http://localhost:5174/admin/inquiries"
echo "Access landing: http://localhost:5174/"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
wait
```

Make executable:
```bash
chmod +x start-dev.sh
```

Run:
```bash
./start-dev.sh
```

---

## Port Reference

| Port | App | Purpose |
|------|-----|---------|
| 5174 | Next.js | Main entry point (admin + landing page) |
| 5173 | Vite | Admin portal backend (proxied) |

---

**Everything runs through port 5174 now!** 🎉

Your proposal link will work: `http://localhost:5174/proposal/320d7cfc-644e-4639-9eef-800152d9abe4`
