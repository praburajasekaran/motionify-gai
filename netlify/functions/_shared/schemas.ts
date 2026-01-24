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
    proposalId: uuidSchema,
    name: nameSchema,
    description: z.string().max(2000).optional(),
    estimatedCompletionWeek: z.number().int().min(1).max(52).optional(),
    status: z.enum(['pending', 'in_progress', 'delivered', 'approved', 'rejected']).optional(),
});

export const updateDeliverableSchema = z.object({
    name: nameSchema.optional(),
    description: z.string().max(2000).optional(),
    estimatedCompletionWeek: z.number().int().min(1).max(52).optional(),
    status: z.enum(['pending', 'in_progress', 'delivered', 'approved', 'rejected']).optional(),
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

// ==========================================
// Task Schemas
// ==========================================

export const createTaskSchema = z.object({
    projectId: uuidSchema,
    title: nameSchema,
    description: z.string().max(5000).optional(),
    assignedTo: uuidSchema.optional().nullable(),
    dueDate: dateSchema.optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
});

export const updateTaskSchema = z.object({
    title: nameSchema.optional(),
    description: z.string().max(5000).optional(),
    assignedTo: uuidSchema.optional().nullable(),
    dueDate: dateSchema.optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
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

export const createInquirySchema = z.object({
    name: nameSchema,
    email: emailSchema,
    company: z.string().max(255).optional(),
    message: z.string().min(10).max(2000),
    projectType: z.string().max(100).optional(),
    budget: z.string().max(50).optional(),
});

export const requestInquiryVerificationSchema = z.object({
    email: emailSchema,
    inquiryId: uuidSchema,
});

// ==========================================
// R2 Presign Schemas
// ==========================================

export const r2PresignSchema = z.object({
    fileName: z.string().min(1).max(255),
    fileType: z.string().min(1).max(100),
    fileSize: z.number().positive().max(10 * 1024 * 1024), // 10MB max
    commentId: uuidSchema.optional(),
});

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
    },
    task: {
        create: createTaskSchema,
        update: updateTaskSchema,
    },
    payment: {
        create: createPaymentSchema,
        update: updatePaymentSchema,
    },
    userSettings: {
        update: updateUserSettingsSchema,
    },
    inquiry: {
        create: createInquirySchema,
        requestVerification: requestInquiryVerificationSchema,
    },
    r2: {
        presign: r2PresignSchema,
    },
};
