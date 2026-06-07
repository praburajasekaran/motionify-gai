import React from 'react';
import { CheckCircle, Clock, FolderKanban, LayoutGrid } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { isMotionifyAdmin } from '../../lib/permissions';
import { useProjects } from '../../shared/hooks/useProjects';
import { PageHeader } from '../ui/PageHeader';

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className: string }>;
  color: 'blue' | 'amber' | 'green' | 'purple';
}

function SummaryCard({ label, value, icon: Icon, color }: SummaryCardProps) {
  const bgColors = {
    blue: 'bg-blue-500/10',
    amber: 'bg-amber-500/10',
    green: 'bg-green-500/10',
    purple: 'bg-purple-500/10',
  };
  const iconColors = {
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
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

interface ProjectSectionHeaderProps {
  actions?: React.ReactNode;
}

export function ProjectSectionHeader({ actions }: ProjectSectionHeaderProps) {
  const { user } = useAuthContext();
  const projectListUserId = user ? (isMotionifyAdmin(user) ? null : user.id) : undefined;
  const projectsQuery = useProjects(projectListUserId);
  const projects = projectsQuery.data ?? [];

  const visibleProjects = projects.filter(project => project.status !== 'Archived');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${visibleProjects.length} project${visibleProjects.length !== 1 ? 's' : ''}`}
        actions={actions}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Projects" value={visibleProjects.length} icon={LayoutGrid} color="blue" />
        <SummaryCard label="Active" value={visibleProjects.filter(project => project.status === 'Active').length} icon={FolderKanban} color="green" />
        <SummaryCard label="In Review" value={visibleProjects.filter(project => project.status === 'In Review').length} icon={Clock} color="amber" />
        <SummaryCard label="Completed" value={visibleProjects.filter(project => project.status === 'Completed').length} icon={CheckCircle} color="purple" />
      </div>
    </div>
  );
}
