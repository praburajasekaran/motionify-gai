'use client';

import React, { useContext, useState } from 'react';
import { Activity, ActivityType, TaskStatus, UserRole } from '@/lib/portal/types';
import { AppContext } from '@/lib/portal/AppContext';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';
import Button from './ui/Button';
import RequestRevisionModal from './RequestRevisionModal';
import TaskItem from './TaskItem';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  MessageSquare,
  PlusCircle,
  PenSquare,
  CornerDownRight,
  Send,
  ThumbsUp,
  ThumbsDown,
  FileEdit,
  CreditCard,
  Bell,
  FolderPlus,
  FileCheck,
  Upload,
  Download,
  UserPlus,
  UserMinus,
  Users,
  Circle,
  Loader,
  Eye,
  Clock,
  Download as DownloadIcon,
  Trash2,
  Inbox,
  ArrowRightLeft
} from 'lucide-react';
import { timeAgo } from '@/lib/portal/utils/dateUtils';

const CLIENT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Not Started', color: 'text-zinc-400', icon: Circle },
  in_progress: { label: 'In Progress', color: 'text-blue-400', icon: Loader },
  beta_ready: { label: 'Ready for Review', color: 'text-purple-400', icon: Eye },
  awaiting_approval: { label: 'Awaiting Your Approval', color: 'text-amber-400', icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-400', icon: CheckCircle2 },
  revision_requested: { label: 'Revision Requested', color: 'text-red-400', icon: AlertCircle },
  payment_pending: { label: 'Payment Pending', color: 'text-amber-400', icon: CreditCard },
  final_delivered: { label: 'Delivered', color: 'text-emerald-400', icon: DownloadIcon },
};

interface ProjectHomeProps {
  onSelectDeliverable: (deliverableId: string) => void;
}

/**
 * Get role-aware activity message and icon
 * Adjusts phrasing based on whether the viewer is the actor, recipient, or third party
 */
