import React, { useRef, useState, useEffect } from 'react';
import { FileVideo, FileImage, FileText, FileAudio, File, Download, Upload, Trash2, Clock, EyeOff } from 'lucide-react';
import { Button, Badge } from '@/components/ui/design-system';
import { Deliverable } from '@/types/deliverable.types';
import { storageService } from '@/services/storage';
import { useDeliverables } from './DeliverableContext';
import { isClient } from '@/utils/deliverablePermissions';

export interface DeliverableFilesListProps {
    deliverable: Deliverable;
    canUploadBeta: boolean;
    canUploadFinal?: boolean;
    onUpload: (file: File) => void;
    onFilesChange?: () => void;
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
}) => {
    const { currentUser } = useDeliverables();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileItems, setFileItems] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
                date: new Date(f.uploaded_at).toLocaleDateString(),
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
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Files ({fileItems.length})</h3>
                {canUploadBeta && (
                    <div>
                        <Button size="sm" onClick={handleUploadClick} className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload File
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept="video/*,image/*,application/pdf"
                        />
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="text-center py-12 bg-muted rounded-lg border border-border">
                    <p className="text-muted-foreground text-sm">Loading files...</p>
                </div>
            ) : fileItems.length === 0 ? (
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
                    {canUploadBeta && (
                        <Button variant="link" onClick={handleUploadClick} className="mt-2 text-indigo-600">
                            Upload your first file
                        </Button>
                    )}
                </div>
            ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
                    {fileItems.map((file) => {
                        const config = getFileTypeConfig(file.category);
                        const Icon = config.icon;
                        return (
                            <div key={file.id} className="p-4 flex items-center justify-between hover:bg-muted transition-colors">
                                <div className="flex items-center gap-4">
                                    {/* File Type Icon */}
                                    <div className={`h-14 w-14 rounded-lg flex items-center justify-center shrink-0 ${config.bgColor}`}>
                                        <Icon className={`h-7 w-7 ${config.iconColor}`} />
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-foreground">{file.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                            <Badge variant={file.isFinal ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0 capitalize">
                                                {file.isFinal ? 'Final' : file.category}
                                            </Badge>
                                            <span>• {file.size}</span>
                                            {file.date !== 'Invalid Date' && <span>• {file.date}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(file.key, file.isFinal)}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    {canUploadBeta && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteFile(file.id)}
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
        </div>
    );
};
