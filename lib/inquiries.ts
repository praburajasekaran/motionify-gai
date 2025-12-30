import { QuizSelections } from '../components/Quiz/useQuiz';

const API_BASE_URL = '/.netlify/functions';

export type InquiryStatus =
  | 'new'
  | 'reviewing'
  | 'proposal_sent'
  | 'negotiating'
  | 'accepted'
  | 'project_setup'
  | 'payment_pending'
  | 'paid'
  | 'converted'
  | 'rejected'
  | 'archived';

export interface Inquiry {
  id: string;
  inquiryNumber: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  contactName: string;
  contactEmail: string;
  companyName?: string;
  contactPhone?: string;
  projectNotes?: string;
  quizAnswers: QuizSelections;
  recommendedVideoType: string;
  proposalId?: string;
  convertedToProjectId?: string;
  convertedAt?: string;
  assignedToAdminId?: string;
}

export interface ContactInfo {
  contactName: string;
  contactEmail: string;
  companyName?: string;
  contactPhone?: string;
  projectNotes?: string;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export async function getInquiries(): Promise<Inquiry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiries`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((inquiry: any) => ({
      ...inquiry,
      inquiryNumber: inquiry.inquiry_number,
      contactName: inquiry.contact_name,
      contactEmail: inquiry.contact_email,
      companyName: inquiry.company_name,
      contactPhone: inquiry.contact_phone,
      projectNotes: inquiry.project_notes,
      quizAnswers: inquiry.quiz_answers,
      recommendedVideoType: inquiry.recommended_video_type,
      proposalId: inquiry.proposal_id,
      convertedToProjectId: inquiry.converted_to_project_id,
      convertedAt: inquiry.converted_at,
      assignedToAdminId: inquiry.assigned_to_admin_id,
      createdAt: inquiry.created_at,
      updatedAt: inquiry.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return [];
  }
}

export async function getInquiryById(id: string): Promise<Inquiry | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/inquiry-detail/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const inquiry = await response.json();
    return {
      ...inquiry,
      inquiryNumber: inquiry.inquiry_number,
      contactName: inquiry.contact_name,
      contactEmail: inquiry.contact_email,
      companyName: inquiry.company_name,
      contactPhone: inquiry.contact_phone,
      projectNotes: inquiry.project_notes,
      quizAnswers: inquiry.quiz_answers,
      recommendedVideoType: inquiry.recommended_video_type,
      proposalId: inquiry.proposal_id,
      convertedToProjectId: inquiry.converted_to_project_id,
      convertedAt: inquiry.converted_at,
      assignedToAdminId: inquiry.assigned_to_admin_id,
      createdAt: inquiry.created_at,
      updatedAt: inquiry.updated_at,
    };
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return null;
  }
}

export async function getInquiryByNumber(inquiryNumber: string): Promise<Inquiry | null> {
  return getInquiryById(inquiryNumber);
}

export async function createInquiry(data: {
  quizAnswers: QuizSelections;
  contactInfo: ContactInfo;
  recommendedVideoType: string;
}): Promise<Inquiry> {
  if (!data.contactInfo.contactName || data.contactInfo.contactName.trim() === '') {
    throw new Error('Contact name is required');
  }

  if (!data.contactInfo.contactEmail || data.contactInfo.contactEmail.trim() === '') {
    throw new Error('Email is required');
  }

  if (!isValidEmail(data.contactInfo.contactEmail)) {
    throw new Error('Invalid email format');
  }

  if (data.contactInfo.contactPhone && !isValidPhone(data.contactInfo.contactPhone)) {
    throw new Error('Invalid phone number format');
  }

  const inquiry = {
    contactName: data.contactInfo.contactName.trim(),
    contactEmail: data.contactInfo.contactEmail.trim().toLowerCase(),
    companyName: data.contactInfo.companyName?.trim(),
    contactPhone: data.contactInfo.contactPhone?.trim(),
    projectNotes: data.contactInfo.projectNotes?.trim(),
    quizAnswers: data.quizAnswers,
    recommendedVideoType: data.recommendedVideoType,
  };

  const response = await fetch(`${API_BASE_URL}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inquiry),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create inquiry');
  }

  const result = await response.json();
  return {
    ...result,
    inquiryNumber: result.inquiry_number,
    contactName: result.contact_name,
    contactEmail: result.contact_email,
    companyName: result.company_name,
    contactPhone: result.contact_phone,
    projectNotes: result.project_notes,
    quizAnswers: result.quiz_answers,
    recommendedVideoType: result.recommended_video_type,
    proposalId: result.proposal_id,
    convertedToProjectId: result.converted_to_project_id,
    convertedAt: result.converted_at,
    assignedToAdminId: result.assigned_to_admin_id,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

export async function updateInquiry(id: string, updates: Partial<Inquiry>): Promise<Inquiry> {
  const snakeCaseUpdates: any = {};
  
  if (updates.status) snakeCaseUpdates.status = updates.status;
  if (updates.contactName) snakeCaseUpdates.contact_name = updates.contactName;
  if (updates.contactEmail) snakeCaseUpdates.contact_email = updates.contactEmail;
  if (updates.companyName !== undefined) snakeCaseUpdates.company_name = updates.companyName;
  if (updates.contactPhone !== undefined) snakeCaseUpdates.contact_phone = updates.contactPhone;
  if (updates.projectNotes !== undefined) snakeCaseUpdates.project_notes = updates.projectNotes;
  if (updates.proposalId !== undefined) snakeCaseUpdates.proposal_id = updates.proposalId;
  if (updates.assignedToAdminId !== undefined) snakeCaseUpdates.assigned_to_admin_id = updates.assignedToAdminId;

  const response = await fetch(`${API_BASE_URL}/inquiry-detail/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snakeCaseUpdates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update inquiry');
  }

  const result = await response.json();
  return {
    ...result,
    inquiryNumber: result.inquiry_number,
    contactName: result.contact_name,
    contactEmail: result.contact_email,
    companyName: result.company_name,
    contactPhone: result.contact_phone,
    projectNotes: result.project_notes,
    quizAnswers: result.quiz_answers,
    recommendedVideoType: result.recommended_video_type,
    proposalId: result.proposal_id,
    convertedToProjectId: result.converted_to_project_id,
    convertedAt: result.converted_at,
    assignedToAdminId: result.assigned_to_admin_id,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
  additionalData?: {
    proposalId?: string;
    convertedToProjectId?: string;
  }
): Promise<Inquiry> {
  const updates: Partial<Inquiry> = { status };

  if (additionalData?.proposalId) {
    updates.proposalId = additionalData.proposalId;
  }

  if (additionalData?.convertedToProjectId) {
    updates.convertedToProjectId = additionalData.convertedToProjectId;
    updates.convertedAt = new Date().toISOString();
  }

  return updateInquiry(id, updates);
}

export async function deleteInquiry(id: string): Promise<void> {
  throw new Error('Delete inquiry not implemented - use status=archived instead');
}

export async function getInquiriesByStatus(status: InquiryStatus): Promise<Inquiry[]> {
  const inquiries = await getInquiries();
  return inquiries.filter(inq => inq.status === status);
}

export async function getInquiryStats() {
  const inquiries = await getInquiries();

  return {
    total: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    reviewing: inquiries.filter(i => i.status === 'reviewing').length,
    proposalSent: inquiries.filter(i => i.status === 'proposal_sent').length,
    accepted: inquiries.filter(i => i.status === 'accepted').length,
    converted: inquiries.filter(i => i.status === 'converted').length,
    rejected: inquiries.filter(i => i.status === 'rejected').length,
  };
}

export function clearAllInquiries(): void {
  throw new Error('clearAllInquiries not supported with database backend');
}

export function seedSampleInquiries(): void {
  throw new Error('seedSampleInquiries not supported with database backend');
}

export function generateInquiryNumber(): string {
  throw new Error('generateInquiryNumber handled by backend');
}
