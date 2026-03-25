'use client';

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

export interface QuizSelections {
  niche?: string | null;
  audience?: string | null;
  style?: string | null;
  mood?: string | null;
  duration?: string | null;
}

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

const API_BASE_URL = '/api/inquiries';

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Map snake_case API response to camelCase Inquiry interface
export function mapInquiryFromApi(data: Record<string, unknown>): Inquiry {
  return {
    id: (data.id as string) || '',
    inquiryNumber: (data.inquiry_number as string) || (data.inquiryNumber as string) || '',
    status: (data.status as InquiryStatus) || 'new',
    createdAt: (data.created_at as string) || (data.createdAt as string) || '',
    updatedAt: (data.updated_at as string) || (data.updatedAt as string) || '',
    contactName: (data.contact_name as string) || (data.contactName as string) || '',
    contactEmail: (data.contact_email as string) || (data.contactEmail as string) || '',
    companyName: (data.company_name as string) || (data.companyName as string) || undefined,
    contactPhone: (data.contact_phone as string) || (data.contactPhone as string) || undefined,
    projectNotes: (data.project_notes as string) || (data.projectNotes as string) || undefined,
    quizAnswers: (data.quiz_answers as QuizSelections) || (data.quizAnswers as QuizSelections) || {},
    recommendedVideoType: (data.recommended_video_type as string) || (data.recommendedVideoType as string) || '',
    proposalId: (data.proposal_id as string) || (data.proposalId as string) || undefined,
    convertedToProjectId: (data.converted_to_project_id as string) || (data.convertedToProjectId as string) || undefined,
    convertedAt: (data.converted_at as string) || (data.convertedAt as string) || undefined,
    assignedToAdminId: (data.assigned_to_admin_id as string) || (data.assignedToAdminId as string) || undefined,
  };
}

export async function fetchInquiries(): Promise<Inquiry[]> {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data.map(mapInquiryFromApi) : [];
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return [];
  }
}

export async function fetchInquiryById(id: string): Promise<Inquiry | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return mapInquiryFromApi(data);
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return null;
  }
}

export async function fetchInquiryByNumber(inquiryNumber: string): Promise<Inquiry | null> {
  return fetchInquiryById(inquiryNumber);
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

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inquiry),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create inquiry');
  }

  return await response.json();
}

export async function updateInquiry(id: string, updates: Partial<Inquiry>): Promise<Inquiry> {
  // Convert camelCase keys to snake_case for the API
  const snakeCaseUpdates: Record<string, unknown> = {};
  const keyMap: Record<string, string> = {
    status: 'status',
    contactName: 'contact_name',
    contactEmail: 'contact_email',
    companyName: 'company_name',
    contactPhone: 'contact_phone',
    projectNotes: 'project_notes',
    proposalId: 'proposal_id',
    assignedToAdminId: 'assigned_to_admin_id',
  };

  Object.entries(updates).forEach(([key, value]) => {
    const snakeKey = keyMap[key] || key;
    snakeCaseUpdates[snakeKey] = value;
  });

  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snakeCaseUpdates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update inquiry');
  }

  return await response.json();
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
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete inquiry');
  }
}

export async function fetchInquiriesByStatus(status: InquiryStatus): Promise<Inquiry[]> {
  const inquiries = await fetchInquiries();
  return inquiries.filter(inq => inq.status === status);
}

export async function fetchInquiriesByClientUserId(clientUserId: string): Promise<Inquiry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}?clientUserId=${encodeURIComponent(clientUserId)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching inquiries by client user ID:', error);
    return [];
  }
}

export async function getInquiryStats(): Promise<{
  total: number;
  new: number;
  reviewing: number;
  proposalSent: number;
  accepted: number;
  converted: number;
  rejected: number;
}> {
  const inquiries = await fetchInquiries();

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

export async function seedSampleInquiries(): Promise<void> {
  const existingInquiries = await fetchInquiries();
  if (existingInquiries.length > 0) {
    console.log('Sample inquiries already exist. Skipping seed.');
    return;
  }

  const sampleInquiries = [
    {
      contactName: 'Sarah Johnson',
      contactEmail: 'sarah@techstartup.com',
      companyName: 'TechStartup Inc.',
      contactPhone: '+1 (555) 123-4567',
      projectNotes: 'Looking for a product explainer video for our SaaS platform launch',
      quizAnswers: {
        niche: 'Tech',
        audience: 'Businesses',
        style: 'Motion Graphics',
        mood: 'Corporate',
        duration: 'Explainer',
      },
      recommendedVideoType: 'SaaS Product Explainer',
    },
    {
      contactName: 'Michael Chen',
      contactEmail: 'michael@healthapp.io',
      companyName: 'HealthApp',
      contactPhone: '+1 (555) 234-5678',
      projectNotes: 'Need animated video explaining our health tracking app features',
      quizAnswers: {
        niche: 'Healthcare',
        audience: 'Consumers',
        style: 'Animation',
        mood: 'Playful',
        duration: 'Explainer',
      },
      recommendedVideoType: 'App Feature Showcase',
    },
    {
      contactName: 'Emily Rodriguez',
      contactEmail: 'emily@fashionbrand.com',
      companyName: 'StyleCo Fashion',
      projectNotes: 'Social media content for new collection launch',
      quizAnswers: {
        niche: 'Retail',
        audience: 'Consumers',
        style: 'Live Action',
        mood: 'Bold',
        duration: 'Reels',
      },
      recommendedVideoType: 'Social Media Campaign',
    },
  ];

  for (const inquiry of sampleInquiries) {
    await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry),
    });
  }

  console.log('Seeded sample inquiries');
}
export async function ensureInquiryExists(inquiry: Inquiry): Promise<void> {
  const existing = await fetchInquiryById(inquiry.id);
  if (!existing) {
    console.log('Persisting inquiry to backend:', inquiry.id);
    // Use the API directly to ensure we preserve the ID and other fields
    const response = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry),
    });

    if (!response.ok) {
      throw new Error('Failed to persist inquiry to backend');
    }
  }
}

export async function requestInquiryVerification(data: {
  quizAnswers: QuizSelections;
  contactInfo: ContactInfo;
  recommendedVideoType: string;
}): Promise<{ success: boolean; message: string; magicLink?: string }> {
  if (!data.contactInfo.contactName || !data.contactInfo.contactEmail) {
    throw new Error('Name and email are required');
  }

  const payload = {
    contactName: data.contactInfo.contactName,
    contactEmail: data.contactInfo.contactEmail,
    companyName: data.contactInfo.companyName,
    contactPhone: data.contactInfo.contactPhone,
    projectNotes: data.contactInfo.projectNotes,
    quizAnswers: data.quizAnswers,
    recommendedVideoType: data.recommendedVideoType,
  };

  const response = await fetch('/api/inquiry-request-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to request verification');
  }

  return await response.json();
}
