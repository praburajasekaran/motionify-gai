import { useQuery, keepPreviousData } from '@tanstack/react-query';

export interface DeliverableSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  progress: number;
  dueDate: string;
}

export const deliverableKeys = {
  all: ['deliverables'] as const,
  list: (projectId: string) => [...deliverableKeys.all, 'list', projectId] as const,
};

export async function fetchDeliverables(projectId: string): Promise<DeliverableSummary[]> {
  const res = await fetch(`/api/deliverables?projectId=${projectId}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load deliverables');
  const data = await res.json();

  return (data || []).map((d: any) => ({
    id: d.id,
    title: d.name || d.title || 'Untitled',
    type: d.type || 'Video',
    status: d.status || 'pending',
    progress: d.progress || 0,
    dueDate: d.estimated_completion_week
      ? new Date(Date.now() + d.estimated_completion_week * 7 * 24 * 60 * 60 * 1000).toISOString()
      : new Date().toISOString(),
  }));
}

export function useDeliverables(projectId: string | undefined) {
  return useQuery({
    queryKey: deliverableKeys.list(projectId!),
    queryFn: () => fetchDeliverables(projectId!),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
}
