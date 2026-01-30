import { Task, Comment } from '../types';
import { apiFetch } from '../../api-client';

const API_BASE = '/.netlify/functions';

/**
 * Fetch all tasks for a project
 * @param projectId - The project UUID
 * @param includeComments - Whether to include comments in the response
 * @returns Array of tasks
 */
export async function fetchTasksForProject(
  projectId: string,
  includeComments = false
): Promise<Task[]> {
  const url = `${API_BASE}/tasks?projectId=${projectId}&includeComments=${includeComments}`;
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a single task with its comments
 * @param taskId - The task UUID
 * @returns Task with comments
 */
export async function fetchTask(taskId: string): Promise<Task> {
  const url = `${API_BASE}/tasks/${taskId}`;
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Failed to fetch task: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new task
 * @param taskData - Task creation data
 * @returns The created task
 */
export async function createTask(taskData: {
  project_id: string;
  title: string;
  description: string;
  visible_to_client?: boolean;
  deliverable_id?: string;
  assignee_id?: string;
  deadline?: string;
  delivery?: string;
  status?: string;
}): Promise<Task> {
  // Transform snake_case to camelCase for API schema
  const apiPayload: Record<string, unknown> = {
    projectId: taskData.project_id,
    title: taskData.title,
  };

  if (taskData.description) apiPayload.description = taskData.description;
  if (taskData.assignee_id) apiPayload.assignedTo = taskData.assignee_id;
  if (taskData.deadline) apiPayload.dueDate = taskData.deadline;
  if (taskData.status) apiPayload.status = taskData.status;
  if (taskData.visible_to_client !== undefined) apiPayload.visible_to_client = taskData.visible_to_client;

  const response = await apiFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(apiPayload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create task');
  }

  return response.json();
}

/**
 * Update an existing task
 * @param taskId - The task UUID
 * @param updates - Partial task data to update
 * @returns The updated task
 */
export async function updateTaskAPI(
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    status?: string;
    visibleToClient?: boolean;
    deliverableId?: string;
    assigneeId?: string;
    deadline?: string;
    delivery?: string;
  }
): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update task');
  }

  return response.json();
}

/**
 * Delete a task
 * @param taskId - The task UUID
 */
export async function deleteTaskAPI(taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
}

/**
 * Add a comment to a task
 * @param taskId - The task UUID
 * @param commentData - Comment data
 * @returns The created comment
 */
export async function addTaskComment(
  taskId: string,
  commentData: {
    user_id: string;
    user_name: string;
    content: string;
  }
): Promise<Comment> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(commentData),
  });

  if (!response.ok) {
    throw new Error('Failed to add comment');
  }

  return response.json();
}
