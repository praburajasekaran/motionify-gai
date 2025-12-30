# Prospect Customer Portal

## Overview

The Prospect Portal provides potential customers with portal access **immediately after submitting an inquiry through the landing page quiz**. This enables prospects to track their inquiry status and review proposals before becoming paying clients.

## Key Features

1. **Automatic Account Creation**: Prospect accounts are created automatically when customers submit the quiz
2. **Magic Link Authentication**: Passwordless login via email for easy access
3. **Inquiry Tracking**: View inquiry status and details
4. **Proposal Review**: Review, negotiate, and accept proposals
5. **Status Transition**: Prospects become "clients" after proposal acceptance and payment

## User Journey

```
Landing Page Quiz Submission
         ↓
Prospect Account Created (auto)
         ↓
Magic Link Email Sent
         ↓
Prospect Logs Into Portal
         ↓
Views "My Inquiries" Tab
         ↓
Receives Proposal Notification
         ↓
Reviews Proposal in Portal
         ↓
Accepts Proposal
         ↓
Completes Payment
         ↓
Account Upgraded to "Client"
         ↓
Full Project Access Granted
```

## Portal Pages

### 1. MyInquiries.tsx

**Purpose**: Shows customer's own inquiries  
**Location**: `pages/MyInquiries.tsx`

**Features**:
- List all inquiries submitted by the customer
- Status indicators (Pending review, Proposal ready, Accepted, Rejected)
- Click to view inquiry details
- View quiz answers they submitted
- View project notes they provided
- Filter by status
- Search inquiries

**Mock Data Structure**:
```typescript
interface ProspectInquiry {
  id: string
  inquiryNumber: string
  status: 'new' | 'reviewing' | 'proposal_sent' | 'accepted' | 'rejected'
  quizAnswers: {
    niche: string
    audience: string
    style: string
    mood: string
    duration: string
  }
  projectNotes?: string
  recommendedVideoType: string
  createdAt: string
  proposalId?: string
}
```

### 2. MyProposals.tsx

**Purpose**: Shows proposals sent to the customer  
**Location**: `pages/MyProposals.tsx`

**Features**:
- List all proposals sent to this customer
- Status badges (Sent, Viewed, Accepted, Rejected, Revision Requested)
- Click to view proposal details
- See pricing summary
- See timeline summary
- Filter proposals by status

**Mock Data Structure**:
```typescript
interface ProspectProposal {
  id: string
  proposalNumber: string
  inquiryId: string
  status: 'sent' | 'viewed' | 'accepted' | 'rejected' | 'revision_requested'
  totalPrice: number
  currency: 'INR' | 'USD'
  estimatedDuration: string
  includedRevisions: number
  createdAt: string
  viewedAt?: string
  acceptedAt?: string
}
```

### 3. ProposalReview.tsx

**Purpose**: Detailed proposal review with negotiation capabilities  
**Location**: `pages/ProposalReview.tsx`

**Features**:
- View full proposal details (pricing, deliverables, timeline)
- Accept proposal button → Redirects to payment OR creates project
- Reject proposal button → Sends rejection to admin with reason
- Request Changes button → Opens negotiation interface
- Negotiate deliverables (suggest changes)
- Negotiate pricing (counter-offer)
- Add comments/questions
- View proposal history (if multiple versions)

**Actions**:
```typescript
interface ProposalActions {
  acceptProposal: () => void  // Accepts and triggers payment workflow
  rejectProposal: (reason: string) => void  // Rejects with feedback
  requestChanges: (changes: ChangeRequest) => void  // Negotiation
  addComment: (comment: string) => void  // Q&A with admin
}

interface ChangeRequest {
  deliverables?: string  // Suggested deliverable changes
  pricing?: string       // Pricing counter-offer
  timeline?: string      // Timeline adjustment request
  revisions?: string     // Revision policy changes
  comments: string       // Overall feedback
}
```

## Authentication Flow

### Magic Link Login

1. **Link Generation**:
   - Created during account creation (POST /api/inquiries)
   - Token: UUID stored in user record
   - Expiry: 24 hours from generation
   - URL format: `https://portal.motionify.studio/auth/magic/{token}`

2. **Link Validation**:
   - User clicks magic link from email
   - System validates token exists and hasn't expired
   - System checks user account status
   - Creates session and redirects to portal

3. **Session Management**:
   - JWT token stored in localStorage or cookie
   - 7-day expiry for session
   - Auto-refresh before expiry

### Mock Auth Implementation

```typescript
// Mock magic link validation
export async function validateMagicLink(token: string): Promise<User | null> {
  const users = getMockUsers()
  const user = users.find(u => u.magicLinkToken === token)
  
  if (!user) return null
  if (user.tokenExpiry && new Date(user.tokenExpiry) < new Date()) {
    return null  // Token expired
  }
  
  // Update last login
  user.lastLoginAt = new Date().toISOString()
  
  return user
}
```

## User Data Model

