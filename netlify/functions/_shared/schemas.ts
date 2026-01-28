/**
 * Common Validation Schemas
 *
 * Centralized Zod schemas for API request validation
 */

import { z } from 'zod';
import { emailSchema, uuidSchema, nameSchema, dateSchema, userRoleSchema } from './validation';

// ==========================================
// Invitation Schemas
// ==========================================

export const createInvitationSchema = z.object({
    email: emailSchema,
    role: userRoleSchema,
    full_name: nameSchema.optional(),
});

export const resendInvitationSchema = z.object({
    email: emailSchema,
});

export const revokeInvitationSchema = z.object({
    email: emailSchema,
});

// ==========================================
// Proposal Schemas
// ==========================================

export const proposalDeliverableSchema = z.object({
    id: uuidSchema.optional(),
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    estimatedCompletionWeek: z.number().int().min(1).max(52).optional(),
});

export const createProposalSchema = z.object({
    inquiryId: uuidSchema,
    description: z.string().min(10).max(10000),
    deliverables: z.array(proposalDeliverableSchema).min(1),
    currency: z.enum(['INR', 'USD']),
    totalPrice: z.number().positive(),
    advancePercentage: z.number().min(0).max(100),
    advanceAmount: z.number().min(0),
    balanceAmount: z.number().min(0),
});

export const updateProposalSchema = z.object({
    description: z.string().min(10).max(10000).optional(),
    deliverables: z.array(proposalDeliverableSchema).optional(),
    currency: z.enum(['INR', 'USD']).optional(),
    totalPrice: z.number().positive().optional(),
    advancePercentage: z.number().min(0).max(100).optional(),
    advanceAmount: z.number().min(0).optional(),
    balanceAmount: z.number().min(0).optional(),
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'cancelled']).optional(),
    feedback: z.string().max(5000).optional(),
    version: z.number().int().min(1).optional(),
    editHistory: z.array(z.any()).optional(),
    acceptedAt: dateSchema.optional().nullable(),
    rejectedAt: dateSchema.optional().nullable(),
});

// ==========================================
// Comment Schemas
// ==========================================

export const createCommentSchema = z.object({
    proposalId: uuidSchema,
    content: z.string().min(1).max(5000),
    attachmentIds: z.array(uuidSchema).optional(),
});

export const updateCommentSchema = z.object({
    id: uuidSchema,
    content: z.string().min(1).max(5000),
});

// ==========================================
// Attachment Schemas
// ==========================================

export const createAttachmentSchema = z.object({
    commentId: uuidSchema,
    fileName: z.string().min(1).max(255),
    fileSize: z.number().positive().max(10 * 1024 * 1024), // 10MB max
    fileType: z.string().min(1).max(100),
    r2Key: z.string().min(1).max(500),
});

// ==========================================
// Deliverable Schemas
// ==========================================

export const createDeliverableSchema = z.object({
    proposalId: uuidSchema.optional(),
    project_id: uuidSchema.optional(),
    name: nameSchema,
    description: z.string().max(2000).optional(),
    estimated_completion_week: z.number().int().min(1).max(52).optional(),
    estimatedCompletionWeek: z.number().int().min(1).max(52).optional(), // Support camelCase too
    status: z.enum(['pending', 'in_progress', 'delivered', 'approved', 'rejected']).optional(),
}).refine(
    data => data.proposalId || data.project_id,
    { message: "Either proposalId or project_id is required" }
);

export const updateDeliverableSchema = z.object({
    name: nameSchema.optional(),
    description: z.string().max(2000).optional(),
    estimatedCompletionWeek: z.number().int().min(1).max(52).optional(),
    status: z.enum([
        'pending', 'in_progress', 'beta_ready', 'awaiting_approval',
        'approved', 'revision_requested', 'payment_pending', 'final_delivered'
    ]).optional(),
    // File upload fields
    beta_file_url: z.string().url().max(2000).optional(),
    beta_file_key: z.string().max(500).optional(),
    final_file_url: z.string().url().max(2000).optional(),
    final_file_key: z.string().max(500).optional(),
    approved_by: uuidSchema.optional(),
});

// ==========================================
// Project Schemas
// ==========================================

