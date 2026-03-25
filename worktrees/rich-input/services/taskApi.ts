// Task API Service for Main App
// Communicates with Netlify Functions backend using centralized API client

import { api } from '../lib/api-config';

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    visibleToClient?: boolean;
    deliverableId?: string;
    assigneeId?: string;
    deadline?: string;
    delivery?: string;
    comments?: any[];
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

/**
 * Map API response fields to frontend Task field names.
 * The backend uses assignedTo/dueDate; the frontend uses assigneeId/deadline.
 */
function mapApiTask(task: any): Task {
    return {
        ...task,
        assigneeId: task.assignedTo || task.assigneeId,
        deadline: task.deadline || task.dueDate,
    };
}

/**
 * Fetch all tasks for a project
 */
export async function fetchTasksForProject(
    projectId: string,
    includeComments = false
): Promise<Task[]> {
    const response = await api.get<Task[]>(`/tasks?projectId=${projectId}&includeComments=${includeComments}`);

    if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch tasks');
    }

    return response.data.map(mapApiTask);
}

/**
 * Create a new task
 */
export async function createTask(taskData: {
    project_id: string;
    title: string;
    description?: string;
    visible_to_client?: boolean;
    deliverable_id?: string;
    assignee_id?: string;
    deadline?: string;
    delivery?: string;
    status?: string;
}): Promise<Task> {
    // Transform snake_case to camelCase for API schema
    // Only include fields that have values to avoid validation errors
    const apiPayload: Record<string, unknown> = {
        projectId: taskData.project_id,
        title: taskData.title,
    };

    if (taskData.description) apiPayload.description = taskData.description;
    if (taskData.assignee_id) apiPayload.assignedTo = taskData.assignee_id;
    if (taskData.deadline) apiPayload.dueDate = new Date(taskData.deadline).toISOString();
    if (taskData.status) apiPayload.status = taskData.status;
    if (taskData.visible_to_client !== undefined) apiPayload.visible_to_client = taskData.visible_to_client;

    const response = await api.post<Task>('/tasks', apiPayload);

    if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create task');
    }

    return mapApiTask(response.data);
}

/**
 * Update an existing task
 */
export async function updateTask(
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
    // Transform to API schema field names
    // Use !== undefined so falsy values (empty string, null) can clear fields
    const apiPayload: Record<string, unknown> = {};
    if (updates.title !== undefined) apiPayload.title = updates.title;
    if (updates.description !== undefined) apiPayload.description = updates.description || null;
    if (updates.status !== undefined) apiPayload.status = updates.status;
    if (updates.visibleToClient !== undefined) apiPayload.visibleToClient = updates.visibleToClient;
    if (updates.assigneeId !== undefined) apiPayload.assignedTo = updates.assigneeId || null;
    if (updates.deadline !== undefined) apiPayload.dueDate = updates.deadline ? new Date(updates.deadline).toISOString() : null;

    const response = await api.patch<Task>(`/tasks/${taskId}`, apiPayload);

    if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update task');
    }

    return mapApiTask(response.data);
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
    const response = await api.delete(`/tasks/${taskId}`);

    if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete task');
    }
}

/**
 * Follow a task
 */
export async function followTask(taskId: string, userId: string): Promise<Task> {
    const response = await api.post<Task>(`/tasks/${taskId}/follow`, { userId });

    if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to follow task');
    }

    return response.data;
}

/**
 * Unfollow a task
 */
export async function unfollowTask(taskId: string, userId: string): Promise<Task> {
    const response = await api.post<Task>(`/tasks/${taskId}/unfollow`, { userId });

    if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to unfollow task');
    }

    return response.data;
}

/**
 * Add a comment to a task
 */
export async function addComment(taskId: string, commentData: {
    user_id: string;
    user_name: string;
    content: string;
}): Promise<any> {
    const response = await api.post(`/tasks/${taskId}/comments`, commentData);

    if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to add comment');
    }

    return response.data;
}
