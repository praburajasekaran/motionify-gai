import { useEffect, useState } from 'react';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import { MessageSquare } from 'lucide-react';

interface Comment {
    id: string;
    proposalId: string;
    userId: string;
    userName: string;
    content: string;
    isEdited: boolean;
    createdAt: string;
    updatedAt: string;
}

interface CommentThreadProps {
    proposalId: string;
    currentUserId?: string;
    currentUserName?: string;
    isAuthenticated: boolean;
}

const API_BASE = 'http://localhost:9999/.netlify/functions';

async function getComments(proposalId: string): Promise<Comment[]> {
    try {
        const response = await fetch(`${API_BASE}/comments?proposalId=${proposalId}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.comments || [];
    } catch (error) {
        console.error('Failed to fetch comments:', error);
        return [];
    }
}

async function createComment(data: { proposalId: string; content: string }): Promise<Comment | null> {
    try {
        const token = localStorage.getItem('portal_token');
        const response = await fetch(`${API_BASE}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) return null;
        const result = await response.json();
        return result.comment || null;
    } catch (error) {
        console.error('Failed to create comment:', error);
        return null;
    }
}

export function CommentThread({ proposalId, currentUserId, currentUserName, isAuthenticated }: CommentThreadProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadComments();
    }, [proposalId]);

    const loadComments = async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedComments = await getComments(proposalId);
            setComments(fetchedComments);
        } catch (err) {
            setError('Failed to load comments');
            console.error('Error loading comments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (content: string) => {
        if (!isAuthenticated) return;

        const newComment = await createComment({ proposalId, content });
        if (newComment) {
            setComments(prev => [...prev, newComment]);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 mt-8">
                <div className="flex items-center gap-2 text-gray-500">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="font-medium">Comments</h3>
                </div>
                <div className="space-y-3">
                    {[1, 2].map(i => (
                        <div key={i} className="flex gap-3 p-4">
                            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm mt-8">
                <div className="flex items-center gap-2 text-gray-500 mb-4">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="font-medium">Comments</h3>
                </div>
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm mt-8">
            <div className="p-6 pb-0">
                <div className="flex items-center gap-2 text-gray-900 mb-4">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="font-medium">Comments</h3>
                    {comments.length > 0 && (
                        <span className="text-sm text-gray-500">({comments.length})</span>
                    )}
                </div>
            </div>

            {comments.length === 0 ? (
                <div className="p-6 pt-2">
                    <p className="text-sm text-gray-500 py-4">No comments yet. Be the first to comment!</p>
                </div>
            ) : (
                <div className="space-y-1 divide-y divide-gray-100 px-6">
                    {comments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            )}

            <div className="p-6 pt-2">
                {isAuthenticated ? (
                    <CommentInput
                        onSubmit={handleSubmit}
                        placeholder="Write a comment..."
                    />
                ) : (
                    <p className="text-sm text-gray-500 pt-2">Sign in to join the conversation</p>
                )}
            </div>
        </div>
    );
}
