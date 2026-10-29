import { useQuery } from '@tanstack/react-query';

export interface DeliverableFile {
  id: string;
  deliverable_id: string;
  file_key: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  file_category: 'video' | 'script' | 'document' | 'image' | 'audio' | 'asset';
  is_final: boolean;
  label: string | null;
  sort_order: number;
  uploaded_at: string;
  uploaded_by: string | null;
}

export const deliverableFileKeys = {
  all: ['deliverableFiles'] as const,
  list: (userId: string | undefined, deliverableId: string | undefined) =>
    [...deliverableFileKeys.all, userId, deliverableId] as const,
};

export function useDeliverableFiles(userId: string | undefined, deliverableId: string | undefined) {
  return useQuery({
    queryKey: deliverableFileKeys.list(userId, deliverableId),
    queryFn: async ({ signal }): Promise<DeliverableFile[]> => {
      const response = await fetch(`/api/deliverable-files?deliverableId=${encodeURIComponent(deliverableId!)}`, {
        credentials: 'include',
        signal,
      });
      if (!response.ok) throw new Error('Failed to load files');
      return response.json();
    },
    enabled: !!userId && !!deliverableId,
    staleTime: 0,
    retry: false,
    throwOnError: false,
  });
}
