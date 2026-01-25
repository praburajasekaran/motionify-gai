
/**
 * Storage Service
 * Handles file uploads and downloads using Cloudflare R2 via Netlify Functions
 */

interface UploadResponse {
    uploadUrl: string;
    key: string;
}

interface DownloadResponse {
    url: string;
}

export const storageService = {
    /**
     * Upload a file to R2
     * @param file The file to upload
     * @param projectId The project ID (for organization)
     * @param folder Destination folder (e.g., 'beta', 'final')
     * @param onProgress Optional callback for upload progress (0-100)
     * @returns The storage key (path) of the uploaded file
     */
    async uploadFile(
        file: File,
        projectId: string,
        folder: 'beta' | 'final' | 'misc' = 'misc',
        onProgress?: (progress: number) => void,
        customKey?: string
    ): Promise<string> {
        try {
            // 1. Get presigned URL
            const presignRes = await fetch('/.netlify/functions/r2-presign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Required for cookie-based auth
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    projectId,
                    folder,
                    customKey,
                }),
            });

            if (!presignRes.ok) {
                const errorData = await presignRes.json().catch(() => ({}));
                const errorMessage = errorData?.error?.message || errorData?.message || 'Failed to generate upload URL';
                throw new Error(errorMessage);
            }

            const { uploadUrl, key }: UploadResponse = await presignRes.json();

            // 2. Upload to R2 using XMLHttpRequest for progress
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.open('PUT', uploadUrl, true);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        onProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(key);
                    } else {
                        // Try to parse R2 error response
                        let errorMsg = `Upload failed with status ${xhr.status}`;
                        try {
                            // R2 returns XML errors
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(xhr.responseText, 'application/xml');
                            const code = doc.querySelector('Code')?.textContent;
                            const message = doc.querySelector('Message')?.textContent;
                            if (code && message) {
                                errorMsg = `R2 Error: ${code} - ${message}`;
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                        reject(new Error(errorMsg));
                    }
                };

                xhr.onerror = () => {
                    reject(new Error('Network error during upload. Please check your connection and try again.'));
                };

                xhr.ontimeout = () => {
                    reject(new Error('Upload timed out. The file may be too large for your connection speed.'));
                };

                // Set timeout based on file size (1 minute per 10MB + 2 minute base)
                xhr.timeout = Math.max(120000, Math.ceil(file.size / (10 * 1024 * 1024)) * 60000 + 120000);

                xhr.send(file);
            });

        } catch (error) {
            console.error('Storage Upload Error:', error);
            throw error;
        }
    },

    /**
     * Get a signed URL for downloading/viewing a file
     * @param key The storage key of the file
     * @returns The signed URL
     */
    async getDownloadUrl(key: string): Promise<string> {
        try {
            if (!key) return '';

            const queryString = new URLSearchParams({ key }).toString();
            const response = await fetch(`/.netlify/functions/r2-presign?${queryString}`, {
                credentials: 'include', // Required for cookie-based auth
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorCode = errorData?.error?.code;
                const errorMessage = errorData?.error?.message || 'Failed to get download URL';

                // Handle specific error codes
                if (response.status === 403 && errorCode === 'ACCESS_DENIED') {
                    throw new Error('You do not have permission to access this file');
                }
                if (response.status === 403 && errorCode === 'FILES_EXPIRED') {
                    throw new Error('This file has expired. Contact support to restore access.');
                }

                throw new Error(errorMessage);
            }

            const { url }: DownloadResponse = await response.json();
            return url;
        } catch (error) {
            console.error('Storage Download Error:', error);
            throw error; // Re-throw for caller to show user message
        }
    },

    /**
     * Get the public URL for a file served via CDN
     * @param key The storage key of the file
     * @returns The public URL
     */
    getPublicUrl(key: string): string {
        if (!key) return '';
        // In a real app, this would come from an environment variable
        const publicDomain = (import.meta as any).env.VITE_R2_PUBLIC_DOMAIN || 'https://pub-your-r2-domain.r2.dev';
        return `${publicDomain}/${key}`;
    }
};
