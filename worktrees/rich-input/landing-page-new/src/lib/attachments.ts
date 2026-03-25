const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/.netlify/functions';

export interface Attachment {
    id: string;
    commentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: string;
}

export interface PendingAttachment {
    tempId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    r2Key: string;
}

export async function getAttachments(commentId: string): Promise<Attachment[]> {
    try {
        const response = await fetch(`${API_BASE}/attachments?commentId=${encodeURIComponent(commentId)}`, {
            credentials: 'include',
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.attachments || [];
    } catch (error) {
        console.error('Failed to fetch attachments:', error);
        return [];
    }
}

export async function createAttachment(
    commentId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    r2Key: string
): Promise<Attachment | null> {
    try {
        const token = localStorage.getItem('portal_token');
        const response = await fetch(`${API_BASE}/attachments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ commentId, fileName, fileType, fileSize, r2Key }),
        });
        if (!response.ok) return null;
        const result = await response.json();
        return result.attachment || null;
    } catch (error) {
        console.error('Failed to create attachment:', error);
        return null;
    }
}

export async function getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    projectId: string
): Promise<{ uploadUrl: string; key: string } | null> {
    try {
        const response = await fetch(`${API_BASE}/r2-presign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fileName, fileType, projectId, folder: 'comment-attachments' }),
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Failed to get presigned upload URL:', error);
        return null;
    }
}

export async function getAttachmentDownloadUrl(attachmentId: string): Promise<{ url: string; fileName: string } | null> {
    try {
        const token = localStorage.getItem('portal_token');
        const response = await fetch(`${API_BASE}/attachments?attachmentId=${encodeURIComponent(attachmentId)}`, {
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            credentials: 'include',
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data || null;
    } catch (error) {
        console.error('Failed to get attachment download URL:', error);
        return null;
    }
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
        return response.ok;
    } catch (error) {
        console.error('Error uploading file to R2:', error);
        return false;
    }
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
