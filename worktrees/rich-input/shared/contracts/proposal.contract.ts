import { z } from 'zod';

export const ProposalStatusSchema = z.enum([
  'sent',
  'accepted',
  'rejected',
  'changes_requested',
]);

export const ProposalDeliverableSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Deliverable name required'),
  description: z.string(),
  estimatedCompletionWeek: z.number().int().min(1).max(52),
});

export const ProposalSchema = z.object({
  id: z.string().uuid(),
  inquiryId: z.string().uuid(),
  status: ProposalStatusSchema,
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  description: z.string().min(10, 'Description must be at least 10 characters'),
  deliverables: z.array(ProposalDeliverableSchema).min(1, 'At least one deliverable required'),

  currency: z.enum(['INR', 'USD']),
  totalPrice: z.number().int().positive('Total price must be positive'),
  advancePercentage: z.union([z.literal(40), z.literal(50), z.literal(60)]),
  advanceAmount: z.number().int().positive(),
  balanceAmount: z.number().int().positive(),

  acceptedAt: z.string().datetime().optional(),
  rejectedAt: z.string().datetime().optional(),
  feedback: z.string().optional(),
  editHistory: z.array(z.any()).optional(),
});

export const CreateProposalDtoSchema = ProposalSchema.pick({
  inquiryId: true,
  description: true,
  deliverables: true,
  currency: true,
  totalPrice: true,
  advancePercentage: true,
}).extend({
  advanceAmount: z.number().int().positive(),
  balanceAmount: z.number().int().positive(),
});

export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;
export type ProposalDeliverable = z.infer<typeof ProposalDeliverableSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type CreateProposalDto = z.infer<typeof CreateProposalDtoSchema>;

export const ProposalListResponseSchema = z.array(ProposalSchema);
export const ProposalDetailResponseSchema = ProposalSchema;
export const CreateProposalResponseSchema = ProposalSchema;
