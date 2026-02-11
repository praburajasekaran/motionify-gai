'use client';

/**
 * Payment-related type definitions
 * Used for storing and managing payment records and projects
 */

export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type PaymentType = 'advance' | 'balance';
export type ProjectStatus = 'payment_pending' | 'active' | 'completed' | 'archived';
export type DeliverableStatus = 'pending' | 'in_progress' | 'beta_ready' | 'awaiting_approval' | 'approved' | 'revision_requested';

/**
 * Payment Record - Stored in localStorage
 * Tracks all payment transactions
 */
export interface PaymentRecord {
  id: string;
  proposalId: string;
  inquiryId: string;
  projectId?: string;
  
  // Amount in paise (e.g., 4000000 = ₹40,000)
  amount: number;
  currency: 'INR' | 'USD';
  paymentType: PaymentType;
  
  // Razorpay-specific fields
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  
  // Status tracking
  status: PaymentStatus;
  failureReason?: string;
  
  // Timestamps
  createdAt: string;
  completedAt?: string;
}

/**
 * Project Deliverable - Part of Project record
 * Tracks deliverable status for a project
 */
export interface ProjectDeliverable {
  id: string;
  name: string;
  description: string;
  status: DeliverableStatus;
  estimatedCompletionWeek?: number;
  betaUploadedAt?: string;
  approvedAt?: string;
}

/**
 * Project Pricing - Part of Project record
 * Tracks financial breakdown
 */
export interface ProjectPricing {
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  currency: 'INR' | 'USD';
}

/**
 * Project - Stored in localStorage
 * Created after successful payment
 */
export interface Project {
  id: string;
  proposalId: string;
  inquiryId: string;
  
  // Client information
  clientEmail: string;
  clientName: string;
  companyName?: string;
  
  // Project status
  status: ProjectStatus;
  
  // Deliverables from proposal
  deliverables: ProjectDeliverable[];
  
  // Pricing breakdown
  pricing: ProjectPricing;
  
  // Revision tracking
  totalRevisions: number;
  usedRevisions: number;
  
  // Timestamps
  createdAt: string;
  startDate?: string;
  deliveryDate?: string;
  completedAt?: string;
}

/**
 * Mock User - Stored in localStorage
 * Created after successful payment
 */
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'admin';
  projectIds: string[];
  createdAt: string;
  source: 'payment_successful' | 'manual';
}

/**
 * Razorpay Order - Used for order creation
 */
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: 'INR' | 'USD';
  receipt?: string;
  status: 'created' | 'paid' | 'expired';
}

/**
 * Razorpay Payment Response - From checkout handler
 */
export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Payment Verification Request
 */
export interface PaymentVerificationRequest {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  proposalId: string;
}

/**
 * Payment Verification Response
 */
export interface PaymentVerificationResponse {
  verified: boolean;
  paymentRecord?: PaymentRecord;
  error?: string;
}
