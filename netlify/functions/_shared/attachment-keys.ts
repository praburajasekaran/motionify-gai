export function isAuthorizedCommentAttachmentKey(
    r2Key: string,
    commentId: string,
    userId: string
): boolean {
    return (
        r2Key.startsWith(`comments/${commentId}/`) ||
        r2Key.startsWith(`uploads/${userId}/`)
    );
}
