'use client';

import type { PaymentRecord, Project, MockUser, ProjectDeliverable, ProjectPricing } from '@/lib/payment.types';
import { fetchProposalById } from '@/lib/proposals';
import { fetchInquiryById } from '@/lib/inquiries';

const PAYMENTS_KEY = 'motionify_payments';
const PROJECTS_KEY = 'motionify_projects';
const USERS_KEY = 'motionify_users';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Payment Record Management */

export async function createPaymentRecord(
  proposalId: string,
  razorpayOrderId: string,
  amount: number,
  currency: 'INR' | 'USD'
): Promise<PaymentRecord> {
  const proposal = await fetchProposalById(proposalId);
  if (!proposal) throw new Error('Proposal not found');

  const payment: PaymentRecord = {
    id: generateId(),
    proposalId,
    inquiryId: proposal.inquiryId,
    amount,
    currency,
    paymentType: 'advance',
    razorpayOrderId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const payments = getPayments();
  payments.push(payment);
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));

  return payment;
}

export function getPayments(): PaymentRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PAYMENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getPaymentById(id: string): PaymentRecord | null {
  const payments = getPayments();
  return payments.find(p => p.id === id) || null;
}

export function getPaymentByOrderId(orderId: string): PaymentRecord | null {
  const payments = getPayments();
  return payments.find(p => p.razorpayOrderId === orderId) || null;
}

export function updatePaymentRecord(
  id: string,
  updates: Partial<PaymentRecord>
): PaymentRecord | null {
  const payments = getPayments();
  const index = payments.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  payments[index] = { ...payments[index], ...updates };
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  
  return payments[index];
}

/** Project Management */

export async function createProjectFromPayment(proposalId: string): Promise<Project> {
  const proposal = await fetchProposalById(proposalId);
  if (!proposal) throw new Error('Proposal not found');

  const inquiry = await fetchInquiryById(proposal.inquiryId);
  if (!inquiry) throw new Error('Inquiry not found');

  const deliverables: ProjectDeliverable[] = proposal.deliverables.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    status: 'pending' as const,
    estimatedCompletionWeek: d.estimatedCompletionWeek,
  }));

  const pricing: ProjectPricing = {
    totalAmount: proposal.totalPrice,
    advancePaid: proposal.advanceAmount,
    balanceDue: proposal.balanceAmount,
    currency: proposal.currency,
  };

  const project: Project = {
    id: generateId(),
    proposalId,
    inquiryId: inquiry.id,
    clientEmail: inquiry.contactEmail,
    clientName: inquiry.contactName,
    companyName: inquiry.companyName,
    status: 'active',
    deliverables,
    pricing,
    totalRevisions: 2,
    usedRevisions: 0,
    createdAt: new Date().toISOString(),
    startDate: new Date().toISOString(),
  };

  const projects = getProjects();
  projects.push(project);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  await createOrUpdateMockUser({
    email: inquiry.contactEmail,
    name: inquiry.contactName,
    projectId: project.id,
  });

  console.log('Account created:', {
    projectId: project.id,
    clientEmail: project.clientEmail,
    clientName: project.clientName,
    timestamp: new Date().toISOString(),
  });

  console.log('Welcome email sent:', {
    to: project.clientEmail,
    subject: `Welcome to Motionify - Project ${project.id}`,
    body: `Your project has been created and is ready to begin...`,
    timestamp: new Date().toISOString(),
  });

  return project;
}

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getProjectById(id: string): Project | null {
  const projects = getProjects();
  return projects.find(p => p.id === id) || null;
}

export function getProjectByProposalId(proposalId: string): Project | null {
  const projects = getProjects();
  return projects.find(p => p.proposalId === proposalId) || null;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  projects[index] = { ...projects[index], ...updates };
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  
  return projects[index];
}

/** Mock User Management */

export async function createOrUpdateMockUser(data: {
  email: string;
  name: string;
  projectId: string;
}): Promise<MockUser> {
  const users = getUsers();
  
  let user = users.find(u => u.email === data.email);
  
  if (user) {
    if (!user.projectIds.includes(data.projectId)) {
      user.projectIds.push(data.projectId);
    }
  } else {
    user = {
      id: generateId(),
      email: data.email,
      name: data.name,
      role: 'client',
      projectIds: [data.projectId],
      createdAt: new Date().toISOString(),
      source: 'payment_successful',
    };
    users.push(user);
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return user;
}

export function getUsers(): MockUser[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getUserByEmail(email: string): MockUser | null {
  const users = getUsers();
  return users.find(u => u.email === email) || null;
}

export function getUserById(id: string): MockUser | null {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}
