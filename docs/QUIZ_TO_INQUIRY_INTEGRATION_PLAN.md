# Quiz to Inquiry Integration Plan

**Created**: 2025-12-29
**Status**: Ready to Implement
**Timeline**: Week 1-2

---

## Overview

Extend the existing Next.js landing page quiz (`landing-page-new/src/components/Quiz/Quiz.tsx`) to collect contact information and create inquiry records that flow into the admin dashboard.

---

## Current State

### ✅ What's Already Built (Landing Page Quiz)

**Location**: `landing-page-new/src/components/Quiz/Quiz.tsx`

**Existing 5 Steps**:
1. What's your niche? → `selections.niche`
2. Who's your target audience? → `selections.audience`
3. What kind of video style? → `selections.style`
4. What mood/tone? → `selections.mood`
5. What's your ideal duration? → `selections.duration`

**After Completion**:
- Generates video recommendation using Google Veo 3 (mock)
- Shows "Start This Project" button (currently links to `#`)
- Shows "Retake Quiz" button

**Supporting Files**:
- `useQuiz.ts` - State management hook
- `recommendation.ts` - Recommendation engine

---

## Implementation Plan

### Step 1: Add Contact Information Step (Step 6)

**When**: After user clicks "Start This Project" on recommendation screen

**What to Build**:

Update the quiz flow:
```
Current Flow:
Step 1-5 → Recommendation → "Start This Project" (does nothing)

New Flow:
Step 1-5 → Recommendation → "Start This Project" → Step 6 (Contact Info) → Submit → Success
```

**Step 6 Form Fields**:
```typescript
interface ContactInfo {
  fullName: string       // Required, min 2 chars
  email: string          // Required, email validation
  company?: string       // Optional
  phone?: string         // Optional, phone format validation
  additionalNotes?: string // Optional textarea
}
```

**UI Design** (Match existing quiz style):
```tsx
<div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-6 sm:p-8">
  <h3 className="text-2xl sm:text-3xl font-semibold mb-2">
    Let's Get Started!
  </h3>
  <p className="text-white/60 text-sm mb-6">
    Tell us how to reach you and we'll send your personalized recommendation
  </p>

  <form className="space-y-4">
    <input
      type="text"
      placeholder="Full Name *"
      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20"
    />
    <input
      type="email"
      placeholder="Email Address *"
      className="..."
    />
    <input
      type="text"
      placeholder="Company Name (Optional)"
      className="..."
    />
    <input
      type="tel"
      placeholder="Phone Number (Optional)"
      className="..."
    />
    <textarea
      placeholder="Any additional details? (Optional)"
      rows={3}
      className="..."
    />

    <div className="flex gap-3">
      <button type="button" onClick={goBackToRecommendation}>
        Back
      </button>
      <button type="submit">
        Submit Inquiry
      </button>
    </div>
  </form>
</div>
```

---

### Step 2: Update State Management (`useQuiz.ts`)

**Add to Quiz State**:
```typescript
interface QuizState {
  // Existing
  selections: {
    niche: string
    audience: string
    style: string
    mood: string
    duration: string
  }

  // NEW
  contactInfo: {
    fullName: string
    email: string
    company: string
    phone: string
    additionalNotes: string
  }

  isContactStep: boolean  // true when showing Step 6
  inquirySubmitted: boolean  // true after submission
  inquiryId: string | null  // generated inquiry ID
}
```

**New Functions**:
```typescript
const updateContactInfo = (field: keyof ContactInfo, value: string) => {
  // Update contact info state
}

const submitInquiry = async () => {
  // Create inquiry record
  // Generate inquiry ID
  // Store in mock data
  // Set inquirySubmitted = true
}
```

---

### Step 3: Create Inquiry Data Structure

**File**: `landing-page-new/src/data/mockInquiries.ts`

