import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTasksForProject,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
} from '../../services/taskApi';
import type { Task } from '../../services/taskApi';

const POLL_INTERVAL = 10_000; // 10 seconds

export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
};

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.list(projectId!),
    queryFn: () => fetchTasksForProject(projectId!, true),
    enabled: !!projectId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
    throwOnError: false,
  });
}

export function useCreateTask(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: Parameters<typeof createTaskApi>[0]) => createTaskApi(taskData),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
      }
    },
  });
}

export function useUpdateTask(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Parameters<typeof updateTaskApi>[1] }) =>
      updateTaskApi(taskId, updates),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
      }
    },
  });
}

export function useDeleteTask(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTaskApi(taskId),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
      }
    },
  });
}
