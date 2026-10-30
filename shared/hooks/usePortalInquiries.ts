import { useQuery } from '@tanstack/react-query';
import { mapInquiryFromApi, type Inquiry } from '@/lib/inquiries';
import type { User } from '@/types';
import { ApiError } from '@/shared/utils/api.client';

export const portalInquiryKeys = {
  all: ['portalInquiries'] as const,
  list: (user: User | null) => [...portalInquiryKeys.all, user?.id, user?.role] as const,
};

export function usePortalInquiries(user: User | null) {
  return useQuery({
    queryKey: portalInquiryKeys.list(user),
    enabled: !!user,
    queryFn: async ({ signal }): Promise<Inquiry[]> => {
      const suffix = user?.role === 'client' ? `?clientUserId=${encodeURIComponent(user.id)}` : '';
      const response = await fetch(`/.netlify/functions/inquiries${suffix}`, { credentials: 'include', signal });
      if (!response.ok) throw new ApiError(response.status, 'Failed to load inquiries');
      const data = await response.json();
      return data.map(mapInquiryFromApi);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
    throwOnError: false,
  });
}
