const API_BASE_URL = '/.netlify/functions';

export type ProposalStatus =
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'changes_requested';

export interface ProposalDeliverable {
  id: string;
  name: string;
  description: string;
  estimatedCompletionWeek: number;
}

export interface ProposalEditHistory {
  version: number;
  editedAt: string;
  reason?: string;
}

export interface Proposal {
  id: string;
  inquiryId: string;
  status: ProposalStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  description: string;
  deliverables: ProposalDeliverable[];
  currency: 'INR' | 'USD';
  totalPrice: number;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;
  acceptedAt?: string;
  rejectedAt?: string;
  feedback?: string;
  editHistory?: ProposalEditHistory[];
}

export async function getProposals(): Promise<Proposal[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/proposals`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((proposal: any) => ({
      ...proposal,
      inquiryId: proposal.inquiry_id,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      totalPrice: proposal.total_price,
      advancePercentage: proposal.advance_percentage,
      advanceAmount: proposal.advance_amount,
      balanceAmount: proposal.balance_amount,
      acceptedAt: proposal.accepted_at,
      rejectedAt: proposal.rejected_at,
      editHistory: proposal.edit_history,
      deliverables: typeof proposal.deliverables === 'string' 
        ? JSON.parse(proposal.deliverables) 
        : proposal.deliverables,
    }));
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
}

export async function getProposalById(id: string): Promise<Proposal | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/proposal-detail/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const proposal = await response.json();
    return {
      ...proposal,
      inquiryId: proposal.inquiry_id,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      totalPrice: proposal.total_price,
      advancePercentage: proposal.advance_percentage,
      advanceAmount: proposal.advance_amount,
      balanceAmount: proposal.balance_amount,
      acceptedAt: proposal.accepted_at,
      rejectedAt: proposal.rejected_at,
      editHistory: proposal.edit_history,
      deliverables: typeof proposal.deliverables === 'string' 
        ? JSON.parse(proposal.deliverables) 
        : proposal.deliverables,
    };
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return null;
  }
}

export async function getProposalsByInquiryId(inquiryId: string): Promise<Proposal[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/proposals?inquiryId=${inquiryId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((proposal: any) => ({
      ...proposal,
      inquiryId: proposal.inquiry_id,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      totalPrice: proposal.total_price,
      advancePercentage: proposal.advance_percentage,
      advanceAmount: proposal.advance_amount,
      balanceAmount: proposal.balance_amount,
      acceptedAt: proposal.accepted_at,
      rejectedAt: proposal.rejected_at,
      editHistory: proposal.edit_history,
      deliverables: typeof proposal.deliverables === 'string' 
        ? JSON.parse(proposal.deliverables) 
        : proposal.deliverables,
    }));
  } catch (error) {
    console.error('Error fetching proposals by inquiry:', error);
    return [];
  }
}

export async function createProposal(data: {
  inquiryId: string;
  description: string;
  deliverables: ProposalDeliverable[];
  currency: 'INR' | 'USD';
  totalPrice: number;
  advancePercentage: number;
  advanceAmount: number;
  balanceAmount: number;
}): Promise<Proposal> {
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

  const response = await fetch(`${API_BASE_URL}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // Surface detailed validation errors
    const details = error.error?.details?.map((d: any) => `${d.field}: ${d.message}`).join(', ');
    const errorMessage = details || error.error?.message || error.message || 'Failed to create proposal';
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return {
    ...result,
    inquiryId: result.inquiry_id,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
    totalPrice: result.total_price,
    advancePercentage: result.advance_percentage,
    advanceAmount: result.advance_amount,
    balanceAmount: result.balance_amount,
    acceptedAt: result.accepted_at,
    rejectedAt: result.rejected_at,
    editHistory: result.edit_history,
    deliverables: typeof result.deliverables === 'string' 
      ? JSON.parse(result.deliverables) 
      : result.deliverables,
  };
}

export async function updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
  const snakeCaseUpdates: any = {};
  
  if (updates.description !== undefined) snakeCaseUpdates.description = updates.description;
  if (updates.deliverables !== undefined) snakeCaseUpdates.deliverables = updates.deliverables;
  if (updates.currency !== undefined) snakeCaseUpdates.currency = updates.currency;
  if (updates.totalPrice !== undefined) snakeCaseUpdates.total_price = updates.totalPrice;
  if (updates.advancePercentage !== undefined) snakeCaseUpdates.advance_percentage = updates.advancePercentage;
  if (updates.advanceAmount !== undefined) snakeCaseUpdates.advance_amount = updates.advanceAmount;
  if (updates.balanceAmount !== undefined) snakeCaseUpdates.balance_amount = updates.balanceAmount;
  if (updates.status !== undefined) snakeCaseUpdates.status = updates.status;
  if (updates.feedback !== undefined) snakeCaseUpdates.feedback = updates.feedback;

  const response = await fetch(`${API_BASE_URL}/proposal-detail/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snakeCaseUpdates),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update proposal');
  }

  const result = await response.json();
  return {
    ...result,
    inquiryId: result.inquiry_id,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
    totalPrice: result.total_price,
    advancePercentage: result.advance_percentage,
    advanceAmount: result.advance_amount,
    balanceAmount: result.balance_amount,
    acceptedAt: result.accepted_at,
    rejectedAt: result.rejected_at,
    editHistory: result.edit_history,
    deliverables: typeof result.deliverables === 'string' 
      ? JSON.parse(result.deliverables) 
      : result.deliverables,
  };
}

export async function updateProposalStatus(
  id: string,
  status: ProposalStatus,
  additionalData?: {
    feedback?: string;
  }
): Promise<Proposal> {
  const response = await fetch(`${API_BASE_URL}/proposal-detail/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, feedback: additionalData?.feedback }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update proposal status');
  }

  const result = await response.json();
  return {
    ...result,
    inquiryId: result.inquiry_id,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
    totalPrice: result.total_price,
    advancePercentage: result.advance_percentage,
    advanceAmount: result.advance_amount,
    balanceAmount: result.balance_amount,
    acceptedAt: result.accepted_at,
    rejectedAt: result.rejected_at,
    editHistory: result.edit_history,
    deliverables: typeof result.deliverables === 'string' 
      ? JSON.parse(result.deliverables) 
      : result.deliverables,
  };
}

export async function deleteProposal(id: string): Promise<void> {
  throw new Error('Delete proposal not supported - mark as rejected instead');
}

export async function getProposalsByStatus(status: ProposalStatus): Promise<Proposal[]> {
  const proposals = await getProposals();
  return proposals.filter(p => p.status === status);
}

export async function incrementProposalVersion(
  proposalId: string,
  reason?: string
): Promise<Proposal> {
  throw new Error('incrementProposalVersion not yet implemented');
}

export function clearAllProposals(): void {
  throw new Error('clearAllProposals not supported with database backend');
}
