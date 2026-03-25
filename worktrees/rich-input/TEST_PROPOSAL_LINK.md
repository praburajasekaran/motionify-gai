# How to Test Proposal Links

## Current Setup

- **Admin Portal**: http://localhost:5177 (Vite/React)
- **Landing Page**: http://localhost:5174 (Next.js)

## The Problem Solved

**Before:** Proposal links didn't work because localStorage is port-specific
- Admin creates proposal → stores in localStorage:5177
- Client opens link → tries to read from localStorage:5174
- Result: "Proposal not found"

**After:** Proposal data is encoded in URL parameters
- Admin creates proposal → generates link with encoded data
- Client opens link → decodes data from URL
- Result: Proposal loads! ✅

## Test Steps

### 1. Create a Test Proposal

1. Open admin portal: `http://localhost:5177/admin/inquiries`
2. Click on any inquiry (use the seeded samples)
3. Click "Create Proposal"
4. Fill in:
   - Description: "Test proposal for client viewing"
   - Add 1 deliverable: "Test Video" (Week 1)
   - Currency: USD
   - Price: 5000
   - Advance: 50%
5. Click "Send Proposal"

### 2. Copy the Proposal Link

You'll see an alert like:
```
Proposal created successfully!

Share this link with client:
http://localhost:5174/proposal/abc-123-def-456?data=eyJwcm9wb3NhbC...

✅ Email notification logged to console.
```

**Copy the entire link** (including the `?data=` part!)

### 3. Test the Proposal Link

1. **Open a new tab** (or incognito window)
2. **Paste the proposal link**
3. **Hit Enter**

### Expected Results

✅ **Proposal loads immediately** with:
- Company name
- Project description
- Deliverables
- Pricing ($5,000 USD ≈ ₹4,15,000 INR)
- Three action buttons

✅ **Console shows:**
```
👁️ PROPOSAL VIEWED (from URL)
========================================
Proposal ID: abc-123-def-456
Version: 1
Status: sent
Inquiry: INQ-2025-XXX
========================================
```

### 4. Test Actions

1. **Click "Request Changes"**
   - Enter feedback (min 10 chars)
   - Submit
   - Should show success message

2. **Click "Accept Proposal"**
   - Should redirect to payment page
   - Should show advance amount

3. **Click "Decline"**
   - Should show confirmation modal
   - Should decline successfully

## Why This Works

The proposal data is **encoded in the URL** using Base64:

```
http://localhost:5174/proposal/[id]?data=[base64-encoded-json]
```

The JSON contains:
```json
{
  "proposal": { ...proposal data... },
  "inquiry": { ...inquiry data... }
}
```

The landing page:
1. Extracts the `data` parameter from URL
2. Decodes it from Base64
3. Parses the JSON
4. Displays the proposal immediately

## Benefits

✅ **No localStorage sharing needed**
✅ **Works across different ports**
✅ **Instant loading** (no API calls)
✅ **Works offline** (data in URL)
✅ **Easy to share** (just copy link)

## Limitations (Vertical Slice)

- URL can get long for complex proposals
- Data is visible in URL (encoded but not encrypted)
- For production, we'd use a proper API/database

## Next Steps

Once this works, we can:
1. Add proper API endpoints
2. Use database storage
3. Add authentication
4. Implement Razorpay payment

---

**Try it now!** Create a proposal and test the link. It should work immediately! 🚀