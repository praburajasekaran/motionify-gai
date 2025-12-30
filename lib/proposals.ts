/**
 * Proposal Management Library
 * Handles proposal creation, storage, and retrieval using localStorage
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ProposalStatus =
  | 'sent'             // Proposal sent to client
  | 'accepted'         // Client accepted proposal
  | 'rejected'         // Client rejected proposal
  | 'changes_requested'; // Client requested changes

export interface ProposalDeliverable {
  id: string;                      // UUID - preserved through conversion to project
  name: string;
  description: string;
  estimatedCompletionWeek: number;
}

export interface Proposal {
  // Core Identification
  id: string;                      // UUID
  inquiryId: string;               // Reference to inquiry
  status: ProposalStatus;
  createdAt: string;               // ISO date string
  updatedAt: string;               // ISO date string

  // Content
  description: string;             // Rich text/markdown
  deliverables: ProposalDeliverable[];

  // Pricing (all amounts in paise - INR)
  totalPrice: number;              // Total cost in paise
  advancePercentage: number;       // 40, 50, or 60
  advanceAmount: number;           // Calculated
  balanceAmount: number;           // Calculated

  // Response tracking
  acceptedAt?: string;             // ISO date string
  rejectedAt?: string;             // ISO date string
  feedback?: string;               // For rejection or change requests
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'motionify_proposals';

// ============================================================================
// localStorage Operations
// ============================================================================

/**
 * Get all proposals from localStorage
 */
export function getProposals(): Proposal[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const proposals = JSON.parse(data) as Proposal[];

    // Sort by creation date (newest first)
    return proposals.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error reading proposals from localStorage:', error);
    return [];
  }
}

/**
 * Get a single proposal by ID
 */
export function getProposalById(id: string): Proposal | null {
  const proposals = getProposals();
  return proposals.find(p => p.id === id) || null;
}

/**
 * Get proposals by inquiry ID
 */
export function getProposalsByInquiryId(inquiryId: string): Proposal[] {
  const proposals = getProposals();
  return proposals.filter(p => p.inquiryId === inquiryId);
}

/**
 * Save proposals array to localStorage
 */
function saveProposals(proposals: Proposal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
  } catch (error) {
    console.error('Error saving proposals to localStorage:', error);
    throw new Error('Failed to save proposal. Please try again.');
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new proposal
 */
export function createProposal(data: {
  inquiryId: string;
  description: string;
  deliverables: ProposalDeliverable[];
  totalPrice: number;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;
}): Proposal {
  // Validate required fields
  if (!data.inquiryId || data.inquiryId.trim() === '') {
    throw new Error('Inquiry ID is required');
  }

  if (!data.description || data.description.trim() === '') {
    throw new Error('Description is required');
  }

  if (!data.deliverables || data.deliverables.length === 0) {
    throw new Error('At least one deliverable is required');
  }

  if (data.totalPrice <= 0) {
    throw new Error('Total price must be greater than 0');
  }

  if (![40, 50, 60].includes(data.advancePercentage)) {
    throw new Error('Advance percentage must be 40, 50, or 60');
  }

  // Generate unique ID
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const proposal: Proposal = {
    id,
    inquiryId: data.inquiryId,
    status: 'sent',
    createdAt: now,
    updatedAt: now,

    description: data.description.trim(),
    deliverables: data.deliverables.map(d => ({
      id: d.id,
      name: d.name.trim(),
      description: d.description.trim(),
      estimatedCompletionWeek: d.estimatedCompletionWeek,
    })),

    totalPrice: data.totalPrice,
    advancePercentage: data.advancePercentage,
    advanceAmount: data.advanceAmount,
    balanceAmount: data.balanceAmount,
  };

  // Save to localStorage
  const proposals = getProposals();
  proposals.unshift(proposal); // Add to beginning (newest first)
  saveProposals(proposals);

  return proposal;
}

/**
 * Update a proposal
 */
export function updateProposal(id: string, updates: Partial<Proposal>): Proposal {
  const proposals = getProposals();
  const index = proposals.findIndex(p => p.id === id);

  if (index === -1) {
    throw new Error('Proposal not found');
  }

  const updatedProposal: Proposal = {
    ...proposals[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  proposals[index] = updatedProposal;
  saveProposals(proposals);

  return updatedProposal;
}

/**
 * Update proposal status
 */
export function updateProposalStatus(
  id: string,
  status: ProposalStatus,
  additionalData?: {
    feedback?: string;
  }
): Proposal {
  const updates: Partial<Proposal> = { status };

  if (status === 'accepted') {
    updates.acceptedAt = new Date().toISOString();
  } else if (status === 'rejected') {
    updates.rejectedAt = new Date().toISOString();
  }

  if (additionalData?.feedback) {
    updates.feedback = additionalData.feedback;
  }

  return updateProposal(id, updates);
}

/**
 * Delete a proposal
 */
export function deleteProposal(id: string): void {
  const proposals = getProposals();
  const filtered = proposals.filter(p => p.id !== id);

  if (filtered.length === proposals.length) {
    throw new Error('Proposal not found');
  }

  saveProposals(filtered);
}

/**
 * Get proposals by status
 */
export function getProposalsByStatus(status: ProposalStatus): Proposal[] {
  const proposals = getProposals();
  return proposals.filter(p => p.status === status);
}

/**
 * Clear all proposals (for testing/demo purposes)
 */
export function clearAllProposals(): void {
  localStorage.removeItem(STORAGE_KEY);
}