export const createProjectSchema = z.object({
    name: nameSchema,
    clientUserId: uuidSchema,
    description: z.string().max(5000).optional(),
    status: z.enum(['draft', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled']).optional(),
});

export const updateProjectSchema = z.object({
    name: nameSchema.optional(),
    clientUserId: uuidSchema.optional(),
    description: z.string().max(5000).optional(),
    status: z.enum(['draft', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled']).optional(),
});

export const acceptProjectTermsSchema = z.object({
    projectId: uuidSchema,
    accepted: z.boolean(),
});

export const createProjectFromProposalSchema = z.object({
    inquiryId: uuidSchema,
    proposalId: uuidSchema,
});

// ==========================================
// Task Schemas
// ==========================================

// Task status enum matching database task_stage enum
const taskStatusEnum = z.enum([
    'pending',
    'in_progress',
    'awaiting_approval',
    'completed',
    'revision_requested'
]);

export const createTaskSchema = z.object({
    projectId: uuidSchema,
    title: nameSchema,
    description: z.string().max(5000).optional(),
    assignedTo: uuidSchema.optional().nullable(),
    dueDate: dateSchema.optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: taskStatusEnum.optional(),
});

export const updateTaskSchema = z.object({
    title: nameSchema.optional(),
    description: z.string().max(5000).optional(),
    assignedTo: uuidSchema.optional().nullable(),
    dueDate: dateSchema.optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: taskStatusEnum.optional(),
});

// ==========================================
// Payment Schemas
// ==========================================

export const createPaymentSchema = z.object({
    projectId: uuidSchema,
    amount: z.number().positive(),
    currency: z.enum(['INR', 'USD']),
    paymentType: z.enum(['advance', 'milestone', 'balance']),
    description: z.string().max(500).optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
});

export const updatePaymentSchema = z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
    transactionId: z.string().max(255).optional(),
    paidAt: dateSchema.optional().nullable(),
});

export const createPaymentOrderSchema = z.object({
    proposalId: uuidSchema,
    paymentType: z.enum(['advance', 'balance']),
});

export const verifyPaymentSchema = z.object({
    paymentId: uuidSchema,
    razorpayPaymentId: z.string().min(1).max(255),
    razorpayOrderId: z.string().min(1).max(255).optional(),
    razorpaySignature: z.string().min(1).max(500).optional(),
});

export const manualCompletePaymentSchema = z.object({
    paymentId: uuidSchema,
});

// Razorpay webhook payload schema (validated AFTER signature verification)
// Note: Validation failure should still return 200 but log error
// to avoid rejecting valid Razorpay webhooks due to schema drift
export const razorpayWebhookSchema = z.object({
    entity: z.literal('event'),
    account_id: z.string(),
    event: z.string(),
    contains: z.array(z.string()),
    payload: z.object({
        payment: z.object({
            entity: z.object({
                id: z.string(),
                order_id: z.string(),
                amount: z.number(),
                currency: z.string(),
                status: z.string(),
                method: z.string().optional(),
                captured: z.boolean().optional(),
                error_code: z.string().nullable().optional(),
                error_description: z.string().nullable().optional(),
            }),
        }).optional(),
    }),
    created_at: z.number(),
});

// Type export for webhook payload
export type RazorpayWebhookPayload = z.infer<typeof razorpayWebhookSchema>;

// ==========================================
// User Settings Schemas
// ==========================================

export const updateUserSettingsSchema = z.object({
    email_task_assignment: z.boolean().optional(),
    email_mention: z.boolean().optional(),
    email_project_update: z.boolean().optional(),
    email_marketing: z.boolean().optional(),
    notification_sound: z.boolean().optional(),
    notification_desktop: z.boolean().optional(),
});

// ==========================================
// Inquiry Schemas
// ==========================================

// Schema for public contact form
export const createInquirySchema = z.object({
    name: nameSchema,
    email: emailSchema,
    company: z.string().max(255).optional(),
    message: z.string().min(10).max(2000),
    projectType: z.string().max(100).optional(),
    budget: z.string().max(50).optional(),
});

// Schema for admin-created inquiries (NewInquiryModal)
export const createAdminInquirySchema = z.object({
    contactName: nameSchema,
    contactEmail: emailSchema,
    companyName: z.string().max(255).optional(),
    contactPhone: z.string().max(50).optional(),
    projectNotes: z.string().max(5000).optional(),
    quizAnswers: z.object({
        niche: z.string().optional().nullable(),
        audience: z.string().optional().nullable(),
        style: z.string().optional().nullable(),
        mood: z.string().optional().nullable(),
        duration: z.string().optional().nullable(),
    }),
    recommendedVideoType: z.string().max(255),
    clientUserId: uuidSchema.optional(),
});

export const requestInquiryVerificationSchema = z.object({
    email: emailSchema,
    inquiryId: uuidSchema,
});

// ==========================================
// R2 Presign Schemas
// ==========================================

// For comment attachments (keep existing 10MB limit)
export const r2PresignSchema = z.object({
    fileName: z.string().min(1).max(255),
    fileType: z.string().min(1).max(100),
    fileSize: z.number().positive().max(10 * 1024 * 1024), // 10MB max for comments
    commentId: uuidSchema.optional(),
});

// For deliverable uploads (100MB limit)
// File type validation is relaxed - security is enforced on download (r2-presign GET)
// This allows video/audio/image files and common deliverable formats
export const r2PresignDeliverableSchema = z.object({
    fileName: z.string().min(1).max(255),
    fileType: z.string().min(1).max(100).refine(
        (type) => {
            // Allow video, audio, image, and common document/archive types
            const allowedPrefixes = ['video/', 'audio/', 'image/', 'application/pdf', 'application/octet-stream'];
            return allowedPrefixes.some(prefix => type.startsWith(prefix)) || type === '';
        },
        { message: 'File type must be video, audio, image, or PDF' }
    ),
    fileSize: z.number()
        .positive()
        .max(100 * 1024 * 1024, 'File size cannot exceed 100MB'), // 100MB max
    projectId: z.string().min(1).max(100).optional(), // Accept any string (UUID or numeric ID)
    folder: z.enum(['beta', 'final', 'misc']).optional(),
    customKey: z.string().max(500).optional(), // For thumbnail uploads
    revisionRequestId: uuidSchema.optional(), // For revision request attachments
});

// ==========================================
// Notification Schemas
// ==========================================

export const markNotificationReadSchema = z.object({
    userId: uuidSchema,
    notificationId: uuidSchema.optional(),
});

export const markAllNotificationsReadSchema = z.object({
    userId: uuidSchema,
});

// ==========================================
// Revision Request Schemas
// ==========================================

export const timestampedCommentSchema = z.object({
    id: z.string().min(1),
    timestamp: z.number().min(0),
    comment: z.string().min(1).max(2000),
    resolved: z.boolean().default(false),
    userId: uuidSchema,
    userName: z.string().min(1).max(255),
});

export const revisionAttachmentSchema = z.object({
    fileName: z.string().min(1).max(255),
    fileSize: z.number().positive().max(10 * 1024 * 1024),
    fileType: z.string().min(1).max(100),
    r2Key: z.string().min(1).max(500),
});

export const createRevisionRequestSchema = z.object({
    deliverableId: uuidSchema,
    feedbackText: z.string().min(20).max(10000),
    timestampedComments: z.array(timestampedCommentSchema).optional(),
    issueCategories: z.array(z.enum(['color', 'audio', 'timing', 'editing', 'content', 'other'])).optional(),
    attachments: z.array(revisionAttachmentSchema).optional(),
});

// ==========================================
// Activity Schemas
// ==========================================

export const createActivitySchema = z.object({
    type: z.string().min(1).max(100),
    userId: uuidSchema,
    userName: nameSchema,
    targetUserId: uuidSchema.optional(),
    targetUserName: nameSchema.optional(),
    inquiryId: uuidSchema.optional(),
    proposalId: uuidSchema.optional(),
    projectId: uuidSchema.optional(),
    details: z.record(z.union([z.string(), z.number()])).optional(),
}).refine(
    data => data.inquiryId || data.proposalId || data.projectId,
    { message: "At least one of inquiryId, proposalId, or projectId is required" }
);

// ==========================================
// Export all schemas
// ==========================================

export const SCHEMAS = {
    invitation: {
        create: createInvitationSchema,
        resend: resendInvitationSchema,
        revoke: revokeInvitationSchema,
    },
    proposal: {
        create: createProposalSchema,
        update: updateProposalSchema,
    },
    comment: {
        create: createCommentSchema,
        update: updateCommentSchema,
    },
    attachment: {
        create: createAttachmentSchema,
    },
    deliverable: {
        create: createDeliverableSchema,
        update: updateDeliverableSchema,
    },
    project: {
        create: createProjectSchema,
        update: updateProjectSchema,
        acceptTerms: acceptProjectTermsSchema,
        fromProposal: createProjectFromProposalSchema,
    },
    task: {
        create: createTaskSchema,
        update: updateTaskSchema,
    },
    payment: {
        create: createPaymentSchema,
        update: updatePaymentSchema,
        createOrder: createPaymentOrderSchema,
        verify: verifyPaymentSchema,
        manualComplete: manualCompletePaymentSchema,
        webhook: razorpayWebhookSchema,
    },
    userSettings: {
        update: updateUserSettingsSchema,
    },
    inquiry: {
        create: createInquirySchema,
        createAdmin: createAdminInquirySchema,
        requestVerification: requestInquiryVerificationSchema,
    },
    r2: {
        presign: r2PresignSchema,
        presignDeliverable: r2PresignDeliverableSchema,
    },
    notification: {
        markRead: markNotificationReadSchema,
        markAllRead: markAllNotificationsReadSchema,
    },
    activity: {
        create: createActivitySchema,
    },
    revisionRequest: {
        create: createRevisionRequestSchema,
    },
};
