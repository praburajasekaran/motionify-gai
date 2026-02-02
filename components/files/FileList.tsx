import React, { useState } from 'react';
import {
    FileVideo, FileImage, FileText, File as FileGeneric,
    MoreVertical, Download, Trash2, ExternalLink, Loader2,
    AlertTriangle, FolderOpen
} from 'lucide-react';
import {
    Button, Badge, DropdownMenu, DropdownMenuItem,
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
    Avatar, Dialog, DialogHeader, DialogFooter, useToast
} from '@/components/ui/design-system';
import { ProjectFile } from '@/types';
import { storageService } from '@/services/storage';

interface FileListProps {
    files: ProjectFile[];
    onDelete?: (fileId: string) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return FileGeneric;
};

export const FileList: React.FC<FileListProps> = ({ files, onDelete }) => {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { addToast } = useToast();

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
            onDelete(fileToDelete.id);
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

    if (files.length === 0) {
        return (
            <div className="col-span-full py-16 text-center bg-gradient-to-b from-muted/80 to-card rounded-xl border border-dashed border-border">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">No files uploaded yet</p>
                <p className="text-xs text-muted-foreground mt-1">Upload files to share with your team</p>
            </div>
        );
    }

    return (
        <>
            <div className="col-span-full border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-accent">
                        <TableRow>
                            <TableHead className="w-[40%]">Name</TableHead>
                            <TableHead className="w-[15%]">Size</TableHead>
                            <TableHead className="w-[20%]">Uploaded By</TableHead>
                            <TableHead className="w-[15%]">Date</TableHead>
                            <TableHead className="w-[10%] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.map((file) => {
                            const Icon = getFileIcon(file.type);
                            const isDownloading = downloadingId === file.id;

                            return (
                                <TableRow key={file.id} className="hover:bg-accent transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm text-foreground truncate max-w-[200px] sm:max-w-xs" title={file.name}>
                                                    {file.name}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground font-mono text-xs">
                                            {formatBytes(file.size)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar
                                                src={file.uploadedBy.avatar}
                                                fallback={file.uploadedBy.name[0]}
                                                className="h-6 w-6"
                                            />
                                            <span className="text-sm text-foreground truncate max-w-[120px]">
                                                {file.uploadedBy.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">

                                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={() => handleDownload(file)}
                                                disabled={isDownloading}
                                                title="Download"
                                            >
                                                {isDownloading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                            </Button>

                                            <DropdownMenu trigger={
                                                <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            }>
                                                <DropdownMenuItem onClick={() => handleDownload(file)}>
                                                    <Download className="h-4 w-4 mr-2" /> Download
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(storageService.getPublicUrl(file.key), '_blank')}>
                                                    <ExternalLink className="h-4 w-4 mr-2" /> Open Public Link
                                                </DropdownMenuItem>
                                                {onDelete && (
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(file)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <div className="p-6 max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Delete File</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete <span className="font-semibold">{fileToDelete?.name}</span>?
                            This action cannot be undone.
                        </p>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
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
                            className="bg-red-600 hover:bg-red-700"
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
                    </DialogFooter>
                </div>
            </Dialog>
        </>
    );
};
