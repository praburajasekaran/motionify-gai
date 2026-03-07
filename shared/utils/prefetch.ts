import type { QueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api-config';

/**
 * Route-specific prefetch functions.
 * Each function populates the React Query cache so that when the
 * user navigates, the page can render instantly from cache.
 */

export function prefetchDashboard(queryClient: QueryClient) {
  queryClient.prefetchQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dashboard-metrics`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function prefetchProjectList(queryClient: QueryClient, userId?: string) {
  if (!userId) return;
  queryClient.prefetchQuery({
    queryKey: ['projects', 'list', { userId }],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects?userId=${userId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });
}

export function prefetchProjectDetail(queryClient: QueryClient, projectId: string) {
  queryClient.prefetchQuery({
    queryKey: ['projects', 'detail', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
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
