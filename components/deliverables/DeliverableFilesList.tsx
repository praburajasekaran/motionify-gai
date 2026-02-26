import React, { useRef, useState, useEffect, DragEvent } from 'react';
import { FileVideo, FileImage, FileText, FileAudio, File, Download, Upload, Trash2, Clock, EyeOff, Loader2, Play } from 'lucide-react';
import { Button, Badge } from '@/components/ui/design-system';
import { Deliverable } from '@/types/deliverable.types';
import { storageService } from '@/services/storage';
import { useDeliverables } from './DeliverableContext';
import { isClient } from '@/utils/deliverablePermissions';
import { formatTimestamp, formatDateTime } from '@/utils/dateFormatting';

export interface DeliverableFilesListProps {
    deliverable: Deliverable;
    canUploadBeta: boolean;
    canUploadFinal?: boolean;
    onUpload: (file: File) => void;
    onFilesChange?: () => void;
    isUploading?: boolean;
    uploadProgress?: number;
    uploadingFileName?: string;
    activeFileKey?: string;
    onVideoFileSelect?: (fileKey: string, fileName: string) => void;
}

// Database file record from deliverable_files table
interface DeliverableFile {
    id: string;
    deliverable_id: string;
    file_key: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    file_category: 'video' | 'script' | 'document' | 'image' | 'audio' | 'asset';
    is_final: boolean;
    label: string | null;
    sort_order: number;
    uploaded_at: string;
    uploaded_by: string | null;
}

interface FileItem {
    id: string;
    key: string;
    name: string;
    category: string;
    isFinal: boolean;
    date: string;
    size: string;
}

