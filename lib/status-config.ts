import { Clock, CheckCircle2, XCircle, MessageSquare, type LucideIcon } from 'lucide-react';

export type ProposalStatus = 'sent' | 'accepted' | 'rejected' | 'changes_requested';

export interface StatusConfig {
  adminLabel: string;      // Internal label for admins
  clientLabel: string;     // Professional label for clients
  icon: LucideIcon;
  colorClass: string;      // Tailwind classes for badge background, text, ring
  iconColorClass: string;  // Icon-specific color
  showToClient: boolean;   // Whether clients should see this status
  allowsEdit: boolean;     // Whether admin can edit proposal in this status
}

export const STATUS_CONFIG: Record<ProposalStatus, StatusConfig> = {
  sent: {
    adminLabel: 'Sent',
    clientLabel: 'Awaiting Your Review',
    icon: Clock,
    colorClass: 'bg-amber-100 text-amber-800 ring-amber-300',
    iconColorClass: 'text-amber-600',
    showToClient: true,
    allowsEdit: false,  // Waiting for client response
  },
  accepted: {
    adminLabel: 'Accepted',
    clientLabel: 'Accepted',
    icon: CheckCircle2,
    colorClass: 'bg-green-100 text-green-800 ring-green-300',
    iconColorClass: 'text-green-600',
    showToClient: true,
    allowsEdit: false,  // Client has responded
  },
  rejected: {
    adminLabel: 'Rejected',
    clientLabel: 'Declined',
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-800 ring-red-300',
    iconColorClass: 'text-red-600',
    showToClient: true,
    allowsEdit: false,  // Client has responded
  },
  changes_requested: {
    adminLabel: 'Revision Requested',
    clientLabel: 'Revision Requested',
    icon: MessageSquare,
    colorClass: 'bg-orange-100 text-orange-800 ring-orange-300',
    iconColorClass: 'text-orange-600',
    showToClient: true,
    allowsEdit: true,   // Admin can edit to address feedback
  },
};

export function getStatusLabel(status: ProposalStatus, role: 'admin' | 'client'): string {
  const config = STATUS_CONFIG[status];
  return role === 'client' ? config.clientLabel : config.adminLabel;
}

export function getStatusConfig(status: ProposalStatus): StatusConfig {
  return STATUS_CONFIG[status];
}
