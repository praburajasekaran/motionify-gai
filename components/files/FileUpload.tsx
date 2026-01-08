import React, { useRef, useState, DragEvent } from 'react';
import { Upload, Loader2, PlusCircle, FileVideo, FileImage, FileText, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/design-system';
import { storageService } from '@/services/storage';

interface FileUploadProps {
    projectId: string;
    onUploadComplete: (key: string, file: File) => void;
    onError?: (error: Error) => void;
    allowedTypes?: string[];
    maxSizeInBytes?: number;
    folder?: 'beta' | 'final' | 'misc';
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('image/')) return FileImage;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return FileIcon;
};

export const FileUpload: React.FC<FileUploadProps> = ({
    projectId,
    onUploadComplete,
    onError,
    allowedTypes,
    maxSizeInBytes = 500 * 1024 * 1024, // 500MB Default
    folder = 'misc' as const
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState<string>('');

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const validateAndUpload = async (file: File) => {
        // 1. Validation
        if (file.size > maxSizeInBytes) {
            const error = new Error(`File too large. Max size is ${(maxSizeInBytes / (1024 * 1024)).toFixed(0)}MB`);
            if (onError) onError(error);
            else alert(error.message);
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
                else alert(error.message);
                return;
            }
        }

        // 2. Upload
        setIsUploading(true);
        setProgress(0);
        setUploadingFileName(file.name);

        try {
            const key = await storageService.uploadFile(
                file,
                projectId,
                folder,
                (p) => setProgress(p)
            );

            onUploadComplete(key, file);
        } catch (error) {
            console.error("Upload failed", error);
            if (onError && error instanceof Error) onError(error);
            else alert("Upload failed");
        } finally {
            setIsUploading(false);
            setProgress(0);
            setUploadingFileName('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await validateAndUpload(file);
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

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        await validateAndUpload(file);
    };

    const FileTypeIcon = uploadingFileName ? getFileIcon(uploadingFileName.split('.').pop() || '') : PlusCircle;

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            <div
                className={`
                    group flex flex-col items-center justify-center 
                    border-dashed border-2 
                    aspect-video rounded-xl
                    cursor-pointer transition-all duration-200
                    ${isUploading ? 'pointer-events-none opacity-80' : ''}
                    ${isDragging
                        ? 'bg-primary/5 border-primary scale-[1.02] shadow-lg'
                        : 'bg-zinc-50/50 hover:bg-zinc-50 border-zinc-300 hover:border-primary/50'
                    }
                `}
                onClick={handleClick}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-3 px-4 w-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div className="w-full max-w-[200px]">
                            <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                <span className="truncate max-w-[140px]" title={uploadingFileName}>
                                    {uploadingFileName}
                                </span>
                                <span className="font-mono">{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={`
                            h-14 w-14 rounded-full bg-white shadow-sm border flex items-center justify-center mb-4 
                            transition-all duration-300
                            ${isDragging
                                ? 'border-primary scale-110 shadow-md'
                                : 'border-zinc-200 group-hover:scale-110 group-hover:border-primary/50'
                            }
                        `}>
                            <PlusCircle className={`
                                h-7 w-7 transition-colors
                                ${isDragging ? 'text-primary' : 'text-zinc-400 group-hover:text-primary'}
                            `} />
                        </div>
                        <p className={`
                            text-sm font-bold transition-colors
                            ${isDragging ? 'text-primary' : 'text-zinc-500 group-hover:text-primary'}
                        `}>
                            {isDragging ? 'Drop file here' : 'Upload New Asset'}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1 max-w-[80%] text-center">
                            Drag & drop or click to browse • Up to 500MB
                        </p>
                    </>
                )}
            </div>
        </>
    );
};
