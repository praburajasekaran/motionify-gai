import type { QueryClient } from '@tanstack/react-query';
import { dashboardMetricsKeys, fetchDashboardMetrics } from '@/shared/hooks/useDashboardMetrics';
import { dashboardActivityKeys, fetchDashboardActivities } from '@/shared/hooks/useDashboardActivities';
import { projectKeys, fetchProjects, fetchProject } from '@/shared/hooks/useProjects';

/**
 * Route-specific prefetch functions.
 * Each function populates the React Query cache so that when the
 * user navigates, the page can render instantly from cache.
 *
 * Uses the same queryFn as the hooks to ensure transformed data
 * is cached consistently (no raw vs transformed mismatch).
 */

export function prefetchDashboard(queryClient: QueryClient) {
  queryClient.prefetchQuery({
    queryKey: dashboardMetricsKeys.metrics(),
    queryFn: fetchDashboardMetrics,
    staleTime: 2 * 60 * 1000,
  });

  queryClient.prefetchQuery({
    queryKey: dashboardActivityKeys.list(),
    queryFn: fetchDashboardActivities,
  });
}

export function prefetchProjectList(queryClient: QueryClient, userId?: string) {
  if (!userId) return;
  queryClient.prefetchQuery({
    queryKey: projectKeys.list(userId),
    queryFn: () => fetchProjects(userId),
  });
}

export function prefetchProjectDetail(queryClient: QueryClient, projectId: string) {
  queryClient.prefetchQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => fetchProject(projectId),
  });
}

/**
 * Match a route path to a prefetch action.
 * Used by PrefetchLink to determine what to prefetch on hover.
 */
export function prefetchForRoute(queryClient: QueryClient, to: string, userId?: string) {
  // Dashboard
  if (to === '/' || to === '/portal' || to === '/portal/') {
    prefetchDashboard(queryClient);
    return;
  }

  // Project list
  if (to === '/projects' || to === '/portal/projects') {
    prefetchProjectList(queryClient, userId);
    return;
  }

  // Project detail: /projects/:id or /projects/:id/tasks etc.
  const projectMatch = to.match(/\/projects\/([^/]+)/);
  if (projectMatch && projectMatch[1] !== 'new') {
    prefetchProjectDetail(queryClient, projectMatch[1]);
    return;
  }
}
