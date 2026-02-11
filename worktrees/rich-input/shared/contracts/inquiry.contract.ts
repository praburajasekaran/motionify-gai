import { z } from 'zod';

export const InquiryStatusSchema = z.enum([
  'new',
  'reviewing',
  'proposal_sent',
  'negotiating',
  'accepted',
  'project_setup',
  'payment_pending',
  'paid',
  'converted',
  'rejected',
  'archived',
]);

export const QuizSelectionsSchema = z.object({
  videoType: z.string(),
  audience: z.string(),
  tone: z.string(),
  duration: z.string(),
  deliveryDate: z.string(),
});

export const InquirySchema = z.object({
  id: z.string().uuid(),
  inquiryNumber: z.string(),
  status: InquiryStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  
  contactName: z.string().min(2, 'Name must be at least 2 characters'),
  contactEmail: z.string().email('Invalid email address'),
  companyName: z.string().optional(),
  contactPhone: z.string().optional(),
  projectNotes: z.string().optional(),
  
  quizAnswers: QuizSelectionsSchema,
  recommendedVideoType: z.string(),
  
  proposalId: z.string().uuid().optional(),
  convertedToProjectId: z.string().uuid().optional(),
  convertedAt: z.string().datetime().optional(),
  assignedToAdminId: z.string().uuid().optional(),
});

export const CreateInquiryDtoSchema = InquirySchema.pick({
  contactName: true,
  contactEmail: true,
  companyName: true,
  contactPhone: true,
  projectNotes: true,
  quizAnswers: true,
  recommendedVideoType: true,
});

export const UpdateInquiryDtoSchema = InquirySchema.partial().pick({
  status: true,
  assignedToAdminId: true,
  projectNotes: true,
});

export type InquiryStatus = z.infer<typeof InquiryStatusSchema>;
export type QuizSelections = z.infer<typeof QuizSelectionsSchema>;
export type Inquiry = z.infer<typeof InquirySchema>;
export type CreateInquiryDto = z.infer<typeof CreateInquiryDtoSchema>;
export type UpdateInquiryDto = z.infer<typeof UpdateInquiryDtoSchema>;

export const InquiryListResponseSchema = z.array(InquirySchema);
export const InquiryDetailResponseSchema = InquirySchema;
export const CreateInquiryResponseSchema = InquirySchema;
