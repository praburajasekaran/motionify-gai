import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { Project } from '@/types';
import { dbStatusToDisplay } from '@/utils/projectStatusMapping';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (userId: string) => [...projectKeys.lists(), { userId }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export async function fetchProjects(userId: string): Promise<Project[]> {
  const res = await fetch(`/api/projects?userId=${userId}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load projects');
  const data = await res.json();

  return data.map((p: any) => ({
    id: p.id,
    title: p.name || p.project_number || `Project ${p.id.slice(0, 8)}`,
    client: p.client_name || p.client_company || 'Client',
    thumbnail: '',
    status: dbStatusToDisplay(p.status),
    dueDate: p.due_date || p.created_at || new Date().toISOString(),
    startDate: p.start_date || p.created_at || new Date().toISOString(),
    progress: 0,
    description: '',
    tasks: [],
    team: [],
    budget: 0,
    deliverables: [],
    files: [],
    deliverablesCount: p.deliverables_count || 0,
    revisionCount: p.revisions_used || 0,
    maxRevisions: p.total_revisions_allowed || 2,
    activityLog: [],
    website: p.client_website || undefined,
  }));
}

export function useProjects(userId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.list(userId!),
    queryFn: () => fetchProjects(userId!),
    enabled: !!userId,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
}

/**
 * Fetch a single project by ID (detail view).
 * Returns a comprehensive Project with all fields (team, description, terms, etc.).
 */
export async function fetchProject(projectId: string): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch project: ${res.status}`);
  const data = await res.json();

  return {
    id: data.id,
    title: data.name || data.project_number || `Project ${data.id.slice(0, 8)}`,
    client: data.client_name || data.client_company || 'Client',
    clientEmail: data.client_email || '',
    clientPhone: data.client_phone || '',
    website: data.website || '',
    thumbnail: '',
    status: dbStatusToDisplay(data.status),
    startDate: data.start_date || data.created_at || new Date().toISOString(),
    dueDate: data.due_date || data.created_at || new Date().toISOString(),
    progress: 0,
    description: data.description || '',
    budget: 0,
    team: (data.team || []).map((m: any) => ({
      id: m.id,
      name: m.name || 'Unknown',
      email: m.email || '',
      avatar: m.avatar || '',
      role: m.role || 'team_member',
    })),
    tasks: [],
    deliverables: [],
    files: [],
    deliverablesCount: data.deliverables_count || 0,
    revisionCount: data.revisions_used ?? 0,
    maxRevisions: data.total_revisions_allowed ?? 2,
    activityLog: [],
    termsAcceptedAt: data.terms_accepted_at,
    termsAcceptedBy: data.terms_accepted_by,
    projectNumber: data.project_number || '',
  };
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id!),
    queryFn: () => fetchProject(id!),
    enabled: !!id,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
}
