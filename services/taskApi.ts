// Task API Service for Main App
// Communicates with Netlify Functions backend

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

const API_BASE = '/.netlify/functions';

/**
 * Fetch all tasks for a project
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

    const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
        const error = await response.json();
        const errorMessage = typeof error.error === 'string'
            ? error.error
            : JSON.stringify(error.error || error);
        throw new Error(errorMessage || 'Failed to create task');
    }

    return response.json();
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
    const apiPayload: Record<string, unknown> = {};
    if (updates.title) apiPayload.title = updates.title;
    if (updates.description) apiPayload.description = updates.description;
    if (updates.status) apiPayload.status = updates.status;
    if (updates.visibleToClient !== undefined) apiPayload.visibleToClient = updates.visibleToClient;
    if (updates.assigneeId) apiPayload.assignedTo = updates.assigneeId;
    if (updates.deadline) apiPayload.dueDate = new Date(updates.deadline).toISOString();

    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
        const error = await response.json();
        const errorMessage = typeof error.error === 'string'
            ? error.error
            : JSON.stringify(error.error || error);
        throw new Error(errorMessage || 'Failed to update task');
    }

    return response.json();
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to delete task');
    }
}

/**
 * Follow a task
 */
export async function followTask(taskId: string, userId: string): Promise<Task> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
        throw new Error('Failed to follow task');
    }

    return response.json();
}

/**
 * Unfollow a task
 */
export async function unfollowTask(taskId: string, userId: string): Promise<Task> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}/unfollow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
        throw new Error('Failed to unfollow task');
    }

    return response.json();
}

/**
 * Add a comment to a task
 */
export async function addComment(taskId: string, commentData: {
    user_id: string;
    user_name: string;
    content: string;
}): Promise<any> {
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
