import { useEffect, useState, useRef } from 'react';
import { CommentItem } from './CommentItem';
import { CommentInput, type PendingAttachment } from './CommentInput';
import { getComments, createComment, updateComment, type Comment } from '@/lib/comments';
import { createAttachment } from '@/lib/attachments';
import { MessageSquare } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

interface CommentThreadProps {
    proposalId: string;
    currentUserId?: string;
    currentUserName?: string;
    isAuthenticated: boolean;
}

export function CommentThread({ proposalId, currentUserId, currentUserName, isAuthenticated }: CommentThreadProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastPolledAt, setLastPolledAt] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
    const { addNotification } = useNotifications();

    const scrollPosRef = useRef<{ container: number; active: boolean }>({ container: 0, active: false });

    useEffect(() => {
        loadComments();

        const POLL_INTERVAL = 10000;
        let intervalId: ReturnType<typeof setInterval>;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (!intervalId) {
                    intervalId = setInterval(pollForNewComments, POLL_INTERVAL);
                }
            } else {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = undefined;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        intervalId = setInterval(pollForNewComments, POLL_INTERVAL);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [proposalId]);

    const loadComments = async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedComments = await getComments(proposalId);
            setComments(fetchedComments);
            if (fetchedComments.length > 0) {
                const latest = fetchedComments[fetchedComments.length - 1];
                setLastPolledAt(latest.createdAt);
            } else {
                setLastPolledAt(new Date().toISOString());
            }
        } catch (err) {
            setError('Failed to load comments');
            console.error('Error loading comments:', err);
        } finally {
            setLoading(false);
        }
    };

    const pollForNewComments = async () => {
        try {
            const newComments = await getComments(proposalId, lastPolledAt || undefined);
            if (newComments.length > 0) {
                const wasActive = scrollPosRef.current.active && scrollPosRef.current.container > 100;

                setComments(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const trulyNew = newComments.filter(c => !existingIds.has(c.id));
                    if (trulyNew.length === 0) return prev;
                    
                    // Show notification for new comments from other users
                    trulyNew.forEach(comment => {
                        if (comment.userId !== currentUserId) {
                            addNotification({
                                type: 'comment_created',
                                title: 'New Comment',
                                message: `${comment.userName} commented on the proposal`,
                                actionUrl: `/proposal/${proposalId}`,
                                projectId: proposalId,
                            });
                        }
                    });
                    
                    return [...prev, ...trulyNew];
                });
                const latest = newComments[newComments.length - 1];
                setLastPolledAt(latest.createdAt);

                if (wasActive && scrollContainerRef.current) {
                    requestAnimationFrame(() => {
                        if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTop = scrollPosRef.current.container;
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Error polling for new comments:', err);
        }
    };

    const handleSubmit = async (content: string) => {
        if (!isAuthenticated) return;

        const newComment = await createComment({ proposalId, content });
        if (newComment) {
            // Create attachment records for pending attachments
            for (const pending of pendingAttachmentsRef.current) {
                await createAttachment(
                    newComment.id,
                    pending.fileName,
                    pending.fileType,
                    pending.fileSize,
                    pending.r2Key
                );
            }
            
            // Clear pending attachments
            pendingAttachmentsRef.current = [];
            
            setComments(prev => [...prev, newComment]);
        }
    };

    const handleEdit = async (id: string, newContent: string) => {
        const updated = await updateComment(id, newContent);
        if (updated) {
            setComments(prev => prev.map(c => c.id === id ? updated : c));
        }
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            scrollPosRef.current = {
                container: scrollContainerRef.current.scrollTop,
                active: true,
            };
        }
    };

    const handleAttachmentsChange = (attachments: PendingAttachment[]) => {
        pendingAttachmentsRef.current = attachments;
    };

    if (loading) {
        return (
            <div className="space-y-4">
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
            <div className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-4">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="font-medium">Comments</h3>
                </div>
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center gap-2 text-gray-900 mb-4">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-medium">Comments</h3>
                {comments.length > 0 && (
                    <span className="text-sm text-gray-500">({comments.length})</span>
                )}
            </div>

            {comments.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No comments yet. Be the first to comment!</p>
            ) : (
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="space-y-1 mb-4 divide-y divide-gray-100 max-h-[500px] overflow-y-auto"
                >
                    {comments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            currentUserId={currentUserId}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}

            {isAuthenticated ? (
                <div className="pt-2">
                    <CommentInput
                        proposalId={proposalId}
                        onSubmit={handleSubmit}
                        placeholder="Write a comment..."
                        onAttachmentsChange={handleAttachmentsChange}
                    />
                </div>
            ) : (
                <p className="text-sm text-gray-500 pt-2">Sign in to join the conversation</p>
            )}
        </div>
    );
}
