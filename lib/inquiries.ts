/**
 * Inquiry Management Library
 * Handles inquiry creation, storage, and retrieval using localStorage
 */

import { QuizSelections } from '../components/Quiz/useQuiz';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type InquiryStatus =
  | 'new'              // Just submitted by customer
  | 'reviewing'        // Admin is reviewing
  | 'proposal_sent'    // Proposal has been sent to customer
  | 'negotiating'      // Customer requested changes
  | 'accepted'         // Customer accepted proposal
  | 'project_setup'    // Admin is setting up project
  | 'payment_pending'  // Project setup complete, payment request sent
  | 'paid'             // Payment received
  | 'converted'        // Successfully converted to project
  | 'rejected'         // Customer declined proposal
  | 'archived';        // Closed without conversion

export interface Inquiry {
  // Core Identification
  id: string;                     // UUID
  inquiryNumber: string;          // "INQ-2025-001"
  status: InquiryStatus;
  createdAt: string;              // ISO date string
  updatedAt: string;              // ISO date string

  // Contact Information
  contactName: string;            // Required
  contactEmail: string;           // Required, validated
  companyName?: string;           // Optional
  contactPhone?: string;          // Optional
  projectNotes?: string;          // Optional additional requirements

  // Quiz Answers (from landing page 5-step quiz)
  quizAnswers: QuizSelections;
  recommendedVideoType: string;   // Generated recommendation title

  // Relationships
  proposalId?: string;            // UUID of associated proposal
  convertedToProjectId?: string;  // UUID of created project
  convertedAt?: string;           // ISO date string

  // Internal Management
  assignedToAdminId?: string;     // UUID of admin user
}