const getActivityDetails = (activity: Activity, currentUserId: string | undefined) => {
  const { type, userId, userName, targetUserId, targetUserName, details } = activity;

  // Helper to determine relationship
  const isActor = currentUserId === userId;
  const isRecipient = currentUserId === targetUserId;

  // Helper to get actor name (use "You" if current user is the actor)
  const actorName = isActor ? 'You' : userName;
  const recipientName = isRecipient ? 'you' : targetUserName;

  // Style for names
  const nameClass = "font-semibold text-white";
  const highlightClass = "font-semibold text-cyan-400";

  let icon: React.ReactNode;
  let message: React.ReactNode;

  switch (type) {
    // Task activities
    case 'TASK_STATUS_CHANGED':
      icon = <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> updated task "{details.taskTitle}" to{' '}
          <span className={highlightClass}>{details.newStatus}</span>.
        </p>
      );
      break;

    case 'TASK_CREATED':
      icon = <PlusCircle className="h-5 w-5 text-blue-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> created a new task: "{details.taskTitle}".
        </p>
      );
      break;

    case 'TASK_UPDATED':
      icon = <PenSquare className="h-5 w-5 text-amber-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> updated task "{details.taskTitle}".
        </p>
      );
      break;

    case 'REVISION_REQUESTED':
      icon = <AlertCircle className="h-5 w-5 text-orange-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> requested a revision on "{details.taskTitle}".
        </p>
      );
      break;

    case 'COMMENT_ADDED':
      icon = <MessageSquare className="h-5 w-5 text-blue-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> commented on "{details.taskTitle}".
        </p>
      );
      break;

    // File activities
    case 'FILE_UPLOADED':
      icon = <FileUp className="h-5 w-5 text-purple-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> uploaded file "{details.fileName}".
        </p>
      );
      break;

    case 'FILE_RENAMED':
      icon = <FileEdit className="h-5 w-5 text-purple-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> renamed "{details.oldName}" to "{details.newName}".
        </p>
      );
      break;

    case 'FILE_DOWNLOADED':
      icon = <Download className="h-5 w-5 text-purple-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> downloaded "{details.fileName}".
        </p>
      );
      break;

    // Team activities
    case 'TEAM_MEMBER_INVITED':
      icon = <UserPlus className="h-5 w-5 text-teal-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> invited {details.invitedMemberName} to the team.
        </p>
      );
      break;

    case 'TEAM_MEMBER_REMOVED':
      icon = <UserMinus className="h-5 w-5 text-red-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> removed {details.removedMemberName} from the team.
        </p>
      );
      break;

    case 'TEAM_UPDATED':
      icon = <Users className="h-5 w-5 text-teal-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> updated the team: {details.changeDescription}.
        </p>
      );
      break;

    // Proposal activities (role-aware)
    case 'PROPOSAL_SENT':
      icon = <Send className="h-5 w-5 text-blue-400" />;
      if (isActor) {
        message = (
          <p>
            <span className={nameClass}>You</span> sent a proposal to <span className={nameClass}>{targetUserName}</span>.
          </p>
        );
      } else if (isRecipient) {
        message = (
          <p>
            <span className={nameClass}>You</span> received a proposal from <span className={nameClass}>{userName}</span>.
          </p>
        );
      } else {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> sent a proposal to <span className={nameClass}>{targetUserName}</span>.
          </p>
        );
      }
      break;

    case 'PROPOSAL_ACCEPTED':
      icon = <ThumbsUp className="h-5 w-5 text-emerald-400" />;
      if (isActor) {
        message = (
          <p>
            <span className={nameClass}>You</span> accepted the proposal.
          </p>
        );
      } else if (isRecipient) {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> accepted your proposal.
          </p>
        );
      } else {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> accepted the proposal from <span className={nameClass}>{targetUserName}</span>.
          </p>
        );
      }
      break;

    case 'PROPOSAL_REJECTED':
      icon = <ThumbsDown className="h-5 w-5 text-red-400" />;
      if (isActor) {
        message = (
          <p>
            <span className={nameClass}>You</span> declined the proposal.
          </p>
        );
      } else if (isRecipient) {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> declined your proposal.
          </p>
        );
      } else {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> declined the proposal.
          </p>
        );
      }
      break;

    case 'PROPOSAL_CHANGES_REQUESTED':
      icon = <FileEdit className="h-5 w-5 text-amber-400" />;
      if (isActor) {
        message = (
          <p>
            <span className={nameClass}>You</span> requested changes to the proposal.
          </p>
        );
      } else if (isRecipient) {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> requested changes to your proposal.
          </p>
        );
      } else {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> requested changes to the proposal.
          </p>
        );
      }
      break;

    // Deliverable activities (role-aware)
    case 'DELIVERABLE_UPLOADED':
      icon = <Upload className="h-5 w-5 text-purple-400" />;
      if (isActor) {
        message = (
          <p>
            <span className={nameClass}>You</span> uploaded "{details.deliverableName}"{details.version ? ` (${details.version})` : ''}.
          </p>
        );
      } else if (isRecipient) {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> uploaded "{details.deliverableName}" for your review.
          </p>
        );
      } else {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> uploaded "{details.deliverableName}".
          </p>
        );
      }
      break;

    case 'DELIVERABLE_APPROVED':
      icon = <FileCheck className="h-5 w-5 text-emerald-400" />;
      if (isActor) {
        message = (
          <p>
            <span className={nameClass}>You</span> approved "{details.deliverableName}".
          </p>
        );
      } else if (isRecipient) {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> approved your deliverable "{details.deliverableName}".
          </p>
        );
      } else {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> approved "{details.deliverableName}".
          </p>
        );
      }
      break;

    case 'DELIVERABLE_REJECTED':
      icon = <ThumbsDown className="h-5 w-5 text-red-400" />;
      if (isActor) {
        message = (
          <p>
            <span className={nameClass}>You</span> requested revisions on "{details.deliverableName}".
          </p>
        );
      } else if (isRecipient) {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> requested revisions on "{details.deliverableName}".
          </p>
        );
      } else {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> requested revisions on "{details.deliverableName}".
          </p>
        );
      }
      break;

    // Payment activities (role-aware)
    case 'PAYMENT_RECEIVED':
      icon = <CreditCard className="h-5 w-5 text-emerald-400" />;
      if (isActor) {
        message = (
          <p>
            <span className={nameClass}>You</span> made a payment of {details.amount} ({details.paymentType}).
          </p>
        );
      } else if (isRecipient) {
        message = (
          <p>
            Payment received from <span className={nameClass}>{userName}</span> ({details.paymentType}).
          </p>
        );
      } else {
        message = (
          <p>
            <span className={nameClass}>{userName}</span> made a payment ({details.paymentType}).
          </p>
        );
      }
      break;

    case 'PAYMENT_REMINDER_SENT':
      icon = <Bell className="h-5 w-5 text-amber-400" />;
      if (isRecipient) {
        message = (
          <p>
            <span className={nameClass}>You</span> received a payment reminder.
          </p>
        );
      } else {
        message = (
          <p>
            Payment reminder sent to <span className={nameClass}>{targetUserName}</span>.
          </p>
        );
      }
      break;

    // Project activities
    case 'PROJECT_CREATED':
      icon = <FolderPlus className="h-5 w-5 text-blue-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> created the project.
        </p>
      );
      break;

    case 'TERMS_ACCEPTED':
      icon = <FileCheck className="h-5 w-5 text-emerald-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> accepted the project terms.
        </p>
      );
      break;

    case 'TASK_DELETED':
      icon = <Trash2 className="h-5 w-5 text-red-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> deleted task "{details.taskTitle}".
        </p>
      );
      break;

    case 'FILE_DELETED':
      icon = <Trash2 className="h-5 w-5 text-red-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> deleted file "{details.fileName}".
        </p>
      );
      break;

    case 'DELIVERABLE_CREATED':
      icon = <PlusCircle className="h-5 w-5 text-purple-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> created deliverable "{details.deliverableName}".
        </p>
      );
      break;

    case 'DELIVERABLE_DELETED':
      icon = <Trash2 className="h-5 w-5 text-red-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> deleted deliverable "{details.deliverableName}".
        </p>
      );
      break;

    case 'DELIVERABLE_STATUS_CHANGED':
      icon = <ArrowRightLeft className="h-5 w-5 text-amber-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> changed deliverable "{details.deliverableName}" status to{' '}
          <span className={highlightClass}>{details.newStatus}</span>.
        </p>
      );
      break;

    case 'INQUIRY_CREATED':
      icon = <Inbox className="h-5 w-5 text-blue-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> submitted an inquiry.
        </p>
      );
      break;

    case 'INQUIRY_STATUS_CHANGED':
      icon = <ArrowRightLeft className="h-5 w-5 text-amber-400" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> changed inquiry status to{' '}
          <span className={highlightClass}>{details.newStatus}</span>.
        </p>
      );
      break;

    default:
      icon = <PenSquare className="h-5 w-5 text-white/40" />;
      message = (
        <p>
          <span className={nameClass}>{actorName}</span> made an update.
        </p>
      );
      break;
  }

  return { icon, message };
};

