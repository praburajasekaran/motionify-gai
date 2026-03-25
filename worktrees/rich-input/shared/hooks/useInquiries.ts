import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.client';
import type { Inquiry, CreateInquiryDto } from '../contracts';

export const inquiryKeys = {
  all: ['inquiries'] as const,
  lists: () => [...inquiryKeys.all, 'list'] as const,
  list: (filters: string) => [...inquiryKeys.lists(), { filters }] as const,
  details: () => [...inquiryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inquiryKeys.details(), id] as const,
};

export function useInquiries() {
  return useQuery({
    queryKey: inquiryKeys.lists(),
    queryFn: api.inquiries.list,
  });
}

export function useInquiry(id: string | undefined) {
  return useQuery({
    queryKey: inquiryKeys.detail(id!),
    queryFn: () => api.inquiries.get(id!),
    enabled: !!id,
  });
}

export function useCreateInquiry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateInquiryDto) => api.inquiries.create(data),
    onSuccess: (newInquiry) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
      queryClient.setQueryData(inquiryKeys.detail(newInquiry.id), newInquiry);
    },
  });
}

export function useUpdateInquiry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Inquiry> }) => 
      api.inquiries.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: inquiryKeys.detail(id) });
      const previousInquiry = queryClient.getQueryData(inquiryKeys.detail(id));
      
      queryClient.setQueryData(inquiryKeys.detail(id), (old: Inquiry | undefined) => 
        old ? { ...old, ...data } : old
      );
      
      return { previousInquiry };
    },
    onError: (err, { id }, context) => {
      if (context?.previousInquiry) {
        queryClient.setQueryData(inquiryKeys.detail(id), context.previousInquiry);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
    },
  });
}
