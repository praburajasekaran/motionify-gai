'use client';

import React, { useContext, useState } from 'react';
import { ActivityType, TaskStatus, UserRole } from '@/lib/portal/types';
import { AppContext } from '@/lib/portal/AppContext';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';
import Button from './ui/Button';
import RequestRevisionModal from './RequestRevisionModal';
import TaskItem from './TaskItem';
import { AlertCircle, CheckCircle2, FileUp, MessageSquare, PlusCircle, PenSquare, CornerDownRight } from 'lucide-react';
import { timeAgo } from '@/lib/portal/utils/dateUtils';

interface ProjectHomeProps {
  onSelectDeliverable: (deliverableId: string) => void;
}

const ActivityFeed = () => {
    const { project } = useContext(AppContext);
    const sortedActivities = project?.activities.sort((a, b) => b.timestamp - a.timestamp) || [];

    const getActivityDetails = (activity: any) => {
        const { type, userName, details } = activity;
        let icon, message;

        switch (type) {
            case ActivityType.TASK_STATUS_CHANGED:
                icon = <CheckCircle2 className="h-5 w-5 text-[var(--todoist-green)]" />;
                message = <p><span className="font-semibold text-[var(--todoist-gray-900)]">{userName}</span> updated task "{details.taskTitle}" to <span className="font-semibold text-[var(--todoist-red)]">{details.newStatus}</span>.</p>;
                break;
            case ActivityType.COMMENT_ADDED:
                icon = <MessageSquare className="h-5 w-5 text-[var(--todoist-blue)]" />;
                message = <p><span className="font-semibold text-[var(--todoist-gray-900)]">{userName}</span> commented on "{details.taskTitle}".</p>;
                break;
            case ActivityType.FILE_UPLOADED:
                icon = <FileUp className="h-5 w-5 text-[var(--todoist-red)]" />;
                message = <p><span className="font-semibold text-[var(--todoist-gray-900)]">{userName}</span> uploaded file "{details.fileName}".</p>;
                break;
            case ActivityType.TASK_CREATED:
                icon = <PlusCircle className="h-5 w-5 text-[var(--todoist-blue)]" />;
                message = <p><span className="font-semibold text-[var(--todoist-gray-900)]">{userName}</span> created a new task: "{details.taskTitle}".</p>;
                break;
             case ActivityType.REVISION_REQUESTED:
                icon = <AlertCircle className="h-5 w-5 text-[var(--todoist-orange)]" />;
                message = <p><span className="font-semibold text-[var(--todoist-gray-900)]">{userName}</span> requested a revision on "{details.taskTitle}".</p>;
                break;
            default:
                icon = <PenSquare className="h-5 w-5 text-[var(--todoist-gray-400)]" />;
                message = <p><span className="font-semibold text-[var(--todoist-gray-900)]">{userName}</span> made an update.</p>;
                break;
        }
        return { icon, message };
    };

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {sortedActivities.map((activity, index) => {
                    const { icon, message } = getActivityDetails(activity);
                    const isLast = index === sortedActivities.length - 1;
                    return (
                        <li key={activity.id}>
                            <div className="relative pb-8">
                                {!isLast && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-[var(--todoist-gray-200)]" aria-hidden="true" />}
                                <div className="relative flex items-start space-x-3">
                                    <div>
                                        <div className="relative px-1">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--todoist-gray-100)] border border-[var(--todoist-gray-200)]">
                                                {icon}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 py-1.5">
                                        <div className="text-sm text-[var(--todoist-gray-600)]">
                                            {message}
                                            <span className="whitespace-nowrap text-xs text-[var(--todoist-gray-400)] ml-2">{timeAgo(activity.timestamp)}</span>
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
                    {project.scope.deliverables.map((deliverable) => (
                      <div
                        key={deliverable.id}
                        onClick={() => onSelectDeliverable(deliverable.id)}
                        className="p-4 flex items-center justify-between bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-200 group"
                        role="button" tabIndex={0}
                      >
                        <h5 className="font-semibold text-sm text-white group-hover:text-cyan-400 transition-colors">{deliverable.name}</h5>
                        <CornerDownRight className="h-4 w-4 text-white/40 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    ))}
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

