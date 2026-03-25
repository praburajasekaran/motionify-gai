import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api-config';

export interface Activity {
  id: string;
  type: string;
  userId: string;
  userName: string;
  targetUserId?: string;
  targetUserName?: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  details: Record<string, string | number>;
  timestamp: number;
  inquiryNumber?: string;
  proposalName?: string;
  projectName?: string;
}

export const dashboardActivityKeys = {
  all: ['dashboard', 'activities'] as const,
  list: () => [...dashboardActivityKeys.all, 'list'] as const,
};

export async function fetchDashboardActivities(): Promise<Activity[]> {
  const res = await fetch(`${API_BASE}/activities?limit=10`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch activities: ${res.status}`);
  return res.json();
}

export function useDashboardActivities() {
  return useQuery({
    queryKey: dashboardActivityKeys.list(),
    queryFn: fetchDashboardActivities,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
}
