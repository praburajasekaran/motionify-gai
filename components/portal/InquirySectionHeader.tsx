import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, Clock, FileText, Mail, Plus, TrendingUp, User } from 'lucide-react';
import { getInquiries, getInquiriesByClientUserId, type Inquiry } from '../../lib/inquiries';
import { useAuthContext } from '../../contexts/AuthContext';
import { isClient } from '../../lib/permissions';
import { Button } from '../ui/design-system';
import { PageHeader } from '../ui/PageHeader';

interface InquirySectionHeaderProps {
  onNewInquiry?: () => void;
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className: string }>;
  color: 'blue' | 'amber' | 'purple' | 'green' | 'emerald';
}

function SummaryCard({ label, value, icon: Icon, color }: SummaryCardProps) {
  const bgColors = {
    blue: 'bg-blue-500/10',
    amber: 'bg-amber-500/10',
    purple: 'bg-purple-500/10',
    green: 'bg-green-500/10',
    emerald: 'bg-emerald-500/10',
  };
  const iconColors = {
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    emerald: 'text-emerald-400',
  };

  return (
    <div className="bg-card rounded-xl p-4 ring-1 ring-border shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${bgColors[color]} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColors[color]}`} />
        </div>
      </div>
    </div>
  );
}

export function InquirySectionHeader({ onNewInquiry }: InquirySectionHeaderProps) {
  const { user } = useAuthContext();
  const userIsClient = isClient(user);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const loadInquiries = async () => {
      const data = userIsClient
        ? await getInquiriesByClientUserId(user.id)
        : await getInquiries();

      if (!cancelled) setInquiries(data);
    };

    loadInquiries().catch(error => {
      console.error('Failed to load inquiry summary:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [user, userIsClient]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inquiries"
        description={userIsClient ? 'View your inquiries and track proposals' : 'Manage customer inquiries and create proposals'}
        actions={userIsClient && onNewInquiry ? (
          <Button onClick={onNewInquiry} className="gap-2 px-4 py-2 shadow-sm">
            <Plus className="w-5 h-5" />
            New Inquiry
          </Button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {userIsClient ? (
          <>
            <SummaryCard label="Total Inquiries" value={inquiries.length} icon={TrendingUp} color="blue" />
            <SummaryCard label="Pending Response" value={inquiries.filter(inquiry => inquiry.status === 'new' || inquiry.status === 'reviewing').length} icon={Clock} color="amber" />
            <SummaryCard label="Proposal Received" value={inquiries.filter(inquiry => inquiry.status === 'proposal_sent').length} icon={FileText} color="purple" />
            <SummaryCard label="Accepted" value={inquiries.filter(inquiry => inquiry.status === 'accepted').length} icon={CheckCircle} color="green" />
          </>
        ) : (
          <>
            <SummaryCard label="Total Inquiries" value={inquiries.length} icon={TrendingUp} color="blue" />
            <SummaryCard label="New" value={inquiries.filter(inquiry => inquiry.status === 'new').length} icon={Mail} color="emerald" />
            <SummaryCard label="Proposal Sent" value={inquiries.filter(inquiry => inquiry.status === 'proposal_sent').length} icon={User} color="purple" />
            <SummaryCard label="Converted" value={inquiries.filter(inquiry => inquiry.status === 'converted').length} icon={Calendar} color="green" />
          </>
        )}
      </div>
    </div>
  );
}
