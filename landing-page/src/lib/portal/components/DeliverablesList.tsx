import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileVideo, 
  Download, 
  ThumbsUp, 
  MessageSquareWarning,
  Loader2,
  Lock,
  File,
  Play
} from 'lucide-react';
import { Button } from './ui/design-system';

// Extended types for the workflow
type DeliverableStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'beta_ready' 
  | 'awaiting_approval' 
  | 'approved' 
  | 'payment_pending' 
  | 'final_delivered' 
  | 'rejected' 
  | 'revision_requested';

interface DeliverableItem {
  id: string;
  name: string;
  description: string;
  status: DeliverableStatus;
  type: 'Video' | 'Image' | 'Document';
  estimatedCompletionWeek?: number;
  betaFileUrl?: string;
  betaFileName?: string;
  finalFileUrl?: string;
  revisionsConsumed: number;
  format?: string;
  order: number;
}

interface DeliverablesListProps {
  projectId: string;
  userRole?: 'client' | 'admin' | 'team_member';
}

export default function DeliverablesList({ projectId, userRole = 'client' }: DeliverablesListProps) {
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Mock data loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Enhanced mock data representing different states of the workflow
      const mockData: DeliverableItem[] = [
        {
          id: 'd1',
          name: 'Script & Concept',
          description: 'Final approved script and storyboard documentation.',
          status: 'final_delivered',
          type: 'Document',
          estimatedCompletionWeek: 1,
          finalFileUrl: '#',
          revisionsConsumed: 1,
          format: 'PDF',
          order: 1
        },
        {
          id: 'd2',
          name: 'Main Launch Video (16:9)',
          description: '2-minute product explainer with 3D motion graphics.',
          status: 'awaiting_approval',
          type: 'Video',
          estimatedCompletionWeek: 4,
          betaFileUrl: '#',
          betaFileName: 'launch-video-v1-beta.mp4',
          revisionsConsumed: 0,
          format: 'MP4 4K',
          order: 2
        },
        {
          id: 'd3',
          name: 'Social Teaser (9:16)',
          description: 'Vertical cut for Instagram Reels and TikTok.',
          status: 'in_progress',
          type: 'Video',
          estimatedCompletionWeek: 5,
          revisionsConsumed: 0,
          format: 'MP4 1080p',
          order: 3
        },
        {
          id: 'd4',
          name: 'Thumbnail Pack',
          description: 'Set of 5 high-res thumbnails for YouTube.',
          status: 'pending',
          type: 'Image',
          estimatedCompletionWeek: 5,
          revisionsConsumed: 0,
          format: 'JPG/PNG',
          order: 4
        }
      ];

      setDeliverables(mockData);
      setLoading(false);
    };

    loadData();
  }, [projectId]);

  const handleAction = (action: string, id: string) => {
    console.log(`Action ${action} on deliverable ${id}`);
    if (action === 'approve') {
      alert(`Proceed to approve deliverable ${id}? This will trigger the payment workflow.`);
    } else if (action === 'request_changes') {
      alert(`Request changes for deliverable ${id}. This will consume a revision.`);
    } else {
      alert(`Triggered action: ${action}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500 bg-white rounded-xl border border-zinc-200/60 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
        <p className="text-sm font-medium">Loading deliverables...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-zinc-900">Project Deliverables</h3>
          <p className="text-sm text-zinc-500">Review, approve, and download your project assets.</p>
        </div>
        
        {/* Revision Summary Badge */}
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-zinc-700">1/3 Revisions Used</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {deliverables.map((item) => (
          <DeliverableCard 
            key={item.id} 
            item={item} 
            isClient={userRole === 'client'}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );
}

function DeliverableCard({ 
  item, 
  isClient,
  onAction 
}: { 
  item: DeliverableItem; 
  isClient: boolean;
  onAction: (action: string, id: string) => void;
}) {
  const statusConfig = getStatusConfig(item.status);
  // Allow actions if status allows for it.
  // For beta_ready or awaiting_approval, we show review actions.
  const isActionable = (item.status === 'awaiting_approval' || item.status === 'beta_ready') && isClient;
  const isPaymentLocked = item.status === 'payment_pending';
  const isCompleted = item.status === 'final_delivered';
  
  return (
    <div className={`
      group relative overflow-hidden rounded-xl border bg-white transition-all duration-300
      ${isActionable ? 'border-amber-200 shadow-lg shadow-amber-500/5 ring-1 ring-amber-100' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md'}
    `}>
      {/* Status Bar Indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.barColor}`} />

      <div className="flex flex-col lg:flex-row gap-6 p-6 pl-8">
        
        {/* Icon & Info */}
        <div className="flex-1 flex gap-5">
          <div className={`
            flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm
            ${isActionable ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-zinc-50 border-zinc-100 text-zinc-500'}
          `}>
            {item.type === 'Video' ? <FileVideo className="h-6 w-6" /> : <File className="h-6 w-6" />}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="text-base font-bold text-zinc-900 truncate">{item.name}</h4>
              <span className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm
                ${statusConfig.badgeStyle}
              `}>
                {statusConfig.icon && <statusConfig.icon className="w-3 h-3 mr-1.5" />}
                {statusConfig.label}
              </span>
            </div>
            <p className="text-sm text-zinc-500 line-clamp-2">{item.description}</p>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400 font-medium">
              {item.estimatedCompletionWeek && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Target: Week {item.estimatedCompletionWeek}
                </span>
              )}
              {item.format && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-100">
                  {item.format}
                </span>
              )}
              {item.revisionsConsumed > 0 && (
                 <span className="text-zinc-500">{item.revisionsConsumed} revision{item.revisionsConsumed !== 1 ? 's' : ''} used</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Area */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:pl-6 lg:border-l lg:border-zinc-100 lg:min-w-[320px] justify-center">
          
          {/* 1. Pending / In Progress State */}
          {(item.status === 'pending' || item.status === 'in_progress') && (
            <div className="text-center w-full py-2">
              <span className="text-sm text-zinc-400 italic">
                Estimated Delivery: Week {item.estimatedCompletionWeek}
              </span>
            </div>
          )}

          {/* 2. Beta Review State (Action Required) */}
          {isActionable && (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100/60">
                 <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                   <Play className="h-3.5 w-3.5 ml-0.5" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-900">Beta Ready</p>
                    <p className="text-[10px] text-amber-700/80 truncate">{item.betaFileName}</p>
                 </div>
                 <Button 
                   size="sm" 
                   variant="outline" 
                   className="h-8 border-amber-200 bg-white text-amber-800 hover:bg-amber-50 hover:border-amber-300 text-xs"
                   onClick={() => onAction('download_beta', item.id)}
                 >
                   <Download className="w-3 h-3 mr-1.5" />
                   View
                 </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm" 
                  variant="outline" 
                  size="sm"
                  onClick={() => onAction('request_changes', item.id)}
                >
                  <MessageSquareWarning className="w-3.5 h-3.5 mr-1.5" />
                  Changes
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-br from-zinc-900 to-zinc-800 hover:from-black hover:to-zinc-900 text-white shadow-md" 
                  size="sm"
                  onClick={() => onAction('approve', item.id)}
                >
                  <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                  Approve
                </Button>
              </div>
            </div>
          )}

          {/* 3. Payment Pending State */}
          {isPaymentLocked && (
             <div className="w-full space-y-3">
                <div className="flex items-center justify-center gap-2 p-3 bg-zinc-50 rounded-lg border border-dashed border-zinc-300 text-zinc-500">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-medium">Files Locked</span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 shadow-sm"
                  onClick={() => onAction('pay', item.id)}
                >
                  Pay to Unlock
                </Button>
             </div>
          )}

          {/* 4. Final Download State */}
          {isCompleted && (
            <div className="w-full space-y-3">
              <div className="text-xs text-emerald-600 text-center font-medium">
                Files available for download
              </div>
              <Button 
                variant="default" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 border-transparent"
                onClick={() => onAction('download_final', item.id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Final
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function getStatusConfig(status: DeliverableStatus) {
  switch (status) {
    case 'pending':
      return {
        label: 'NOT STARTED',
        icon: Clock,
        badgeStyle: 'bg-zinc-100 text-zinc-500 border-zinc-200',
        barColor: 'bg-zinc-200'
      };
    case 'in_progress':
      return {
        label: 'IN PROGRESS',
        icon: Loader2,
        badgeStyle: 'bg-blue-50 text-blue-600 border-blue-100',
        barColor: 'bg-blue-500'
      };
    case 'beta_ready':
    case 'awaiting_approval':
      return {
        label: 'AWAITING YOU',
        icon: AlertCircle,
        badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
        barColor: 'bg-amber-400'
      };
    case 'revision_requested':
    case 'rejected':
      return {
        label: 'REVISION REQUESTED',
        icon: MessageSquareWarning,
        badgeStyle: 'bg-orange-50 text-orange-700 border-orange-200',
        barColor: 'bg-orange-500'
      };
    case 'approved':
    case 'payment_pending':
      return {
        label: 'APPROVED',
        icon: CheckCircle2,
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barColor: 'bg-emerald-500'
      };
    case 'final_delivered':
      return {
        label: 'COMPLETED',
        icon: CheckCircle2,
        badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        barColor: 'bg-emerald-600'
      };
    default:
      return {
        label: 'UNKNOWN',
        icon: null,
        badgeStyle: 'bg-zinc-100 text-zinc-500',
        barColor: 'bg-zinc-200'
      };
  }
}