import { z } from 'zod';
import {
  InquiryListResponseSchema,
  InquiryDetailResponseSchema,
  CreateInquiryDtoSchema,
  CreateInquiryResponseSchema,
  type Inquiry,
  type CreateInquiryDto,
  UpdateInquiryDtoSchema,
} from '../contracts/inquiry.contract';

import {
  ProposalListResponseSchema,
  ProposalDetailResponseSchema,
  CreateProposalDtoSchema,
  CreateProposalResponseSchema,
  type Proposal,
  type CreateProposalDto,
} from '../contracts/proposal.contract';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  responseSchema?: z.ZodSchema<T>
): Promise<T> {
  const baseUrl = typeof window !== 'undefined' 
    ? '/.netlify/functions'
    : process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions';

  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(response.status, errorData.error || response.statusText, errorData.details);
  }

  const data = await response.json();
  
  if (responseSchema) {
    return responseSchema.parse(data);
  }
  
  return data;
}

export const api = {
  inquiries: {
    list: () => apiRequest('/inquiries', {}, InquiryListResponseSchema),
    
    get: (id: string) => apiRequest(`/inquiry-detail/${id}`, {}, InquiryDetailResponseSchema),
    
    create: (data: CreateInquiryDto) => {
      const validatedData = CreateInquiryDtoSchema.parse(data);
      return apiRequest('/inquiries', {
        method: 'POST',
        body: JSON.stringify(validatedData),
      }, CreateInquiryResponseSchema);
    },
    
    update: (id: string, data: Partial<Inquiry>) => {
      const validatedData = UpdateInquiryDtoSchema.parse(data);
      return apiRequest(`/inquiries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(validatedData),
      }, InquiryDetailResponseSchema);
    },
  },
  
  proposals: {
    list: () => apiRequest('/proposals', {}, ProposalListResponseSchema),
    
    get: (id: string) => apiRequest(`/proposal-detail/${id}`, {}, ProposalDetailResponseSchema),
    
    create: (data: CreateProposalDto) => {
      const validatedData = CreateProposalDtoSchema.parse(data);
      return apiRequest('/proposals', {
        method: 'POST',
        body: JSON.stringify(validatedData),
      }, CreateProposalResponseSchema);
    },
    
    accept: (id: string) => apiRequest(`/proposals/${id}/accept`, {
      method: 'POST',
    }, ProposalDetailResponseSchema),
  },
};
