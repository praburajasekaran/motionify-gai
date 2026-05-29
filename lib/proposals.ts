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
  revisionsIncluded: number;
  revisionsDescription?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  feedback?: string;
  editHistory?: ProposalEditHistory[];
  proposalReviewToken?: string;
  proposalReviewUrl?: string;
}

function mapProposalFromApi(proposal: any): Proposal {
  return {
    ...proposal,
    inquiryId: proposal.inquiry_id ?? proposal.inquiryId,
    createdAt: proposal.created_at ?? proposal.createdAt,
    updatedAt: proposal.updated_at ?? proposal.updatedAt,
    totalPrice: proposal.total_price ?? proposal.totalPrice,
    advancePercentage: proposal.advance_percentage ?? proposal.advancePercentage,
    advanceAmount: proposal.advance_amount ?? proposal.advanceAmount,
    balanceAmount: proposal.balance_amount ?? proposal.balanceAmount,
    acceptedAt: proposal.accepted_at ?? proposal.acceptedAt,
    rejectedAt: proposal.rejected_at ?? proposal.rejectedAt,
    revisionsIncluded: proposal.revisions_included ?? proposal.revisionsIncluded ?? 2,
    revisionsDescription: proposal.revisions_description ?? proposal.revisionsDescription ?? '',
    editHistory: proposal.edit_history ?? proposal.editHistory,
    deliverables: typeof proposal.deliverables === 'string'
      ? JSON.parse(proposal.deliverables)
      : proposal.deliverables,
    proposalReviewToken: proposal.proposalReviewToken,
    proposalReviewUrl: proposal.proposalReviewUrl,
  };
}

export async function getProposals(): Promise<Proposal[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/proposals`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map(mapProposalFromApi);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
}

export async function getProposalById(id: string): Promise<Proposal | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/proposal-detail/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const proposal = await response.json();
    return mapProposalFromApi(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return null;
  }
}

export async function getProposalsByInquiryId(inquiryId: string): Promise<Proposal[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/proposals?inquiryId=${inquiryId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map(mapProposalFromApi);
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
  revisionsIncluded?: number;
  revisionsDescription?: string;
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
  return mapProposalFromApi(result);
}

export async function getPublicProposalById(id: string, token?: string | null): Promise<{ proposal: Proposal | null; accessStatus?: string; error?: string }> {
  const params = new URLSearchParams();
  if (token) params.set('token', token);

  const response = await fetch(`${API_BASE_URL}/public-proposal/${id}${params.toString() ? `?${params.toString()}` : ''}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { proposal: null, accessStatus: data.accessStatus, error: data.message || data.error || 'Proposal link unavailable' };
  }

  return { proposal: mapProposalFromApi(data.proposal), accessStatus: data.accessStatus };
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
  if (updates.revisionsIncluded !== undefined) snakeCaseUpdates.revisions_included = updates.revisionsIncluded;
  if (updates.revisionsDescription !== undefined) snakeCaseUpdates.revisions_description = updates.revisionsDescription;
  if (updates.version !== undefined) snakeCaseUpdates.version = updates.version;

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
  return mapProposalFromApi(result);
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
  return mapProposalFromApi(result);
}

export async function updatePublicProposalStatus(
  id: string,
  token: string,
  status: Extract<ProposalStatus, 'rejected' | 'changes_requested'>,
  additionalData?: { feedback?: string }
): Promise<Proposal> {
  const response = await fetch(`${API_BASE_URL}/public-proposal/${id}?token=${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, feedback: additionalData?.feedback }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Failed to update proposal status');
  }

  return mapProposalFromApi(await response.json());
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