const ActivityFeed = () => {
  const { project, currentUser } = useContext(AppContext);
  const sortedActivities = [...(project?.activities || [])].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {sortedActivities.map((activity, index) => {
          const { icon, message } = getActivityDetails(activity, currentUser?.id);
          const isLast = index === sortedActivities.length - 1;
          return (
            <li key={activity.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-white/10"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div>
                    <div className="relative px-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10">
                        {icon}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 py-1.5">
                    <div className="text-sm text-white/70">
                      {message}
                      <span className="whitespace-nowrap text-xs text-white/40 ml-2">
                        {timeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};


const ProjectHome = ({ onSelectDeliverable }: ProjectHomeProps) => {
  const { project, currentUser, addRevision } = useContext(AppContext);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  if (!project) return null;

  const isClientUser = currentUser?.role === UserRole.PRIMARY_CONTACT || currentUser?.role === UserRole.TEAM_MEMBER;
  const tasksAwaitingApproval = project.tasks.filter(t => t.status === TaskStatus.AWAITING_APPROVAL && t.visibleToClient);

  const visibleTasks = project.tasks.filter(t => isClientUser ? t.visibleToClient : true);
  const completedTasksCount = visibleTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  const overallProgress = visibleTasks.length > 0 ? (completedTasksCount / visibleTasks.length) * 100 : 0;

  const revisionsLeft = project.totalRevisions - project.usedRevisions;
  const revisionProgress = (project.usedRevisions / project.totalRevisions) * 100;
  const getRevisionStatusStyles = () => {
    if (revisionsLeft <= 0) return { barColor: 'bg-red-600', textColor: 'text-red-500 font-semibold', message: 'All revisions used.' };
    if (revisionsLeft === 1) return { barColor: 'bg-yellow-500', textColor: 'text-yellow-500 font-semibold', message: '1 revision remaining.' };
    return { barColor: 'bg-indigo-600', textColor: 'text-gray-500', message: `${revisionsLeft} revisions remaining.` };
  };
  const revisionStatus = getRevisionStatusStyles();

  return (
    <>
      <div className="space-y-8">
        <Card>
          <h3 className="text-base font-semibold leading-6 text-white">Overall Progress</h3>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-white/60">{completedTasksCount} of {visibleTasks.length} tasks completed</p>
            <p className="text-sm font-semibold text-cyan-400">{Math.round(overallProgress)}%</p>
          </div>
          <div className="mt-2">
            <ProgressBar progress={overallProgress} />
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-8">
            {isClientUser && tasksAwaitingApproval.length > 0 && (
              <Card title="Awaiting Your Action">
                <div className="space-y-4">
                  {tasksAwaitingApproval.map(task => <TaskItem key={task.id} task={task} onEdit={() => {}} />)}
                </div>
              </Card>
            )}
            
            <Card title="Project Scope & Deliverables">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-white mb-3">Deliverables</h4>
                  <div className="space-y-2">
                    {project.scope.deliverables.map((deliverable) => {
                      const statusConfig = CLIENT_STATUS_CONFIG[deliverable.status] || CLIENT_STATUS_CONFIG.pending;
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div
                          key={deliverable.id}
                          onClick={() => onSelectDeliverable(deliverable.id)}
                          className="p-4 flex items-center justify-between bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-200 group"
                          role="button" tabIndex={0}
                        >
                          <div className="flex items-center gap-3">
                            <h5 className="font-semibold text-sm text-white group-hover:text-cyan-400 transition-colors">{deliverable.name}</h5>
                            <span className={`flex items-center gap-1 text-xs ${statusConfig.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </span>
                          </div>
                          <CornerDownRight className="h-4 w-4 text-white/40 group-hover:text-cyan-400 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {project.scope.nonInclusions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white">Non-Inclusions</h4>
                    <ul className="space-y-1.5 mt-2 list-disc list-inside">
                      {project.scope.nonInclusions.map((item, index) => (
                        <li key={index} className="text-sm text-white/60">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Revisions">
              <p className="mt-1 text-sm text-white/60">
                {project.usedRevisions} of {project.totalRevisions} revisions used.
              </p>
              <div className="w-full bg-slate-700/50 rounded-full h-2.5 mt-2">
                <div
                  className={`h-2.5 rounded-full ${revisionProgress <= 50 ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : revisionProgress <= 80 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
                  style={{ width: `${revisionProgress}%` }}
                ></div>
              </div>
              <p className={`mt-1 text-xs ${revisionsLeft <= 0 ? 'text-red-400 font-semibold' : revisionsLeft === 1 ? 'text-yellow-400 font-semibold' : 'text-white/50'}`}>{revisionStatus.message}</p>
              {revisionsLeft <= 0 && (
                <div className="mt-4">
                  <Button variant="secondary" className="w-full" onClick={() => setIsRequestModalOpen(true)}>
                    Request Additional Revision
                  </Button>
                </div>
              )}
            </Card>
          </div>
          <Card title="Recent Activity">
            <ActivityFeed />
          </Card>
        </div>
      </div>
      <RequestRevisionModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onConfirm={() => {
            addRevision(project.id);
            setIsRequestModalOpen(false);
        }}
      />
    </>
  );
};

export default ProjectHome;

