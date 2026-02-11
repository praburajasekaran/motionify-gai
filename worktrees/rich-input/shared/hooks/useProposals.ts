import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.client';
import type { Proposal, CreateProposalDto } from '../contracts';

export const proposalKeys = {
  all: ['proposals'] as const,
  lists: () => [...proposalKeys.all, 'list'] as const,
  list: (filters: string) => [...proposalKeys.lists(), { filters }] as const,
  details: () => [...proposalKeys.all, 'detail'] as const,
  detail: (id: string) => [...proposalKeys.details(), id] as const,
  byInquiry: (inquiryId: string) => [...proposalKeys.all, 'inquiry', inquiryId] as const,
};

export function useProposals() {
  return useQuery({
    queryKey: proposalKeys.lists(),
    queryFn: api.proposals.list,
  });
}

export function useProposal(id: string | undefined) {
  return useQuery({
    queryKey: proposalKeys.detail(id!),
    queryFn: () => api.proposals.get(id!),
    enabled: !!id,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateProposalDto) => api.proposals.create(data),
    onSuccess: (newProposal) => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
      queryClient.setQueryData(proposalKeys.detail(newProposal.id), newProposal);
      
      if (newProposal.inquiryId) {
        queryClient.invalidateQueries({ 
          queryKey: ['inquiries', 'detail', newProposal.inquiryId] 
        });
      }
    },
  });
}

export function useAcceptProposal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (proposalId: string) => api.proposals.accept(proposalId),
    onSuccess: (proposal) => {
      queryClient.invalidateQueries({ queryKey: proposalKeys.detail(proposal.id) });
      queryClient.invalidateQueries({ queryKey: proposalKeys.lists() });
    },
  });
}
