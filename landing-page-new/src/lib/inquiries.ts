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

export async function fetchInquiries(): Promise<Inquiry[]> {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
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
    return await response.json();
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
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
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
