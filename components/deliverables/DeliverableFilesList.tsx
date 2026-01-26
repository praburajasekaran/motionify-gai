import React, { useRef, useState, useEffect } from 'react';
import { FileVideo, FileImage, FileText, Download, Upload, Trash2, Play } from 'lucide-react';
import { Button, Badge } from '@/components/ui/design-system';
import { Deliverable } from '@/types/deliverable.types';
import { storageService } from '@/services/storage';

export interface DeliverableFilesListProps {
    deliverable: Deliverable;
    canUploadBeta: boolean;
    canUploadFinal?: boolean;
    onUpload: (file: File) => void;
    onFilesChange?: () => void; // Callback when files list changes
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
    thumbnailUrl?: string;
    mediaType: 'video' | 'image' | 'document';
}

export const DeliverableFilesList: React.FC<DeliverableFilesListProps> = ({
    deliverable,
    canUploadBeta,
    canUploadFinal,
    onUpload,
    onFilesChange,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileItems, setFileItems] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
        // Reset input
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

            // Remove from local state
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

            // Transform to FileItem format
            const items: FileItem[] = files.map(f => ({
                id: f.id,
                key: f.file_key,
                name: f.label || f.file_name,
                category: f.file_category,
                isFinal: f.is_final,
                date: new Date(f.uploaded_at).toLocaleDateString(),
                size: f.file_size ? formatFileSize(f.file_size) : 'Unknown',
                mediaType: getMediaType(f.file_key),
            }));

            // Load thumbnails for images and videos
            const itemsWithThumbnails = await Promise.all(items.map(async (item) => {
                try {
                    if (item.mediaType === 'image') {
                        if (item.isFinal) {
                            return { ...item, thumbnailUrl: storageService.getPublicUrl(item.key) };
                        } else {
                            const url = await storageService.getDownloadUrl(item.key);
                            return { ...item, thumbnailUrl: url || undefined };
                        }
                    } else if (item.mediaType === 'video') {
                        const thumbKey = item.key.replace(/\.[^/.]+$/, '-thumb.jpg');
                        if (item.isFinal) {
                            return { ...item, thumbnailUrl: storageService.getPublicUrl(thumbKey) };
                        } else {
                            const url = await storageService.getDownloadUrl(thumbKey);
                            return { ...item, thumbnailUrl: url || undefined };
                        }
                    }
                } catch (e) {
                    console.warn("Failed to load thumbnail for", item.key, e);
                }
                return item;
            }));

            setFileItems(itemsWithThumbnails);
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


    // Helper to determine media type
    const getMediaType = (key: string): 'video' | 'image' | 'document' => {
        const ext = key.split('.').pop()?.toLowerCase();
        if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return 'video';
        if (['jpg', 'png', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image';
        return 'document';
    };

    // Define icons fallback
    const getIcon = (mediaType: string) => {
        if (mediaType === 'video') return FileVideo;
        if (mediaType === 'image') return FileImage;
        return FileText;
    };

    // Expose refresh method for parent
    const refreshFiles = () => {
        fetchFiles();
    };

    // Attach to window for parent component access (temporary solution)
    useEffect(() => {
        (window as any).__refreshDeliverableFiles = refreshFiles;
        return () => {
            delete (window as any).__refreshDeliverableFiles;
        };
    }, [deliverable.id]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900">Files ({fileItems.length})</h3>
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
                <div className="text-center py-12 bg-zinc-50 rounded-lg border border-zinc-200">
                    <p className="text-zinc-500 text-sm">Loading files...</p>
                </div>
            ) : fileItems.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-200">
                    <div className="flex justify-center mb-3">
                        <FileVideo className="h-10 w-10 text-zinc-300" />
                    </div>
                    <p className="text-zinc-500 text-sm">No files uploaded yet.</p>
                    {canUploadBeta && (
                        <Button variant="link" onClick={handleUploadClick} className="mt-2 text-indigo-600">
                            Upload your first file
                        </Button>
                    )}
                </div>
            ) : (
                <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
                    {fileItems.map((file) => {
                        const Icon = getIcon(file.mediaType);
                        return (
                            <div key={file.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    {/* Thumbnail */}
                                    <div className="h-16 w-24 bg-zinc-100 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-200 shrink-0 relative">
                                        {file.thumbnailUrl ? (
                                            <>
                                                <img src={file.thumbnailUrl} alt={file.name} className="h-full w-full object-cover" />
                                                {file.mediaType === 'video' && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                        <Play className="h-6 w-6 text-white drop-shadow-md" fill="currentColor" />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <Icon className="h-6 w-6 text-zinc-400" />
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-900">{file.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                            <Badge variant={file.isFinal ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
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
