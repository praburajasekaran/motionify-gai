import { Clock, CheckCircle2, XCircle, MessageSquare, type LucideIcon } from 'lucide-react';

export type ProposalStatus = 'sent' | 'accepted' | 'rejected' | 'changes_requested';

export interface StatusConfig {
  label: string;           // Client-facing professional label
  icon: LucideIcon;
  colorClass: string;      // Traffic light Tailwind classes
  iconColorClass: string;
}

export const STATUS_CONFIG: Record<ProposalStatus, StatusConfig> = {
  sent: {
    label: 'Awaiting Your Review',
    icon: Clock,
    colorClass: 'bg-amber-100 text-amber-800 ring-amber-300',
    iconColorClass: 'text-amber-600',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle2,
    colorClass: 'bg-green-100 text-green-800 ring-green-300',
    iconColorClass: 'text-green-600',
  },
  rejected: {
    label: 'Declined',
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-800 ring-red-300',
    iconColorClass: 'text-red-600',
  },
  changes_requested: {
    label: 'Revision Requested',
    icon: MessageSquare,
    colorClass: 'bg-orange-100 text-orange-800 ring-orange-300',
    iconColorClass: 'text-orange-600',
  },
};

export function getStatusConfig(status: ProposalStatus): StatusConfig {
  return STATUS_CONFIG[status];
}
