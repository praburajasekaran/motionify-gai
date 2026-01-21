import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Edit2, X, Check, File, FileText, FileImage, Download, Loader2 } from 'lucide-react';
import { getAttachments, getAttachmentDownloadUrl, formatFileSize, type Attachment } from '@/lib/attachments';

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

function getFileIcon(fileType: string) {
    if (fileType.startsWith('image/')) {
        return FileImage;
    } else if (fileType === 'application/pdf') {
        return FileText;
    } else {
        return File;
    }
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
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        loadAttachments();
    }, [comment.id]);

    const loadAttachments = async () => {
        setAttachmentsLoading(true);
        try {
            const fetchedAttachments = await getAttachments(comment.id);
            setAttachments(fetchedAttachments);
        } catch (error) {
            console.error('Failed to load attachments:', error);
        } finally {
            setAttachmentsLoading(false);
        }
    };

    const handleDownload = async (attachment: Attachment, e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloadingId(attachment.id);
        try {
            const downloadData = await getAttachmentDownloadUrl(attachment.id);
            if (downloadData && downloadData.url) {
                // Use fetch + blob to force download (bypasses CORS issues with download attribute)
                const response = await fetch(downloadData.url);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = downloadData.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            } else {
                console.error('Failed to get download URL');
            }
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleOpenFile = async (attachment: Attachment) => {
        try {
            const downloadData = await getAttachmentDownloadUrl(attachment.id);
            if (downloadData && downloadData.url) {
                window.open(downloadData.url, '_blank');
            } else {
                console.error('Failed to get file URL');
            }
        } catch (error) {
            console.error('Failed to open file:', error);
        }
    };

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
                    <>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>

                        {/* Attachments section */}
                        {attachmentsLoading && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading attachments...
                            </div>
                        )}

                        {attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {attachments.map((attachment) => {
                                    const IconComponent = getFileIcon(attachment.fileType);
                                    const isDownloading = downloadingId === attachment.id;

                                    return (
                                        <div
                                            key={attachment.id}
                                            className="flex items-center gap-3 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                                            onClick={() => handleOpenFile(attachment)}
                                        >
                                            <IconComponent className="w-5 h-5 text-gray-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm text-gray-700 hover:text-gray-900 truncate block">
                                                    {attachment.fileName}
                                                </span>
                                                <p className="text-xs text-gray-500">
                                                    {formatFileSize(attachment.fileSize)}
                                                </p>
                                            </div>
                                            {isDownloading ? (
                                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                            ) : (
                                                <button
                                                    onClick={(e) => handleDownload(attachment, e)}
                                                    className="p-1 hover:bg-gray-300 rounded transition-colors"
                                                    title="Download file"
                                                >
                                                    <Download className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
