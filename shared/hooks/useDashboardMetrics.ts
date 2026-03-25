import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api-config';

export interface DashboardMetrics {
  projects: { total: number; active: number; completed: number };
  proposals: { total: number; pending: number; accepted: number };
  revenue: { total: number; completed: number; pending: number };
  inquiries: { total: number; new: number };
}

export const dashboardMetricsKeys = {
  all: ['dashboard'] as const,
  metrics: () => [...dashboardMetricsKeys.all, 'metrics'] as const,
};

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/dashboard-metrics`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
  const data = await res.json();

  return {
    projects: {
      total: data.totalProjects ?? 0,
      active: data.activeProjects ?? 0,
      completed: (data.totalProjects ?? 0) - (data.activeProjects ?? 0),
    },
    proposals: {
      total: data.totalProposals ?? 0,
      pending: data.pendingProposals ?? 0,
      accepted: data.acceptedProposals ?? 0,
    },
    revenue: {
      total: data.totalRevenue ?? 0,
      completed: data.totalRevenue ?? 0,
      pending: data.pendingRevenue ?? 0,
    },
    inquiries: {
      total: data.totalInquiries ?? 0,
      new: data.newInquiries ?? 0,
    },
  };
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardMetricsKeys.metrics(),
    queryFn: fetchDashboardMetrics,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
}
