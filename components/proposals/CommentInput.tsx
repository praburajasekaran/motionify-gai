import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, X, File } from 'lucide-react';
import { formatFileSize, getPresignedUploadUrl, uploadFile, Attachment } from '@/lib/attachments';

interface CommentInputProps {
    onSubmit: (content: string, attachmentIds?: string[]) => Promise<void>;
    placeholder?: string;
    disabled?: boolean;
    proposalId: string;
    onAttachmentsChange?: (attachments: PendingAttachment[]) => void;
}

interface UploadingFile {
    id: string;
    file: File;
    progress: number;
    error?: string;
}

export interface PendingAttachment {
    tempId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    r2Key: string;
}

export function CommentInput({ onSubmit, placeholder = 'Write a comment...', disabled, proposalId, onAttachmentsChange }: CommentInputProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEmpty = content.trim().length === 0 && pendingAttachments.length === 0;

    const validateFile = (file: File): string | null => {
        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
        ];

        const maxSize = 10 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            return 'Invalid file type. Allowed: PNG, JPG, WebP, PDF, DOCX, DOC, TXT';
        }

        if (file.size > maxSize) {
            return `File size must be 10MB or less (${formatFileSize(file.size)} detected)`;
        }

        return null;
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newUploadingFiles: UploadingFile[] = [];

        for (const file of Array.from(files)) {
            const error = validateFile(file);
            if (error) {
                console.error(`File "${file.name}" error:`, error);
                continue;
            }

            const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            newUploadingFiles.push({
                id: uploadId,
                file,
                progress: 0,
            });
        }

        setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

        for (const uploadingFile of newUploadingFiles) {
            await uploadFileItem(uploadingFile);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadFileItem = async (uploadingFile: UploadingFile) => {
        const { file } = uploadingFile;

        try {
            setUploadingFiles(prev =>
                prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 10 } : f)
            );

            const presignedData = await getPresignedUploadUrl(file.name, file.type, proposalId);
            if (!presignedData) {
                throw new Error('Failed to get upload URL');
            }

            setUploadingFiles(prev =>
                prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 40 } : f)
            );

            const uploadSuccess = await uploadFile(presignedData.uploadUrl, file);
            if (!uploadSuccess) {
                throw new Error('Failed to upload file');
            }

            setUploadingFiles(prev =>
                prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 100 } : f)
            );

            setPendingAttachments(prev => {
                const newAttachments = [
                    ...prev,
                    {
                        tempId: uploadingFile.id,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        r2Key: presignedData.key,
                    },
                ];
                onAttachmentsChange?.(newAttachments);
                return newAttachments;
            });

        } catch (error) {
            console.error('Upload error:', error);
            setUploadingFiles(prev =>
                prev.map(f => f.id === uploadingFile.id ? { ...f, error: 'Upload failed' } : f)
            );
        }
    };

    const removeUploadingFile = (id: string) => {
        setUploadingFiles(prev => prev.filter(f => f.id !== id));
    };

    const removePendingAttachment = (index: number) => {
        setPendingAttachments(prev => {
            const newAttachments = prev.filter((_, i) => i !== index);
            onAttachmentsChange?.(newAttachments);
            return newAttachments;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isEmpty || isSubmitting) return;

        const uploadingCount = uploadingFiles.filter(f => f.progress < 100).length;
        if (uploadingCount > 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(content.trim());
            setContent('');
            setPendingAttachments([]);
            setUploadingFiles([]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.txt"
                className="hidden"
            />

            {uploadingFiles.length > 0 && (
                <div className="space-y-2">
                    {uploadingFiles.map((uploadingFile) => (
                        <div
                            key={uploadingFile.id}
                            className="flex items-center gap-2 p-2 bg-gray-100 rounded-md"
                        >
                            <File className="w-4 h-4 text-gray-500" />
                            <span className="flex-1 text-sm truncate max-w-[150px]">
                                {uploadingFile.file.name}
                            </span>
                            {uploadingFile.error ? (
                                <span className="text-xs text-red-500">{uploadingFile.error}</span>
                            ) : uploadingFile.progress < 100 ? (
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${uploadingFile.progress}%` }}
                                    />
                                </div>
                            ) : (
                                <span className="text-xs text-green-500">Complete</span>
                            )}
                            <button
                                onClick={() => removeUploadingFile(uploadingFile.id)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((attachment, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-sm"
                        >
                            <File className="w-4 h-4" />
                            <span className="max-w-[120px] truncate">
                                {attachment.fileName.length > 20
                                    ? attachment.fileName.substring(0, 20) + '...'
                                    : attachment.fileName}
                            </span>
                            <span className="text-xs opacity-70">
                                {formatFileSize(attachment.fileSize)}
                            </span>
                            <button
                                onClick={() => removePendingAttachment(index)}
                                className="hover:text-violet-900"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Attach files"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled || isSubmitting}
                    className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    rows={1}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!isEmpty && !isSubmitting) {
                                handleSubmit(e);
                            }
                        }
                    }}
                />
                <Button
                    type="submit"
                    disabled={isEmpty || disabled || isSubmitting}
                    className="shrink-0"
                >
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
}