```typescript
export interface Inquiry {
  id: string  // UUID
  token: string  // Unique token for tracking (e.g., "INQ-20250129-ABC123")

  // Quiz answers
  niche: string
  audience: string
  style: string
  mood: string
  duration: string

  // Recommendation
  recommendedTitle: string
  recommendedSubtitle: string
  recommendedDescription: string
  recommendedStyleTags: string[]

  // Contact info
  fullName: string
  email: string
  company?: string
  phone?: string
  additionalNotes?: string

  // Metadata
  status: 'new' | 'reviewing' | 'proposal_sent' | 'accepted' | 'rejected'
  createdAt: string  // ISO date
  updatedAt: string
  assignedTo?: string  // Project manager ID
  proposalId?: string  // Linked proposal ID
}

// Mock storage (in-memory for now)
export const mockInquiries: Inquiry[] = []

export function createInquiry(data: Omit<Inquiry, 'id' | 'token' | 'status' | 'createdAt' | 'updatedAt'>): Inquiry {
  const inquiry: Inquiry = {
    ...data,
    id: generateUUID(),
    token: generateInquiryToken(),
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockInquiries.push(inquiry)

  // Store in localStorage for persistence across page reloads
  localStorage.setItem('mockInquiries', JSON.stringify(mockInquiries))

  return inquiry
}

function generateInquiryToken(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `INQ-${date}-${random}`
}
```

---

### Step 4: Success Confirmation Screen

**After Submission**, show success screen:

```tsx
{inquirySubmitted && (
  <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-8 text-center">
    {/* Success Icon */}
    <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <h3 className="text-2xl font-semibold mb-2">
      Inquiry Submitted!
    </h3>
    <p className="text-white/70 mb-6">
      Thank you, {contactInfo.fullName}! We've received your inquiry.
    </p>

    <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
      <p className="text-sm text-white/60 mb-1">Your Inquiry ID:</p>
      <p className="text-lg font-mono text-white">{inquiryId}</p>
    </div>

    <div className="space-y-3">
      <p className="text-sm text-white/60">
        We'll review your request and send you a personalized proposal within 24-48 hours.
      </p>
      <p className="text-sm text-white/60">
        A confirmation email has been sent to <span className="text-white font-medium">{contactInfo.email}</span>
      </p>
    </div>

    <div className="mt-8 flex gap-3 justify-center">
      <button
        onClick={() => window.location.href = `/proposal/${inquiryToken}`}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-6 py-3 text-sm font-medium text-white"
      >
        Track My Inquiry
      </button>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium bg-white/5 ring-1 ring-white/10 text-white/90"
      >
        Submit Another Inquiry
      </button>
    </div>
  </div>
)}
```

---

### Step 5: Admin Dashboard Integration (React Dashboard)

**File**: `pages/admin/InquiryDashboard.tsx` (React app, NOT Next.js landing)

This component will:
1. Read from the same `mockInquiries` data (via localStorage or shared store)
2. Display all inquiries in a table/list
3. Show quiz answers for each inquiry
4. Allow admin to create proposals from inquiries

**Data Sync**:
```typescript
// Shared inquiry store accessible by both apps
// Option A: localStorage (simple, works across apps)
// Option B: Shared API endpoint (when backend is ready)

// In React Dashboard:
import { mockInquiries, getInquiryById } from '@/data/mockInquiries'

useEffect(() => {
  // Load inquiries from localStorage
  const stored = localStorage.getItem('mockInquiries')
  if (stored) {
    setInquiries(JSON.parse(stored))
  }
}, [])
```

