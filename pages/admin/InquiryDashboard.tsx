import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getInquiries, getInquiriesByClientUserId, getInquiryStats, type Inquiry, type InquiryStatus } from '../../lib/inquiries';
import { Search, Filter, Plus, Calendar, User, Mail, TrendingUp, Clock, FileText, CheckCircle } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Permissions, isClient } from '../../lib/permissions';
import { NewInquiryModal } from '../../components/admin/NewInquiryModal';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  reviewing: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  proposal_sent: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
  negotiating: 'bg-orange-500/10 text-orange-400 ring-orange-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  project_setup: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
  payment_pending: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
  paid: 'bg-green-500/10 text-green-400 ring-green-500/20',
  converted: 'bg-emerald-600/10 text-emerald-600 ring-emerald-600/20',
  rejected: 'bg-red-500/10 text-red-400 ring-red-500/20',
  archived: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating',
  accepted: 'Accepted',
  project_setup: 'Setting Up',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  converted: 'Converted',
  rejected: 'Rejected',
  archived: 'Archived',
};

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className: string }>;
  color: 'blue' | 'amber' | 'purple' | 'green' | 'emerald';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
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
    <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${bgColors[color]} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColors[color]}`} />
        </div>
      </div>
    </div>
  );
}

export function InquiryDashboard() {
  const { user, isLoading } = useAuthContext();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const [stats, setStats] = useState<ReturnType<typeof getInquiryStats> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  

  const loadInquiries = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let allInquiries: Inquiry[];
      let inquiryStats;
      
      if (isClient(user)) {
        allInquiries = await getInquiriesByClientUserId(user.id);
        inquiryStats = await getInquiryStats(user.id);
      } else {
        allInquiries = await getInquiries();
        inquiryStats = await getInquiryStats();
      }
      
      setInquiries(allInquiries);
      setFilteredInquiries(allInquiries);
      setStats(inquiryStats);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
      setError('Failed to load inquiries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = inquiries;
  
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inq => inq.status === statusFilter);
    }
  
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inq =>
        inq.inquiryNumber.toLowerCase().includes(term) ||
        inq.contactName.toLowerCase().includes(term) ||
        inq.contactEmail.toLowerCase().includes(term) ||
        inq.companyName?.toLowerCase().includes(term)
      );
    }
  
    setFilteredInquiries(filtered);
  }, [inquiries, searchTerm, statusFilter]);


  // Wait for auth to load before checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Permission check - Only Motionify admins can access inquiry management
  if (!Permissions.canManageInquiries(user)) {
    return <Navigate to="/" replace />;
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
  
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
  
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
          {isClient(user) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white font-medium hover:brightness-110 transition shadow-lg"
            >
              <Plus className="w-5 h-5" />
              New Inquiry
            </button>
          )}
        </div>
        <p className="text-gray-600">
          {isClient(user) 
            ? 'View your inquiries and track proposals' 
            : 'Manage customer inquiries and create proposals'}
        </p>
      </div>
  
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isClient(user) ? (
            <>
              <StatCard 
                label="Total Inquiries"
                value={stats.total}
                icon={TrendingUp}
                color="blue"
              />
              <StatCard 
                label="Pending Response"
                value={stats.pendingResponse}
                icon={Clock}
                color="amber"
              />
              <StatCard 
                label="Proposal Received"
                value={stats.proposalReceived}
                icon={FileText}
                color="purple"
              />
              <StatCard 
                label="Accepted"
                value={stats.accepted}
                icon={CheckCircle}
                color="green"
              />
            </>
          ) : (
            <>
              <StatCard 
                label="Total Inquiries"
                value={stats.total}
                icon={TrendingUp}
                color="blue"
              />
              <StatCard 
                label="New"
                value={stats.new}
                icon={Mail}
                color="emerald"
              />
              <StatCard 
                label="Proposal Sent"
                value={stats.proposalSent}
                icon={User}
                color="purple"
              />
              <StatCard 
                label="Converted"
                value={stats.converted}
                icon={Calendar}
                color="green"
              />
            </>
          )}
        </div>
      )}
  
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by inquiry #, name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
              />
            </div>
          </div>
  
          {/* Status Filter */}
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InquiryStatus | 'all')}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="proposal_sent">Proposal Sent</option>
                <option value="negotiating">Negotiating</option>
                <option value="accepted">Accepted</option>
                <option value="converted">Converted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>
  
      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-12 text-center">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700">Loading inquiries...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm">
          <ErrorState error={error} onRetry={loadInquiries} />
        </div>
      ) : (
        <>
          {/* Inquiries List */}
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
            {filteredInquiries.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No inquiries found"
                description={
                  searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Inquiries will appear here when customers submit the landing page quiz'
                }
              />
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredInquiries.map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    to={`/admin/inquiries/${inquiry.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Inquiry Number & Status */}
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-base font-semibold text-gray-900 font-mono">
                            {inquiry.inquiryNumber}
                          </code>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${STATUS_COLORS[inquiry.status]}`}>
                            {STATUS_LABELS[inquiry.status]}
                          </span>
                        </div>
                    
                        {/* Contact Info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-1">
                          <div className="flex items-center gap-1.5 text-gray-900">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{inquiry.contactName}</span>
                          </div>
                          {inquiry.companyName && (
                            <span className="text-gray-700">{inquiry.companyName}</span>
                          )}
                        </div>
                    
                        <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-2">
                          <Mail className="w-4 h-4" />
                          <span>{inquiry.contactEmail}</span>
                        </div>
                    
                        {/* Video Type */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">Recommended:</span>
                          <span className="text-violet-600">{inquiry.recommendedVideoType}</span>
                        </div>
                      </div>
                    
                    {/* Right Side: Date & Action */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(inquiry.createdAt)}
                      </div>
                  
                      {inquiry.status === 'new' && Permissions.canCreateProposals(user) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.hash = `/admin/inquiries/${inquiry.id}/proposal`;
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create Proposal
                        </button>
                      )}
                    </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Results Count */}
          {filteredInquiries.length > 0 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {filteredInquiries.length} of {inquiries.length} inquiries
            </div>
          )}
        </>
      )}

      <NewInquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadInquiries}
        user={user}
      />
    </div>
  );
}
