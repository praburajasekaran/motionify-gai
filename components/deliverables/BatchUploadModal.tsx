import React, { useState, useCallback } from 'react';
import { X, Upload, File as FileIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, Button, Progress, cn } from '../ui/design-system';
import { Deliverable } from '../../types/deliverable.types';
import { storageService } from '../../services/storage';

interface BatchUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    deliverables: Deliverable[];
    onUploadComplete: () => void;
}

interface FileMatch {
    file: File;
    deliverableId: string | null;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({
    isOpen,
    onClose,
    deliverables,
    onUploadComplete,
}) => {
    const [files, setFiles] = useState<File[]>([]);
    const [matches, setMatches] = useState<FileMatch[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Filter for pending deliverables only
    const pendingDeliverables = deliverables.filter(d =>
        ['in_progress', 'rejected', 'approved', 'payment_pending'].includes(d.status)
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files as unknown as File[]);
        processFiles(droppedFiles);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files as unknown as File[]);
            processFiles(selectedFiles);
        }
    };

    const processFiles = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);

        const newMatches: FileMatch[] = newFiles.map(file => {
            // Simple fuzzy match: if filename contains deliverable title
            const match = pendingDeliverables.find(d =>
                file.name.toLowerCase().includes(d.title.toLowerCase()) ||
                d.title.toLowerCase().includes(file.name.split('.')[0].toLowerCase())
            );

            return {
                file,
                deliverableId: match ? match.id : null,
                status: 'pending',
                progress: 0
            };
        });

        setMatches(prev => [...prev, ...newMatches]);
    };

    const handleMatchChange = (fileIndex: number, deliverableId: string) => {
        setMatches(prev => prev.map((m, i) =>
            i === fileIndex ? { ...m, deliverableId } : m
        ));
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setMatches(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadAll = async () => {
        setIsUploading(true);

        // Filter valid matches
        const validMatches = matches.filter(m => m.deliverableId && m.status !== 'success');

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            if (!match.deliverableId || match.status === 'success') continue;

            const deliverable = pendingDeliverables.find(d => d.id === match.deliverableId);
            if (!deliverable) continue;

            // Update status to uploading
            setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'uploading' } : m));

            try {
                const folder = ['approved', 'payment_pending'].includes(deliverable.status) ? 'final' : 'beta';

                // Upload file
                const key = await storageService.uploadFile(
                    match.file,
                    deliverable.projectId,
                    folder,
                    (progress) => {
                        setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, progress } : m));
                    }
                );

                // Helper to generate thumbnail if video
                if (match.file.type.startsWith('video/')) {
                    try {
                        // Dynamic import to avoid circular dependency issues if any, though likely fine
                        const { generateThumbnail } = await import('../../utils/thumbnail');
                        const thumbnailFile = await generateThumbnail(match.file);
                        if (thumbnailFile) {
                            const thumbKey = key.replace(/\.[^/.]+$/, '-thumb.jpg');
                            await storageService.uploadFile(thumbnailFile, deliverable.projectId, folder, undefined, thumbKey);
                        }
                    } catch (err) {
                        console.warn("Thumbnail failed", err);
                    }
                }

                // Update DB
                const updateData = folder === 'beta'
                    ? { beta_file_key: key }
                    : { final_file_key: key };

                await fetch(`/api/deliverables/${deliverable.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData),
                });

                // Mark success
                setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'success', progress: 100 } : m));

            } catch (error) {
                console.error('Upload failed', error);
                setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'error' } : m));
            }
        }

        setIsUploading(false);

        // Check if all done
        if (matches.every(m => m.status === 'success')) {
            setTimeout(() => {
                onUploadComplete();
                onClose();
            }, 1000);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <div className="flex flex-col h-[80vh] w-[95vw] md:w-full max-w-3xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900">Batch Upload</h2>
                        <p className="text-sm text-zinc-500">Drag and drop files to match them with deliverables</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="h-5 w-5" /></Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Drop Zone */}
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                            isDragging ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 hover:border-zinc-300 bg-zinc-50"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-12 w-12 bg-white rounded-full shadow-sm flex items-center justify-center">
                                <Upload className="h-6 w-6 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-900">Click to upload or drag and drop</p>
                                <p className="text-xs text-zinc-500">Video, Image, Documents (max 5GB)</p>
                            </div>
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                id="batch-file-input"
                                onChange={handleFileSelect}
                            />
                            <Button variant="outline" size="sm" onClick={() => document.getElementById('batch-file-input')?.click()}>
                                Select Files
                            </Button>
                        </div>
                    </div>

                    {/* Matches List */}
                    {matches.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-zinc-900">Files ({matches.length})</h3>
                            <div className="space-y-2">
                                {matches.map((match, index) => (
                                    <div key={index} className="bg-white border border-zinc-200 rounded-lg p-3 flex items-center gap-4">
                                        <div className="h-10 w-10 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                                            {match.status === 'success' ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            ) : match.status === 'error' ? (
                                                <AlertCircle className="h-5 w-5 text-red-500" />
                                            ) : (
                                                <FileIcon className="h-5 w-5 text-zinc-400" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-medium text-zinc-900 truncate">{match.file.name}</p>
                                                <span className="text-xs text-zinc-500">{(match.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                            </div>

                                            {/* Match Selector */}
                                            {match.status !== 'success' && match.status !== 'uploading' ? (
                                                <select
                                                    className="w-full text-xs p-1.5 rounded border border-zinc-200 bg-zinc-50 focus:ring-2 focus:ring-indigo-100 outline-none"
                                                    value={match.deliverableId || ''}
                                                    onChange={(e) => handleMatchChange(index, e.target.value)}
                                                >
                                                    <option value="">Select deliverable...</option>
                                                    {pendingDeliverables.map(d => (
                                                        <option key={d.id} value={d.id}>{d.title} ({d.status.replace('_', ' ')})</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="text-xs text-zinc-500 flex items-center gap-2">
                                                    {pendingDeliverables.find(d => d.id === match.deliverableId)?.title}
                                                    {match.status === 'uploading' && <span className="text-indigo-600">({match.progress}%)</span>}
                                                </div>
                                            )}

                                            {/* Progress Bar */}
                                            {match.status === 'uploading' && (
                                                <Progress value={match.progress} className="h-1 mt-2" />
                                            )}
                                        </div>

                                        {match.status !== 'uploading' && match.status !== 'success' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500"
                                                onClick={() => removeFile(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50">
                    <Button variant="ghost" onClick={onClose} disabled={isUploading}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleUploadAll}
                        disabled={isUploading || matches.length === 0 || matches.every(m => !m.deliverableId)}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Uploading...
                            </>
                        ) : (
                            `Upload ${matches.filter(m => m.deliverableId).length} Files`
                        )}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};