**Admin Dashboard UI**:
```tsx
<div className="space-y-4">
  {inquiries.map(inquiry => (
    <InquiryCard key={inquiry.id} inquiry={inquiry}>
      {/* Show quiz answers */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Niche:</span>
          <span className="ml-2 font-medium">{inquiry.niche}</span>
        </div>
        <div>
          <span className="text-gray-500">Audience:</span>
          <span className="ml-2 font-medium">{inquiry.audience}</span>
        </div>
        <div>
          <span className="text-gray-500">Style:</span>
          <span className="ml-2 font-medium">{inquiry.style}</span>
        </div>
        <div>
          <span className="text-gray-500">Mood:</span>
          <span className="ml-2 font-medium">{inquiry.mood}</span>
        </div>
        <div>
          <span className="text-gray-500">Duration:</span>
          <span className="ml-2 font-medium">{inquiry.duration}</span>
        </div>
      </div>

      {/* Recommendation preview */}
      <div className="mt-3 p-3 bg-purple-50 rounded-lg">
        <p className="text-xs text-purple-600 font-medium mb-1">
          Quiz Recommendation:
        </p>
        <p className="text-sm font-semibold">{inquiry.recommendedTitle}</p>
        <p className="text-xs text-gray-600">{inquiry.recommendedSubtitle}</p>
      </div>

      <button className="mt-4">Create Proposal</button>
    </InquiryCard>
  ))}
</div>
```

---

### Step 6: Proposal Builder Pre-fill

When admin clicks "Create Proposal" from an inquiry:

**File**: `pages/admin/ProposalBuilder.tsx`

```typescript
// Pre-fill proposal with inquiry data
const inquiry = getInquiryById(inquiryId)

const initialProposal = {
  inquiryId: inquiry.id,
  clientName: inquiry.fullName,
  clientEmail: inquiry.email,

  // Pre-fill deliverables based on quiz recommendation
  deliverables: [
    {
      name: inquiry.recommendedTitle,
      description: inquiry.recommendedDescription,
      duration: inquiry.duration,
      style: inquiry.style,
      mood: inquiry.mood,
    }
  ],

  // Default pricing (admin can adjust)
  totalCost: 5000,  // Based on recommendation
  advancePercentage: 50,
  totalRevisions: 3,
}
```

---

## File Structure

