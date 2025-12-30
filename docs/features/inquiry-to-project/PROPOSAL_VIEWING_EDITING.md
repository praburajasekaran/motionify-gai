# Proposal Viewing and Editing Feature

## Overview
This document describes the proposal viewing and editing functionality that allows super admins to view and edit proposals after they've been sent to clients.

## Components

### 1. ProposalDetail Component
**Location:** `/pages/admin/ProposalDetail.tsx`

**Features:**
- **View Mode** (default): Displays the proposal details in a read-only format
- **Edit Mode**: Allows editing of proposal details, deliverables, and pricing
- **Status Display**: Shows current proposal status (sent, accepted, rejected, changes_requested)
- **Client Response Tracking**: Displays feedback and response dates if available

**Access:** 
- Route: `/admin/proposals/:proposalId`
- Permission: `canCreateProposals` (Admin users)

**UI Elements:**
- Proposal description
- List of deliverables with estimated completion weeks
- Pricing breakdown (advance payment, balance, total)
- Status badge with color coding
- Edit button (only visible for 'sent' proposals)
- Save/Cancel buttons in edit mode

### 2. Updated InquiryDetail Component
**Location:** `/pages/admin/InquiryDetail.tsx`

**Changes:**
- Added "View Proposal" button that appears when `inquiry.proposalId` exists
- Button is displayed in both the header and Quick Actions sidebar
- Clicking the button navigates to `/admin/proposals/:proposalId`

## User Flow

### Viewing a Proposal

1. Navigate to Inquiry Dashboard (`/admin/inquiries`)
2. Click on an inquiry that has status "Proposal Sent"
3. In the Inquiry Detail page, click "View Proposal" button
4. The ProposalDetail page opens showing:
   - Proposal status
   - Project description
   - All deliverables with details
   - Pricing breakdown
   - Client response (if any)

### Editing a Proposal

1. From the ProposalDetail page (view mode)
2. Click "Edit Proposal" button (top right)
3. Edit mode activates with editable fields:
   - Project description (textarea)
   - Deliverables (add, remove, edit)
   - Currency selection (INR/USD)
   - Total price
   - Advance payment percentage (40%, 50%, 60%)
4. Make changes as needed
5. Click "Save Changes" or "Cancel"
6. Changes are validated before saving
7. On success, view mode is restored with updated data

## Navigation Routes

```
/admin/inquiries                          → InquiryDashboard
/admin/inquiries/:id                      → InquiryDetail
/admin/inquiries/:inquiryId/proposal      → ProposalBuilder (create new)
/admin/proposals/:proposalId              → ProposalDetail (view/edit)
```

## Data Flow

```
1. Create Proposal
   ProposalBuilder → createProposal() → localStorage
   
2. Link to Inquiry
   updateInquiryStatus() → inquiry.proposalId = proposal.id
   
3. View Proposal
   InquiryDetail → "View Proposal" button → ProposalDetail
   
4. Edit Proposal
   ProposalDetail (edit mode) → updateProposal() → localStorage
```

## Permissions

- **View Proposals**: Requires `canCreateProposals` permission (Admin users)
- **Edit Proposals**: Requires `canCreateProposals` permission (Admin users)
- **Note**: Currently only proposals with status 'sent' can be edited

## Status Management

Proposal statuses:
- `sent` - Proposal sent to client (editable)
- `accepted` - Client accepted the proposal (read-only)
- `rejected` - Client rejected the proposal (read-only)
- `changes_requested` - Client requested changes (read-only)

## Features Implemented

✅ View proposal details in read-only mode
✅ Edit proposal description, deliverables, and pricing
✅ Status badge with color coding
✅ Client response tracking (acceptance, rejection, feedback)
✅ Navigation from inquiry to proposal
✅ Validation before saving changes
✅ Pricing calculator with real-time preview
✅ Currency support (INR/USD)
✅ Deliverable management (add, edit, remove)

## Future Enhancements

- [ ] Version history tracking
- [ ] Email notification when proposal is edited
- [ ] Comparison view (original vs edited)
- [ ] Proposal templates
- [ ] PDF export
- [ ] Client-facing proposal review page
- [ ] Comments/notes section
- [ ] Approval workflow

## Technical Details

### State Management
- Form state is initialized from proposal data when entering edit mode
- Changes are local until "Save Changes" is clicked
- Cancel button discards all changes and exits edit mode

### Validation
- Description must not be empty
- All deliverables must have name and description
- Estimated completion week must be >= 1
- Total price must be > 0
- Advance percentage must be 40, 50, or 60

### Pricing Calculation
- All amounts stored in smallest currency unit (paise for INR, cents for USD)
- Advance amount calculated as: `totalPrice * advancePercentage / 100`
- Balance amount calculated as: `totalPrice - advanceAmount`
- Display formatting handles locale-specific currency symbols

## Testing Checklist

- [x] Build succeeds without errors
- [ ] Can view proposal from inquiry detail page
- [ ] Can enter edit mode
- [ ] Can edit description
- [ ] Can add/remove/edit deliverables
- [ ] Can change currency
- [ ] Can change pricing
- [ ] Can change advance percentage
- [ ] Pricing breakdown updates correctly
- [ ] Save changes persists to localStorage
- [ ] Cancel discards changes
- [ ] Edit button only shows for 'sent' status
- [ ] Status badge displays correctly
- [ ] Client response section displays when available
- [ ] Navigation works correctly
- [ ] Permissions are enforced

## Screenshots

[Add screenshots here once feature is tested]

## Related Files

- `/pages/admin/ProposalDetail.tsx` - Main component
- `/pages/admin/InquiryDetail.tsx` - Updated with view proposal button
- `/pages/admin/ProposalBuilder.tsx` - Create proposal component
- `/lib/proposals.ts` - Proposal data management
- `/App.tsx` - Route configuration
- `/lib/permissions.ts` - Permission checks
