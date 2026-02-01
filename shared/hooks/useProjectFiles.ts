import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjectFiles,
  createProjectFile,
  deleteProjectFile,
} from '../../services/projectFileApi';

const POLL_INTERVAL = 10_000; // 10 seconds

export const projectFileKeys = {
  all: ['projectFiles'] as const,
  list: (projectId: string) => [...projectFileKeys.all, 'list', projectId] as const,
};

export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: projectFileKeys.list(projectId!),
    queryFn: () => fetchProjectFiles(projectId!),
    enabled: !!projectId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    throwOnError: false,
  });
}

export function useCreateProjectFile(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createProjectFile>[0]) => createProjectFile(data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: projectFileKeys.list(projectId) });
      }
    },
  });
}

export function useDeleteProjectFile(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => deleteProjectFile(fileId),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: projectFileKeys.list(projectId) });
      }
    },
  });
}