// Icon and color config for each file type
const FILE_TYPE_CONFIG: Record<string, { icon: typeof FileVideo; bgColor: string; iconColor: string }> = {
    video: { icon: FileVideo, bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
    image: { icon: FileImage, bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
    document: { icon: FileText, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
    script: { icon: FileText, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
    audio: { icon: FileAudio, bgColor: 'bg-pink-50', iconColor: 'text-pink-500' },
    asset: { icon: File, bgColor: 'bg-zinc-100', iconColor: 'text-zinc-500' },
};

export const DeliverableFilesList: React.FC<DeliverableFilesListProps> = ({
    deliverable,
    canUploadBeta,
    canUploadFinal,
    onUpload,
    onFilesChange,
    isUploading = false,
    uploadProgress = 0,
    uploadingFileName = '',
    activeFileKey,
    onVideoFileSelect,
}) => {
    const { currentUser } = useDeliverables();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileItems, setFileItems] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Clients cannot see files when deliverable is still in beta_ready (not yet sent for review)
    const filesHiddenForClient = currentUser && isClient(currentUser) && deliverable.status === 'beta_ready';

    // Helper to open file
    const handleDownload = async (key: string | undefined, isFinal: boolean) => {
        if (!key) return;
        try {
            let url;
            if (isFinal) {
                url = storageService.getPublicUrl(key);
            } else {
                url = await storageService.getDownloadUrl(key);
            }
            if (url) window.open(url, '_blank');
        } catch (e) {
            console.error("Failed to get download URL", e);
            alert("Failed to open file");
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpload) {
            onUpload(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file && onUpload) {
            onUpload(file);
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        setDeletingId(fileId);
        try {
            const response = await fetch(`/api/deliverable-files/${fileId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to delete file');
            }

            setFileItems(prev => prev.filter(f => f.id !== fileId));
            onFilesChange?.();
        } catch (e) {
            console.error("Failed to delete file", e);
            alert("Failed to delete file");
        } finally {
            setDeletingId(null);
        }
    };

    // Fetch files from deliverable_files table
    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/deliverable-files?deliverableId=${deliverable.id}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }

            const files: DeliverableFile[] = await response.json();

            // Transform to FileItem format (no thumbnails needed)
            const items: FileItem[] = files.map(f => ({
                id: f.id,
                key: f.file_key,
                name: f.label || f.file_name,
                category: f.file_category,
                isFinal: f.is_final,
                date: f.uploaded_at,
                size: f.file_size ? formatFileSize(f.file_size) : 'Unknown',
            }));

            setFileItems(items);
        } catch (e) {
            console.error("Failed to fetch deliverable files", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [deliverable.id]);

    // Helper to format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };

    // Get icon config for file category
    const getFileTypeConfig = (category: string) => {
        return FILE_TYPE_CONFIG[category] || FILE_TYPE_CONFIG.asset;
    };

    // Expose refresh method for parent
    const refreshFiles = () => {
        fetchFiles();
    };

    useEffect(() => {
        (window as any).__refreshDeliverableFiles = refreshFiles;
        return () => {
            delete (window as any).__refreshDeliverableFiles;
        };
    }, [deliverable.id]);

    if (filesHiddenForClient) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-900">Files</h3>
                <div className="text-center py-12 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="flex justify-center mb-3">
                        <EyeOff className="h-10 w-10 text-zinc-300" />
                    </div>
                    <p className="text-sm text-zinc-500">
                        Files will be available once this deliverable is sent for your review.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Files ({fileItems.length})</h3>

            {/* Hidden file input */}
            {canUploadBeta && (
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept="video/*,image/*,application/pdf"
                />
            )}

            {isLoading ? (
                <div className="text-center py-12 bg-muted rounded-lg border border-border">
                    <p className="text-muted-foreground text-sm">Loading files...</p>
                </div>
            ) : fileItems.length === 0 && !canUploadBeta ? (
                <div className="text-center py-12 bg-muted rounded-lg border-2 border-dashed border-border">
                    <div className="flex justify-center mb-3">
                        {deliverable.status === 'pending' || deliverable.status === 'in_progress' ? (
                            <Clock className="h-10 w-10 text-muted-foreground" />
                        ) : (
                            <FileVideo className="h-10 w-10 text-muted-foreground" />
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {deliverable.status === 'pending'
                            ? 'This deliverable has not been started yet. Files will appear here once work begins.'
                            : deliverable.status === 'in_progress'
                            ? 'This deliverable is currently being worked on. Files will appear here once ready for review.'
                            : 'No files uploaded yet.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* File list */}
                    {fileItems.length > 0 && (
                        <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
                            {fileItems.map((file) => {
                                const config = getFileTypeConfig(file.category);
                                const Icon = config.icon;
                                const isVideoFile = file.category === 'video';
                                const isActive = isVideoFile && file.key === activeFileKey;
                                const isClickable = isVideoFile && !!onVideoFileSelect && !isActive;
                                return (
                                    <div
                                        key={file.id}
                                        className={`p-4 flex items-center justify-between transition-colors ${
                                            isActive
                                                ? 'bg-purple-50/60'
                                                : isClickable
                                                ? 'hover:bg-muted cursor-pointer'
                                                : 'hover:bg-muted'
                                        }`}
                                        onClick={isClickable ? () => onVideoFileSelect(file.key, file.name) : undefined}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`h-14 w-14 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-purple-100' : config.bgColor}`}>
                                                <Icon className={`h-7 w-7 ${isActive ? 'text-purple-600' : config.iconColor}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-medium text-foreground">{file.name}</h4>
                                                    {isActive && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                                            <Play className="h-2.5 w-2.5 fill-current" />
                                                            Now Playing
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <Badge variant={file.isFinal ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0 capitalize">
                                                        {file.isFinal ? 'Final' : file.category}
                                                    </Badge>
                                                    <span>• {file.size}</span>
                                                    {file.date && <span title={formatDateTime(file.date) || undefined}>• {formatTimestamp(file.date) || new Date(file.date).toLocaleDateString()}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {isClickable && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); onVideoFileSelect(file.key, file.name); }}
                                                    className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                                    title="Preview this video"
                                                >
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(file.key, file.isFinal); }}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            {canUploadBeta && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
                                                    disabled={deletingId === file.id}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Drag-and-drop upload zone */}
                    {canUploadBeta && (
                        <div
                            className={`
                                relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
                                ${isUploading
                                    ? 'border-primary/40 bg-primary/5 pointer-events-none'
                                    : isDragging
                                    ? 'border-primary bg-primary/5 scale-[1.01]'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }
                            `}
                            onClick={!isUploading ? handleUploadClick : undefined}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            {isUploading ? (
                                <div className="flex items-center gap-4 px-5 py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="truncate text-foreground font-medium">{uploadingFileName}</span>
                                            <span className="font-mono text-muted-foreground ml-3">{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-6">
                                    <div className={`
                                        h-10 w-10 rounded-full flex items-center justify-center mb-2 transition-colors
                                        ${isDragging ? 'bg-primary/10' : 'bg-muted'}
                                    `}>
                                        <Upload className={`h-5 w-5 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </div>
                                    <p className={`text-sm font-medium ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {isDragging ? 'Drop file here' : 'Drag & drop files here, or click to browse'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Video, images, or PDF up to 500MB
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
