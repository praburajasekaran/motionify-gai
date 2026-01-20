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
    const response = await fetch(url);

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
    const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
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
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
 */
export async function deleteTask(taskId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
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
        body: JSON.stringify(commentData),
    });

    if (!response.ok) {
        throw new Error('Failed to add comment');
    }

    return response.json();
}
