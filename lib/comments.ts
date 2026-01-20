import { api } from './api-config';

export interface Comment {
    id: string;
    proposalId: string;
    userId: string;
    userName: string;
    content: string;
    isEdited: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCommentData {
    proposalId: string;
    content: string;
}

const COMMENTS_ENDPOINT = '/comments';

export async function getComments(proposalId: string, since?: string): Promise<Comment[]> {
    let url = `${COMMENTS_ENDPOINT}?proposalId=${proposalId}`;
    if (since) {
        url += `&since=${encodeURIComponent(since)}`;
    }
    const response = await api.get<Comment[]>(url);

    if (!response.success || !response.data) {
        console.error('Failed to fetch comments:', response.error?.message);
        return [];
    }

    return response.data;
}

export async function createComment(data: CreateCommentData): Promise<Comment | null> {
    const response = await api.post<Comment>(COMMENTS_ENDPOINT, {
        proposalId: data.proposalId,
        content: data.content,
    });

    if (!response.success || !response.data) {
        console.error('Failed to create comment:', response.error?.message);
        return null;
    }

    return response.data;
}
