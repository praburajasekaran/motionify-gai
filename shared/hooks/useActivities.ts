import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActivities } from '../../services/activityApi';

const POLL_INTERVAL = 30_000; // 30 seconds

export const activityKeys = {
  all: ['activities'] as const,
  list: (projectId: string) => [...activityKeys.all, 'list', projectId] as const,
};

export function useActivities(projectId: string | undefined) {
  return useQuery({
    queryKey: activityKeys.list(projectId!),
    queryFn: () => fetchActivities({ projectId: projectId!, limit: 50 }),
    enabled: !!projectId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    throwOnError: false,
  });
}

/**
 * Invalidate the activities cache for a project (call after creating an activity).
 */
export function useInvalidateActivities() {
  const queryClient = useQueryClient();
  return (projectId: string) =>
    queryClient.invalidateQueries({ queryKey: activityKeys.list(projectId) });
}
