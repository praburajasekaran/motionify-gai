import React, { useRef, useState, DragEvent } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { cn } from '@/components/ui/design-system';
import { storageService } from '@/services/storage';
import { toast } from 'sonner';

interface FileUploadProps {
    projectId: string;
    onUploadComplete: (key: string, file: File) => void;
    onError?: (error: Error) => void;
    allowedTypes?: string[];
    maxSizeInBytes?: number;
    folder?: 'beta' | 'final' | 'misc';
}

const FILE_TYPE_HINTS = [
    { label: 'MP4', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { label: 'MOV', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { label: 'PNG', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { label: 'JPG', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { label: 'PDF', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { label: 'AI', color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

export const FileUpload: React.FC<FileUploadProps> = ({
    projectId,
    onUploadComplete,
    onError,
    allowedTypes,
    maxSizeInBytes = 1024 * 1024 * 1024, // 1GB Default
    folder = 'misc' as const
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState<string>('');

    const handleClick = () => {
        if (isUploading) return;
        fileInputRef.current?.click();
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const validateAndUpload = async (file: File) => {
        if (file.size > maxSizeInBytes) {
            const error = new Error(`File too large. Max size is ${(maxSizeInBytes / (1024 * 1024)).toFixed(0)}MB`);
            if (onError) onError(error);
            else toast.error(error.message);
            return;
        }

        if (allowedTypes && allowedTypes.length > 0) {
            const isValidType = allowedTypes.some(type => {
                if (type.endsWith('/*')) {
                    const baseType = type.split('/')[0];
                    return file.type.startsWith(`${baseType}/`);
                }
                return file.type === type;
            });

            if (!isValidType) {
                const error = new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
                if (onError) onError(error);
                else toast.error(error.message);
                return;
            }
        }

        setIsUploading(true);
        setProgress(0);
        setUploadingFileName(file.name);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const key = await storageService.uploadFile(
                file,
                projectId,
                folder,
                (p) => setProgress(p),
                undefined,
                controller.signal
            );

            onUploadComplete(key, file);
        } catch (error) {
            if (error instanceof Error && (error.message === 'Aborted' || error.name === 'AbortError')) {
                console.log("Upload cancelled by user");
                return;
            }
            console.error("Upload failed", error);
            if (onError && error instanceof Error) onError(error);
            else toast.error("Upload failed");
        } finally {
            setIsUploading(false);
            setProgress(0);
            setUploadingFileName('');
            abortControllerRef.current = null;
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await validateAndUpload(file);
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        if (isUploading) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        if (isUploading) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        if (isUploading) return;
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        if (isUploading) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        await validateAndUpload(file);
    };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
            />

            <div
                className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300",
                    isUploading
                        ? "cursor-default border-primary/30 bg-primary/2"
                        : isDragging
                            ? "cursor-grab border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/5"
                            : "cursor-pointer border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm",
                )}
                style={{ minHeight: '180px' }}
                onClick={handleClick}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-4 px-6 py-8 w-full max-w-sm">
                        <div className="relative">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                        </div>
                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="truncate max-w-[200px] font-medium text-foreground" title={uploadingFileName}>
                                    {uploadingFileName}
                                </span>
                                <span className="font-mono text-sm text-muted-foreground tabular-nums">{progress}%</span>
                            </div>
                            <div className="relative flex items-center gap-2">
                                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancel();
                                    }}
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                    title="Cancel upload"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Upload icon */}
                        <div
                            className={cn(
                                "h-14 w-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300",
                                isDragging
                                    ? "bg-primary/10 scale-110"
                                    : "bg-card border border-border group-hover:border-primary/30 shadow-sm"
                            )}
                        >
                            <Upload
                                className={cn(
                                    "h-6 w-6 transition-colors duration-300",
                                    isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                                )}
                            />
                        </div>

                        {/* Text */}
                        <p
                            className={cn(
                                "text-base font-semibold transition-colors",
                                isDragging ? "text-primary" : "text-foreground"
                            )}
                        >
                            {isDragging ? 'Drop file to upload' : 'Upload a file'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Drag & drop or <span className="text-primary underline underline-offset-2 decoration-primary/30 hover:decoration-primary">click to browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                            Max file size: {(maxSizeInBytes / (1024 * 1024 * 1024)).toFixed(0)}GB
                        </p>

                        {/* File type hints */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                            {FILE_TYPE_HINTS.map((hint) => (
                                <span
                                    key={hint.label}
                                    className={cn(
                                        "inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border transition-opacity",
                                        hint.color,
                                        isDragging ? "opacity-80" : "opacity-60 group-hover:opacity-90"
                                    )}
                                >
                                    {hint.label}
                                </span>
                            ))}
                        </div>
                    </>
                )}

                {/* Drag indicator glow */}
                {isDragging && (
                    <div className="absolute inset-0 rounded-xl ring-2 ring-primary/20 ring-offset-2 ring-offset-background pointer-events-none animate-pulse" />
                )}
            </div>
        </>
    );
};