```
landing-page-new/
├── src/
│   ├── components/
│   │   └── Quiz/
│   │       ├── Quiz.tsx (UPDATE - add Step 6)
│   │       ├── useQuiz.ts (UPDATE - add contact info state)
│   │       ├── recommendation.ts (existing)
│   │       └── ContactInfoStep.tsx (NEW - Step 6 component)
│   ├── data/
│   │   └── mockInquiries.ts (NEW - inquiry data store)
│   └── lib/
│       └── validation.ts (NEW - form validation utilities)

motionify-gai-1/ (React Dashboard)
├── pages/
│   └── admin/
│       ├── InquiryDashboard.tsx (NEW - admin inquiry list)
│       └── ProposalBuilder.tsx (NEW - create proposals)
├── components/
│   └── inquiry/
│       ├── InquiryCard.tsx (NEW - inquiry list item)
│       └── InquiryDetailsModal.tsx (NEW - inquiry details popup)
└── data/
    └── mockInquiries.ts (SHARED - symlink or copy from landing page)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS LANDING PAGE                      │
│                                                               │
│  Quiz (5 steps) → Recommendation → Contact Info (Step 6)    │
│                                          ↓                    │
│                                    Submit Inquiry            │
│                                          ↓                    │
│                              createInquiry()                 │
│                                          ↓                    │
│                          localStorage.setItem()              │
│                                          ↓                    │
│                              Success Screen                  │
│                    (Show inquiry ID/token)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    localStorage shared
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    REACT ADMIN DASHBOARD                     │
│                                                               │
│  Admin Inquiry Dashboard                                     │
│          ↓                                                    │
│  localStorage.getItem() → Load inquiries                     │
│          ↓                                                    │
│  Display inquiry list with quiz answers                      │
│          ↓                                                    │
│  Click "Create Proposal" → ProposalBuilder                   │
│          ↓                                                    │
│  Pre-fill with inquiry data → Send proposal                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

### Contact Info Form
```typescript
const validation = {
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s]+$/,
    errorMessages: {
      required: "Please enter your full name",
      minLength: "Name must be at least 2 characters",
      pattern: "Please enter a valid name"
    }
  },

  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessages: {
      required: "Please enter your email address",
      pattern: "Please enter a valid email address"
    }
  },

  phone: {
    required: false,
    pattern: /^[\d\s\-\+\(\)]+$/,
    minLength: 10,
    errorMessages: {
      pattern: "Please enter a valid phone number",
      minLength: "Phone number must be at least 10 digits"
    }
  }
}
```

---

## Mock Email Notification (Console Log)

After inquiry submission:
```typescript
function sendInquiryNotification(inquiry: Inquiry) {
  // Mock email - just log to console
  console.log('📧 EMAIL SENT TO:', inquiry.email)
  console.log('Subject: Your Motionify Inquiry Received')
  console.log('Body:', `
    Hi ${inquiry.fullName},

    Thank you for your inquiry! We've received your request for a ${inquiry.recommendedTitle}.

    Inquiry Details:
    - ID: ${inquiry.token}
    - Niche: ${inquiry.niche}
    - Style: ${inquiry.style}
    - Recommended: ${inquiry.recommendedTitle}

    We'll review your request and send you a personalized proposal within 24-48 hours.

    You can track your inquiry status at: [link]

    Best regards,
    The Motionify Team
  `)

  // Also notify admin
  console.log('📧 EMAIL SENT TO: admin@motionify.com')
  console.log('Subject: New Inquiry Received')
  console.log(`Body: New inquiry from ${inquiry.fullName} (${inquiry.email})`)
}
```

---

## Testing Checklist

### User Flow Testing
- [ ] User completes all 5 quiz steps
- [ ] Recommendation displays correctly
- [ ] Click "Start This Project" → Step 6 contact form appears
- [ ] Fill out contact form → validation works
- [ ] Submit inquiry → success screen appears
- [ ] Inquiry ID displayed correctly
- [ ] "Track My Inquiry" link works (shows inquiry status page)
- [ ] "Submit Another Inquiry" resets quiz

### Data Persistence Testing
- [ ] Inquiry saved to localStorage
- [ ] Inquiry persists after page reload
- [ ] Multiple inquiries can be created
- [ ] Inquiry IDs are unique

### Admin Dashboard Testing
- [ ] Admin dashboard loads inquiries from localStorage
- [ ] Inquiries display with quiz answers
- [ ] Quiz recommendation shown in inquiry details
- [ ] "Create Proposal" button opens proposal builder
- [ ] Proposal pre-filled with inquiry data

### Edge Cases
- [ ] Submit with minimal info (only required fields)
- [ ] Submit with all fields filled
- [ ] Invalid email format
- [ ] Invalid phone format
- [ ] Back button from contact form to recommendation
- [ ] Reset quiz after submission

---

## Next Steps After Week 1-2

Once inquiry system is working:

### Week 3: Proposal Review Page
- Public proposal review page at `/proposal/:token`
- Client can view proposal linked to their inquiry
- Accept/reject/request changes

### Week 4: Backend Integration
- Replace localStorage with actual API calls
- Store inquiries in Neon PostgreSQL
- Send real emails via Amazon SES

---

## Questions to Resolve

1. **Inquiry tracking link**: Should `/proposal/:token` show inquiry status, or just proposal when ready?
   - Option A: Show inquiry status first, then proposal when created
   - Option B: Show "Proposal pending" message until admin creates it

2. **Email notifications**: Mock only for now, or integrate with a service like Resend?

3. **Quiz recommendation video**: Currently calls `/api/generate-video` - should this be disabled for inquiry flow?

---

## Success Metrics

After implementation:
- ✅ Users can submit inquiries through quiz
- ✅ Contact info collected and validated
- ✅ Inquiries appear in admin dashboard
- ✅ Quiz answers visible to admins
- ✅ Proposals can be created from inquiries
- ✅ Data persists across sessions (localStorage)
- ✅ Ready for backend integration

---

**Ready to start building!** First component: Add Step 6 (Contact Info) to the quiz.
