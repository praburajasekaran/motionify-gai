'use client';

import { getApiBase } from '@/lib/portal/utils/api-config';

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
}

const API_BASE_URL = '/api/proposals';
const USD_TO_INR = 83;

export async function fetchProposals(): Promise<Proposal[]> {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map(mapProposal);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
}


function mapProposal(data: any): Proposal {
  return {
    id: data.id,
    inquiryId: data.inquiry_id || data.inquiryId,
    status: data.status,
    version: data.version,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
    description: data.description,
    deliverables: data.deliverables || [],
    currency: data.currency,
    totalPrice: Number(data.total_price || data.totalPrice),
    advancePercentage: data.advance_percentage || data.advancePercentage,
    advanceAmount: Number(data.advance_amount || data.advanceAmount),
    balanceAmount: Number(data.balance_amount || data.balanceAmount),
    acceptedAt: data.accepted_at || data.acceptedAt,
    rejectedAt: data.rejected_at || data.rejectedAt,
    revisionsIncluded: data.revisions_included ?? data.revisionsIncluded ?? 2,
    revisionsDescription: data.revisions_description ?? data.revisionsDescription ?? undefined,
    feedback: data.feedback,
    editHistory: data.edit_history || data.editHistory,
  };
}

export async function fetchProposalById(id: string): Promise<Proposal | null> {
  // Try Netlify function backend (PostgreSQL — source of truth) first
  try {
    const netlifyBase = getApiBase();
    const response = await fetch(`${netlifyBase}/proposal-detail/${id}`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return mapProposal(data);
    }
  } catch (error) {
    console.error('Error fetching proposal from backend, falling back to local:', error);
  }

  // Fallback to local JSON storage
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return mapProposal(data);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return null;
  }
}

export async function fetchProposalsByInquiryId(inquiryId: string): Promise<Proposal[]> {
  const proposals = await fetchProposals();
  return proposals.filter(p => p.inquiryId === inquiryId);
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
  id?: string;
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

  const proposal = {
    inquiryId: data.inquiryId,
    status: 'sent' as ProposalStatus,
    version: 1,
    description: data.description.trim(),
    deliverables: data.deliverables.map(d => ({
      id: d.id,
      name: d.name.trim(),
      description: d.description.trim(),
      estimatedCompletionWeek: d.estimatedCompletionWeek,
    })),
    currency: data.currency,
    totalPrice: data.totalPrice,
    advancePercentage: data.advancePercentage,
    advanceAmount: data.advanceAmount,
    balanceAmount: data.balanceAmount,
    revisionsIncluded: data.revisionsIncluded ?? 2,
    id: data.id,
  };

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proposal),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create proposal');
  }

  const responseData = await response.json();
  return mapProposal(responseData);
}

export async function updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
  // Update local JSON storage
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update proposal');
  }

  const data = await response.json();
  return mapProposal(data);
}

export async function updateProposalStatus(
  id: string,
  status: ProposalStatus,
  feedback?: string
): Promise<Proposal> {
  const updates: Partial<Proposal> = { status };

  if (status === 'accepted') {
    updates.acceptedAt = new Date().toISOString();
  } else if (status === 'rejected') {
    updates.rejectedAt = new Date().toISOString();
  }

  if (feedback) {
    updates.feedback = feedback;
  }

  // Update local JSON storage
  const result = await updateProposal(id, updates);

  // Also sync status change to Netlify backend (PostgreSQL — source of truth)
  // Uses PATCH which automatically handles accepted_at/rejected_at timestamps
  try {
    const netlifyBase = getApiBase();
    await fetch(`${netlifyBase}/proposal-detail/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, feedback }),
    });
  } catch (error) {
    console.error('Failed to sync proposal status to backend:', error);
  }

  return result;
}

export async function incrementProposalVersion(
  proposalId: string,
  reason?: string
): Promise<Proposal> {
  const currentProposal = await fetchProposalById(proposalId);
  if (!currentProposal) {
    throw new Error('Proposal not found');
  }

  const newVersion = (currentProposal.version || 1) + 1;
  const editHistory = currentProposal.editHistory || [];

  editHistory.push({
    version: currentProposal.version || 1,
    editedAt: new Date().toISOString(),
    reason,
  });

  return updateProposal(proposalId, {
    version: newVersion,
    status: 'sent',
    editHistory,
  });
}

export async function deleteProposal(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete proposal');
  }
}

export async function fetchProposalsByStatus(status: ProposalStatus): Promise<Proposal[]> {
  const proposals = await fetchProposals();
  return proposals.filter(p => p.status === status);
}

export function convertCurrency(
  amount: number,
  from: 'USD' | 'INR',
  to: 'USD' | 'INR'
): number {
  if (from === to) return amount;

  if (from === 'USD' && to === 'INR') {
    return Math.round(amount * USD_TO_INR);
  }

  if (from === 'INR' && to === 'USD') {
    return Math.round(amount / USD_TO_INR);
  }

  return amount;
}

export function formatCurrencyWithConversion(
  amount: number,
  currency: 'USD' | 'INR'
): { primary: string; secondary: string; primarySymbol: string; secondarySymbol: string } {
  const primaryAmount = amount / 100;

  if (currency === 'USD') {
    const inrAmount = Math.round(primaryAmount * USD_TO_INR);
    return {
      primary: `$${primaryAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD`,
      secondary: `₹${inrAmount.toLocaleString('en-IN')} INR`,
      primarySymbol: '$',
      secondarySymbol: '₹',
    };
  } else {
    const usdAmount = Math.round(primaryAmount / USD_TO_INR);
    return {
      primary: `₹${primaryAmount.toLocaleString('en-IN')} INR`,
      secondary: `$${usdAmount.toLocaleString('en-US')} USD`,
      primarySymbol: '₹',
      secondarySymbol: '$',
    };
  }
}

export function formatCurrency(amount: number, currency: 'USD' | 'INR'): string {
  const value = amount / 100;

  if (currency === 'USD') {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  } else {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
export async function ensureProposalExists(proposal: Proposal): Promise<void> {
  const existing = await fetchProposalById(proposal.id);
  if (!existing) {
    console.log('Persisting proposal to backend:', proposal.id);
    await createProposal({
      ...proposal,
      id: proposal.id,
    });
  }
}