export interface ContactInfo {
  contactName: string;
  contactEmail: string;
  companyName?: string;
  contactPhone?: string;
  projectNotes?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'motionify_inquiries';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique inquiry number in format: INQ-YYYY-NNN
 */
export function generateInquiryNumber(): string {
  const year = new Date().getFullYear();
  const inquiries = getInquiries();

  // Find the highest number for this year
  const currentYearInquiries = inquiries.filter(inq =>
    inq.inquiryNumber.startsWith(`INQ-${year}`)
  );

  let maxNumber = 0;
  currentYearInquiries.forEach(inq => {
    const match = inq.inquiryNumber.match(/INQ-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  });

  const nextNumber = maxNumber + 1;
  return `INQ-${year}-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  // Allow +, -, spaces, parentheses, and digits
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// ============================================================================
// localStorage Operations
// ============================================================================

/**
 * Get all inquiries from localStorage
 */
export function getInquiries(): Inquiry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const inquiries = JSON.parse(data) as Inquiry[];

    // Sort by creation date (newest first)
    return inquiries.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error reading inquiries from localStorage:', error);
    return [];
  }
}

/**
 * Get a single inquiry by ID
 */
export function getInquiryById(id: string): Inquiry | null {
  const inquiries = getInquiries();
  return inquiries.find(inq => inq.id === id) || null;
}

/**
 * Get a single inquiry by inquiry number
 */
export function getInquiryByNumber(inquiryNumber: string): Inquiry | null {
  const inquiries = getInquiries();
  return inquiries.find(inq => inq.inquiryNumber === inquiryNumber) || null;
}

/**
 * Save inquiries array to localStorage
 */
function saveInquiries(inquiries: Inquiry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
  } catch (error) {
    console.error('Error saving inquiries to localStorage:', error);
    throw new Error('Failed to save inquiry. Please try again.');
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new inquiry
 */
export function createInquiry(data: {
  quizAnswers: QuizSelections;
  contactInfo: ContactInfo;
  recommendedVideoType: string;
}): Inquiry {
  // Validate required fields
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

  // Generate unique ID and inquiry number
  const id = crypto.randomUUID();
  const inquiryNumber = generateInquiryNumber();
  const now = new Date().toISOString();

  const inquiry: Inquiry = {
    id,
    inquiryNumber,
    status: 'new',
    createdAt: now,
    updatedAt: now,

    // Contact info
    contactName: data.contactInfo.contactName.trim(),
    contactEmail: data.contactInfo.contactEmail.trim().toLowerCase(),
    companyName: data.contactInfo.companyName?.trim(),
    contactPhone: data.contactInfo.contactPhone?.trim(),
    projectNotes: data.contactInfo.projectNotes?.trim(),

    // Quiz data
    quizAnswers: data.quizAnswers,
    recommendedVideoType: data.recommendedVideoType,
  };

  // Save to localStorage
  const inquiries = getInquiries();
  inquiries.unshift(inquiry); // Add to beginning (newest first)
  saveInquiries(inquiries);

  return inquiry;
}

/**
 * Update an inquiry
 */
export function updateInquiry(id: string, updates: Partial<Inquiry>): Inquiry {
  const inquiries = getInquiries();
  const index = inquiries.findIndex(inq => inq.id === id);

  if (index === -1) {
    throw new Error('Inquiry not found');
  }

  const updatedInquiry: Inquiry = {
    ...inquiries[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  inquiries[index] = updatedInquiry;
  saveInquiries(inquiries);

  return updatedInquiry;
}

/**
 * Update inquiry status
 */
export function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
  additionalData?: {
    proposalId?: string;
    convertedToProjectId?: string;
  }
): Inquiry {
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

/**
 * Delete an inquiry
 */
export function deleteInquiry(id: string): void {
  const inquiries = getInquiries();
  const filtered = inquiries.filter(inq => inq.id !== id);

  if (filtered.length === inquiries.length) {
    throw new Error('Inquiry not found');
  }

  saveInquiries(filtered);
}

/**
 * Get inquiries by status
 */
export function getInquiriesByStatus(status: InquiryStatus): Inquiry[] {
  const inquiries = getInquiries();
  return inquiries.filter(inq => inq.status === status);
}

/**
 * Get inquiry statistics
 */
export function getInquiryStats() {
  const inquiries = getInquiries();

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

/**
 * Clear all inquiries (for testing/demo purposes)
 */
export function clearAllInquiries(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Seed sample inquiries for testing/demo
 */
export function seedSampleInquiries(): void {
  const existingInquiries = getInquiries();
  if (existingInquiries.length > 0) {
    console.log('Sample inquiries already exist. Skipping seed.');
    return;
  }

  const sampleInquiries: Inquiry[] = [
    {
      id: crypto.randomUUID(),
      inquiryNumber: 'INQ-2025-001',
      status: 'new',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
      id: crypto.randomUUID(),
      inquiryNumber: 'INQ-2025-002',
      status: 'proposal_sent',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
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
      id: crypto.randomUUID(),
      inquiryNumber: 'INQ-2025-003',
      status: 'new',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
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
    {
      id: crypto.randomUUID(),
      inquiryNumber: 'INQ-2025-004',
      status: 'accepted',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      contactName: 'David Park',
      contactEmail: 'david@edtech.edu',
      companyName: 'EduTech Solutions',
      contactPhone: '+1 (555) 345-6789',
      projectNotes: 'Educational video series for online course platform',
      quizAnswers: {
        niche: 'Education',
        audience: 'Students',
        style: 'Mixed Media',
        mood: 'Inspirational',
        duration: 'Demo',
      },
      recommendedVideoType: 'Educational Course Content',
    },
    {
      id: crypto.randomUUID(),
      inquiryNumber: 'INQ-2025-005',
      status: 'reviewing',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      contactName: 'Jennifer Lee',
      contactEmail: 'jennifer@realestate.pro',
      companyName: 'Prime Properties',
      contactPhone: '+1 (555) 456-7890',
      projectNotes: 'Property showcase videos for luxury listings',
      quizAnswers: {
        niche: 'Real Estate',
        audience: 'Investors',
        style: 'Live Action',
        mood: 'Corporate',
        duration: 'Demo',
      },
      recommendedVideoType: 'Property Tour Video',
    },
  ];

  saveInquiries(sampleInquiries);
  console.log('✅ Seeded 5 sample inquiries');
}