```typescript
export interface ProspectUser {
  id: string
  email: string
  fullName: string
  company?: string
  phone?: string
  
  // Role & Status
  role: 'prospect' | 'client'  // Upgrades to 'client' after payment
  isProspect: boolean          // true until proposal accepted and paid
  
  // Authentication
  magicLinkToken?: string
  tokenExpiry?: string
  lastLoginAt?: string
  
  // Linked Data
  inquiryId?: string  // Initial inquiry that created this account
  
  // Metadata
  createdAt: string
  updatedAt: string
}
```

## Role Transition: Prospect → Client

**Trigger**: Advance payment completion (webhook)

**Changes**:
```typescript
// Before payment
{
  role: 'prospect',
  isProspect: true,
  // Limited portal access
}

// After payment
{
  role: 'client',
  isProspect: false,
  projectId: 'proj-123',  // Linked to project
  // Full portal access
}
```

**Access Changes**:
- **Prospect**: Can view inquiries and proposals only
- **Client**: Full access to project dashboard, deliverables, tasks, files, team

## Portal Navigation

### Prospect View
```
┌─────────────────────────────────┐
│  Motionify Portal (Prospect)    │
├─────────────────────────────────┤
│  My Inquiries                   │  ← Active
│  My Proposals                   │
│  Settings                       │
│  Logout                         │
└─────────────────────────────────┘
```

### Client View (After Payment)
```
┌─────────────────────────────────┐
│  Motionify Portal (Client)      │
├─────────────────────────────────┤
│  Dashboard                      │  ← New! Project overview
│  Deliverables                   │  ← New!
│  Tasks                          │  ← New!
│  Files                          │  ← New!
│  Team                           │  ← New!
│  ─────────────────────────      │
│  My Inquiries                   │  ← Historical
│  Settings                       │
│  Logout                         │
└─────────────────────────────────┘
```

## API Integration Points

### For Mock Data (Frontend-First Development)

**Local Storage Keys**:
- `motionify_users`: Array of all users (prospects + clients)
- `motionify_inquiries`: Array of all inquiries
- `motionify_proposals`: Array of all proposals
- `motionify_sessions`: Current session data

**Mock Data Functions**:
```typescript
// Mock data layer (data/mockUsers.ts)
export function createProspectFromInquiry(inquiry: Inquiry): ProspectUser {
  // Check if user exists
  const existingUser = getUserByEmail(inquiry.contactEmail)
  if (existingUser) return existingUser
  
  // Create new prospect
  const newUser: ProspectUser = {
    id: generateUUID(),
    email: inquiry.contactEmail,
    fullName: inquiry.contactName,
    company: inquiry.companyName,
    phone: inquiry.contactPhone,
    role: 'prospect',
    isProspect: true,
    magicLinkToken: generateUUID(),
    tokenExpiry: addHours(new Date(), 24).toISOString(),
    inquiryId: inquiry.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  saveUser(newUser)
  return newUser
}

export function upgradeProspectToClient(userId: string, projectId: string): void {
  const user = getUserById(userId)
  if (!user) return
  
  user.role = 'client'
  user.isProspect = false
  user.updatedAt = new Date().toISOString()
  
  saveUser(user)
}
```

### Future API Endpoints

When backend is built, these endpoints will replace mock functions:

**Prospect Management**:
- `GET /api/prospects/me` - Get current prospect's data
- `GET /api/prospects/me/inquiries` - Get prospect's inquiries
- `GET /api/prospects/me/proposals` - Get prospect's proposals
- `POST /api/proposals/{id}/accept` - Accept proposal
- `POST /api/proposals/{id}/reject` - Reject proposal
- `POST /api/proposals/{id}/request-changes` - Request changes

## Security Considerations

1. **Magic Links**:
   - Single-use tokens (invalidate after first use)
   - Time-limited (24 hours)
   - Stored securely in database

2. **Session Management**:
   - JWT tokens with short expiry
   - Secure, httpOnly cookies
   - CSRF protection

3. **Data Access**:
   - Prospects can only see their own inquiries/proposals
   - Row-level security on database
   - API validates user ownership

4. **Rate Limiting**:
   - Limit magic link requests (prevent abuse)
   - Limit proposal actions (prevent spam)

## Implementation Checklist

- [ ] Create `mockUsers.ts` data store
- [ ] Create `ProspectUser` interface
- [ ] Build `MyInquiries.tsx` page
- [ ] Build `MyProposals.tsx` page
- [ ] Build `ProposalReview.tsx` page
- [ ] Implement magic link authentication flow
- [ ] Add prospect → client upgrade logic
- [ ] Create navigation for prospect vs client views
- [ ] Add access guards (prospects can't access project pages)
- [ ] Update inquiry submission to create prospect accounts

## Related Documentation

- `/docs/features/inquiry-to-project/` - Inquiry flow with quiz integration
- `/docs/features/payment-workflow/` - Payment completion triggers role upgrade
- `/docs/FRONTEND_IMPLEMENTATION_TRACKER.md` - Task breakdown for Week 1-2

---

**Status**: Planned for Week 1-2 of frontend development  
**Mock Data**: Yes, full mock implementation  
**Backend**: Not required until frontend complete
