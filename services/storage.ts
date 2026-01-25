
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
            const presignRes = await fetch('/api/r2-presign', {
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
                throw new Error('Failed to generate upload URL');
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
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => {
                    reject(new Error('Network error during upload'));
                };

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
            const response = await fetch(`/api/r2-presign?${queryString}`, {
                credentials: 'include', // Required for cookie-based auth
            });

            if (!response.ok) {
                throw new Error('Failed to get download URL');
            }

            const { url }: DownloadResponse = await response.json();
            return url;
        } catch (error) {
            console.error('Storage Download Error:', error);
            return '';
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
