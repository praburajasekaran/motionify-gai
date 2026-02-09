/**
 * Shared Input Validation Module
 *
 * Provides centralized validation using Zod schemas:
 * - Common validation schemas
 * - Request body validation middleware
 * - Consistent error responses
 */

import { z } from 'zod';
import { getCorsHeaders } from './cors';

// Common schemas
export const emailSchema = z
    .string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(255, 'Email too long')
    .transform(val => val.toLowerCase().trim());

export const uuidSchema = z
    .string()
    .uuid('Invalid ID format');

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long');

export const nameSchema = z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name too long')
    .transform(val => val.trim());

export const phoneSchema = z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format')
    .optional()
    .nullable();

export const urlSchema = z
    .string()
    .url('Invalid URL format')
    .max(2000, 'URL too long');

export const dateSchema = z
    .string()
    .datetime({ message: 'Invalid date format' })
    .or(z.date());

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// User role schema
export const userRoleSchema = z.enum(['super_admin', 'support', 'team_member', 'client']);

// Common request schemas
export const createUserSchema = z.object({
    email: emailSchema,
    full_name: nameSchema,
    role: userRoleSchema,
    is_active: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
    full_name: nameSchema.optional(),
    role: userRoleSchema.optional(),
    is_active: z.boolean().optional(),
    profile_picture_url: urlSchema.optional().nullable(),
});

export const magicLinkRequestSchema = z.object({
    email: emailSchema,
    rememberMe: z.boolean().optional().default(false),
});

export const magicLinkVerifySchema = z.object({
    token: z.string().min(1, 'Token is required'),
    email: emailSchema.optional(),
});

export const projectSchema = z.object({
    name: z.string().min(1).max(255),
    client_user_id: uuidSchema,
    description: z.string().max(5000).optional(),
    status: z.enum(['draft', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled']).optional(),
});

export const taskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(10000).optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: dateSchema.optional().nullable(),
    assignee_id: uuidSchema.optional().nullable(),
    project_id: uuidSchema,
});

export const commentSchema = z.object({
    content: z.string().min(1, 'Comment cannot be empty').max(10000),
    task_id: uuidSchema.optional(),
    deliverable_id: uuidSchema.optional(),
});

export const deliverableSchema = z.object({
    name: z.string().min(1).max(255),
    project_id: uuidSchema,
    status: z.enum(['pending', 'in_progress', 'delivered', 'approved', 'rejected']).optional(),
    revision_count: z.number().int().min(0).optional(),
});

export const paymentSchema = z.object({
    project_id: uuidSchema,
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().length(3, 'Currency must be 3 characters'),
    payment_type: z.enum(['advance', 'milestone', 'balance']),
    description: z.string().max(500).optional(),
});

// Validation result type
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: Array<{
        field: string;
        message: string;
    }>;
}

/**
 * Validate data against a Zod schema
 */
export function validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): ValidationResult<T> {
    const result = schema.safeParse(data);

    if (result.success) {
        return {
            success: true,
            data: result.data,
        };
    }

    const errors = result.error.errors.map(err => ({
        field: err.path.join('.') || 'body',
        message: err.message,
    }));

    return {
        success: false,
        errors,
    };
}

/**
 * Parse JSON body safely
 */
export function parseJsonBody(body: string | null): { success: true; data: any } | { success: false; error: string } {
    if (!body) {
        return { success: false, error: 'Request body is required' };
    }

    try {
        const data = JSON.parse(body);
        return { success: true, data };
    } catch {
        return { success: false, error: 'Invalid JSON body' };
    }
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
    errors: Array<{ field: string; message: string }>,
    origin?: string
): {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
} {
    return {
        statusCode: 400,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: errors,
            },
        }),
    };
}

/**
 * Create bad request response for JSON parse errors
 */
export function createBadRequestResponse(
    message: string,
    origin?: string
): {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
} {
    return {
        statusCode: 400,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
            success: false,
            error: {
                code: 'BAD_REQUEST',
                message,
            },
        }),
    };
}

/**
 * Validation middleware
 * Parses body and validates against schema
 */
export function validateRequest<T>(
    body: string | null,
    schema: z.ZodSchema<T>,
    origin?: string
): {
    success: true;
    data: T;
} | {
    success: false;
    response: {
        statusCode: number;
        headers: Record<string, string>;
        body: string;
    };
} {
    // Parse JSON
    const parseResult = parseJsonBody(body);
    if (!parseResult.success) {
        return {
            success: false,
            response: createBadRequestResponse(parseResult.error, origin),
        };
    }

    // Validate against schema
    const validationResult = validate(schema, parseResult.data);
    if (!validationResult.success) {
        return {
            success: false,
            response: createValidationErrorResponse(validationResult.errors!, origin),
        };
    }

    return {
        success: true,
        data: validationResult.data!,
    };
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
    params: Record<string, string> | null,
    schema: z.ZodSchema<T>,
    origin?: string
): {
    success: true;
    data: T;
} | {
    success: false;
    response: {
        statusCode: number;
        headers: Record<string, string>;
        body: string;
    };
} {
    const validationResult = validate(schema, params || {});

    if (!validationResult.success) {
        return {
            success: false,
            response: createValidationErrorResponse(validationResult.errors!, origin),
        };
    }

    return {
        success: true,
        data: validationResult.data!,
    };
}

// Re-export zod for convenience
export { z };
