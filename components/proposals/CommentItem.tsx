import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Edit2, X, Check } from 'lucide-react';

function formatDistanceToNow(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString();
}

interface CommentItemProps {
    comment: {
        id: string;
        userId: string;
        userName: string;
        content: string;
        isEdited: boolean;
        createdAt: string;
        updatedAt: string;
    };
    currentUserId?: string;
    onEdit?: (id: string, newContent: string) => void;
}

export function CommentItem({ comment, currentUserId, onEdit }: CommentItemProps) {
    const isOwner = currentUserId === comment.userId;
    const isRecentlyCreated = Date.now() - new Date(comment.createdAt).getTime() < 60000;
    const showEditedBadge = comment.isEdited && !isRecentlyCreated;

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const trimmedContent = editContent.trim();
        if (!trimmedContent || trimmedContent === comment.content) {
            setIsEditing(false);
            setEditContent(comment.content);
            return;
        }

        setIsSaving(true);
        try {
            await onEdit?.(comment.id, trimmedContent);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditContent(comment.content);
    };

    return (
        <div className="flex gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
            <Avatar className="h-8 w-8">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&background=random`} />
                <AvatarFallback className="text-xs">{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{comment.userName}</span>
                    <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt))}
                    </span>
                    {showEditedBadge && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Edit2 className="w-3 h-3" />
                            edited
                        </span>
                    )}
                    {isOwner && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit comment"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                            disabled={isSaving}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !editContent.trim()}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check className="w-3 h-3" />
                                Save
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                            >
                                <X className="w-3 h-3" />
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
                )}
            </div>
        </div>
    );
}
