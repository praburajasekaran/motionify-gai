import { api } from './api-config';

export interface PendingAttachment {
    tempId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    r2Key: string;
}

export interface Attachment {
    id: string;
    commentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: string;
}

export interface UploadAttachmentData {
    fileName: string;
    fileType: string;
    fileSize: number;
    file: File;
    proposalId: string;
}

export interface PresignedUrlResponse {
    uploadUrl: string;
    key: string;
}

const ATTACHMENTS_ENDPOINT = '/attachments';

export async function getAttachments(commentId: string): Promise<Attachment[]> {
    const response = await api.get<Attachment[]>(`${ATTACHMENTS_ENDPOINT}?commentId=${encodeURIComponent(commentId)}`);

    if (!response.success || !response.data) {
        console.error('Failed to fetch attachments:', response.error?.message);
        return [];
    }

    return response.data;
}

export async function createAttachment(
    commentId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    r2Key: string
): Promise<Attachment | null> {
    const response = await api.post<Attachment>(ATTACHMENTS_ENDPOINT, {
        commentId,
        fileName,
        fileType,
        fileSize,
        r2Key,
    });

    if (!response.success || !response.data) {
        console.error('Failed to create attachment:', response.error?.message);
        return null;
    }

    return response.data;
}

export async function getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    projectId: string
): Promise<PresignedUrlResponse | null> {
    const response = await api.post<PresignedUrlResponse>('/api/r2-presign', {
        fileName,
        fileType,
        projectId,
        folder: 'comment-attachments',
    });

    if (!response.success || !response.data) {
        console.error('Failed to get presigned upload URL:', response.error?.message);
        return null;
    }

    return response.data;
}

export async function getPresignedDownloadUrl(key: string): Promise<string | null> {
    const response = await api.get<{ url: string }>(`/api/r2-presign?key=${encodeURIComponent(key)}`);

    if (!response.success || !response.data) {
        console.error('Failed to get presigned download URL:', response.error?.message);
        return null;
    }

    return response.data.url;
}

export async function uploadFile(uploadUrl: string, file: File): Promise<boolean> {
    try {
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });

        if (!response.ok) {
            console.error('Failed to upload file to R2:', response.status, response.statusText);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error uploading file to R2:', error);
        return false;
    }
}

export async function uploadAttachment(
    data: UploadAttachmentData,
    onProgress?: (progress: number) => void
): Promise<Attachment | null> {
    const { fileName, fileType, fileSize, file, proposalId } = data;

    // Simulate progress at start
    onProgress?.(10);

    // Step 1: Get presigned upload URL
    const presignedData = await getPresignedUploadUrl(fileName, fileType, proposalId);
    if (!presignedData) {
        console.error('Failed to get presigned upload URL');
        return null;
    }

    onProgress?.(30);

    // Step 2: Upload file to R2
    const uploadSuccess = await uploadFile(presignedData.uploadUrl, file);
    if (!uploadSuccess) {
        console.error('Failed to upload file to R2');
        return null;
    }

    onProgress?.(90);

    // Step 3: Create attachment record (commentId will be set after comment is created)
    // For now, we'll return the r2Key and file metadata so it can be created after comment
    // This is a workaround - in a real implementation, we might create a pending attachment first
    return null;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) {
        return 'image';
    } else if (fileType === 'application/pdf') {
        return 'file-text';
    } else if (
        fileType === 'application/msword' ||
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
        return 'file-type';
    } else {
        return 'file';
    }
}
