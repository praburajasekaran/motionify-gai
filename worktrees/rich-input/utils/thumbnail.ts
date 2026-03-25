/**
 * Thumbnail Generator Utility
 * Generates an image thumbnail from a video file client-side.
 */

export const generateThumbnail = (videoFile: File, seekTime = 1.0): Promise<File | null> => {
    return new Promise((resolve, reject) => {
        // Check if file is actually a video
        if (!videoFile.type.startsWith('video/')) {
            reject(new Error('File is not a video'));
            return;
        }

        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        video.playsInline = true;

        // Wait for metadata to load to get dimensions
        video.onloadedmetadata = () => {
            // Seek to the specified time
            video.currentTime = seekTime;
        };

        // When seeking is done, we can capture the frame
        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Could not get canvas context');
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to blob/file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const thumbnailFile = new File([blob], `thumbnail-${videoFile.name.split('.')[0]}.jpg`, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(thumbnailFile);
                    } else {
                        reject(new Error('Thumbnail generation failed'));
                    }

                    // Cleanup
                    URL.revokeObjectURL(video.src);
                }, 'image/jpeg', 0.85); // 0.85 quality

            } catch (error) {
                reject(error);
                URL.revokeObjectURL(video.src);
            }
        };

        video.onerror = (e) => {
            reject(new Error('Error loading video file'));
            URL.revokeObjectURL(video.src);
        };
    });
};
