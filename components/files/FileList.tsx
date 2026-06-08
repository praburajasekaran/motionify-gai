import React, { useState, useMemo } from 'react';
import {
    FileVideo, FileImage, FileText, File as FileGeneric,
    Download, Trash2, Loader2,
    AlertTriangle, FolderOpen, Search, FileType, HardDrive
} from 'lucide-react';
import {
    Button, Badge, Avatar, Dialog, useToast, cn
} from '@/components/ui/design-system';
import { ProjectFile } from '@/types';
import { storageService } from '@/services/storage';
import { formatTimestamp } from '@/utils/dateFormatting';

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

interface FileListProps {
    files: ProjectFile[];
    onDelete?: (fileId: string) => void;
}

// File type configuration with distinct visual identities
const FILE_TYPE_CONFIG: Record<string, {
    icon: React.ElementType;
    label: string;
    bgColor: string;
    iconColor: string;
    badgeColor: string;
}> = {
    video: {
        icon: FileVideo,
        label: 'Video',
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
        badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    image: {
        icon: FileImage,
        label: 'Image',
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    pdf: {
        icon: FileText,
        label: 'PDF',
        bgColor: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    document: {
        icon: FileText,
        label: 'Document',
        bgColor: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    other: {
        icon: FileGeneric,
        label: 'File',
        bgColor: 'bg-muted',
        iconColor: 'text-muted-foreground',
        badgeColor: 'bg-muted text-muted-foreground border-border',
    },
};

function getFileTypeConfig(type: string) {
    if (type.startsWith('video/')) return FILE_TYPE_CONFIG.video;
    if (type.startsWith('image/')) return FILE_TYPE_CONFIG.image;
    if (type.includes('pdf')) return FILE_TYPE_CONFIG.pdf;
    if (type.includes('document') || type.includes('word') || type.includes('sheet') || type.includes('presentation')) return FILE_TYPE_CONFIG.document;
    return FILE_TYPE_CONFIG.other;
}

function getExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toUpperCase() || '';
    return ext.length <= 4 ? ext : '';
}

export const FileList: React.FC<FileListProps> = ({ files, onDelete }) => {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { addToast } = useToast();

    // Filter files by search query
    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) return files;
        const query = searchQuery.toLowerCase();
        return files.filter(file =>
            file.name.toLowerCase().includes(query) ||
            file.uploadedBy.name.toLowerCase().includes(query) ||
            file.type.toLowerCase().includes(query)
        );
    }, [files, searchQuery]);

    // Calculate total size
    const totalSize = useMemo(() => {
        return files.reduce((sum, file) => sum + file.size, 0);
    }, [files]);

    const handleDownload = async (file: ProjectFile) => {
        setDownloadingId(file.id);
        try {
            const url = await storageService.getDownloadUrl(file.key);
            if (url) {
                window.open(url, '_blank');
                addToast({
                    title: 'Download Started',
                    description: `Downloading ${file.name}`,
                    variant: 'success'
                });
            } else {
                addToast({
                    title: 'Download Failed',
                    description: 'Could not generate download URL. Please try again.',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error("Download error", error);
            addToast({
                title: 'Download Failed',
                description: 'An error occurred while downloading the file.',
                variant: 'destructive'
            });
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDeleteClick = (file: ProjectFile) => {
        setFileToDelete(file);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete || !onDelete) return;

        setIsDeleting(true);
        try {
            await onDelete(fileToDelete.id);
            addToast({
                title: 'File Deleted',
                description: `${fileToDelete.name} has been removed.`,
                variant: 'success'
            });
        } catch (error) {
            console.error("Delete error", error);
            addToast({
                title: 'Delete Failed',
                description: 'Could not delete the file. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setFileToDelete(null);
        }
    };

    // ─── Empty State ────────────────────────────────────
    if (files.length === 0) {
        return (
            <div className="py-20 text-center">
                <div className="max-w-sm mx-auto">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-muted to-card mx-auto mb-5 flex items-center justify-center border border-border shadow-sm">
                        <FolderOpen className="h-10 w-10 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">No files yet</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                        Shared assets and documents for this project will appear here once uploaded.
                    </p>
                    <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                            <UploadIcon className="h-3.5 w-3.5" />
                            Drop files anywhere or click the upload area above
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Empty Search State ────────────────────────────
    if (filteredFiles.length === 0 && searchQuery.trim()) {
        return (
            <>
                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search files by name, uploader, or type..."
                        aria-label="Search files"
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                </div>
            {/* No results */}
            <div className="py-16 text-center">
                    <div className="h-14 w-14 rounded-xl bg-muted mx-auto mb-4 flex items-center justify-center">
                        <Search className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">No matches found</h3>
                    <p className="text-sm text-muted-foreground">
                        No files match "<span className="font-medium text-foreground">{searchQuery}</span>"
                    </p>
                    <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground" onClick={() => setSearchQuery('')}>
                        Clear search
                    </Button>
                </div>
            </>
        );
    }

    return (
        <>
            {/* ─── Search + Stats Bar ─────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search files..."
                        aria-label="Search files"
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors hover:border-foreground/15"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span className="text-xs font-medium">Clear</span>
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                    <span className="inline-flex items-center gap-1.5">
                        <FileType className="h-4 w-4" />
                        <span className="tabular-nums">
                            <span className="font-semibold text-foreground">{files.length}</span> file{files.length !== 1 ? 's' : ''}
                        </span>
                    </span>
                    <span className="w-px h-4 bg-border" />
                    <span className="inline-flex items-center gap-1.5">
                        <HardDrive className="h-4 w-4" />
                        <span className="font-mono text-xs tabular-nums">{formatBytes(totalSize)}</span>
                    </span>
                </div>
            </div>

            {/* ─── File List ──────────────────────────── */}
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
                {filteredFiles.map((file) => {
                    const config = getFileTypeConfig(file.type);
                    const Icon = config.icon;
                    const ext = getExtension(file.name);
                    const isDownloading = downloadingId === file.id;

                    return (
                        <div
                            key={file.id}
                            className="group flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                        >
                            {/* File Type Icon */}
                            <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 relative",
                                config.bgColor
                            )}>
                                <Icon className={cn("h-6 w-6", config.iconColor)} />
                                {ext && (
                                    <span className={cn(
                                        "absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1 rounded leading-tight",
                                        config.badgeColor
                                    )}>
                                        {ext}
                                    </span>
                                )}
                            </div>

                            {/* File Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm text-foreground truncate" title={file.name}>
                                        {file.name}
                                    </p>
                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 hidden sm:inline-flex", config.badgeColor)}>
                                        {config.label}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                    <span className="font-mono text-[11px]">{formatBytes(file.size)}</span>
                                    <span className="text-border">·</span>
                                    <div className="flex items-center gap-1.5">
                                        <Avatar
                                            src={file.uploadedBy.avatar}
                                            fallback={file.uploadedBy.name[0]}
                                            className="h-4 w-4"
                                        />
                                        <span className="truncate max-w-[100px]">{file.uploadedBy.name}</span>
                                    </div>
                                    <span className="text-border">·</span>
                                    <span title={new Date(file.uploadedAt).toLocaleString()}>
                                        {formatTimestamp(file.uploadedAt) || new Date(file.uploadedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Download — always visible */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(file)}
                                    disabled={isDownloading}
                                    className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                                    title="Download file"
                                >
                                    {isDownloading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                </Button>

                                {/* Delete — visible on hover or always on mobile */}
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(file)}
                                        className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                                        title="Delete file"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ─── Delete Confirmation Dialog ────────── */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Delete File</h3>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                Are you sure you want to delete <span className="font-semibold text-foreground">{fileToDelete?.name}</span>?
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Badge variant="destructive" className="text-[10px]">Irreversible</Badge>
                                <span>This action cannot be undone.</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="min-w-[130px]"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete File
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

// ─── Inline Upload Icon (for empty state) ─────────────
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);
