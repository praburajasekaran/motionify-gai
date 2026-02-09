'use client';

import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, Deliverable, TaskStatus, Client, User, UserRole } from '@/lib/portal/types';
import Card from './ui/Card';
import Button from './ui/Button';
import CreateProjectModal from './CreateProjectModal';
import ProgressBar from './ui/ProgressBar';
import ClientLogo from './ui/ClientLogo';

interface ProjectManagerDashboardProps {
  projects: Project[];
  currentUser: User;
  onSelectProject: (id: string) => void;
  onUpdateProjectStatus: (id: string, status: ProjectStatus) => void;
  onAddProject: (data: { name: string; client: Client; scope: { deliverables: Deliverable[]; nonInclusions: string[] }; totalRevisions: number }) => void;
}

interface ProjectCardProps {
  project: Project;
  currentUser: User;
  onSelectProject: (id: string) => void;
  onUpdateProjectStatus: (id: string, status: ProjectStatus) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, currentUser, onSelectProject, onUpdateProjectStatus }) => {
  
  const statusColors = {
    [ProjectStatus.IN_PROGRESS]: 'border-l-4 border-blue-500',
    [ProjectStatus.COMPLETED]: 'border-l-4 border-green-500',
    [ProjectStatus.ARCHIVED]: 'border-l-4 border-gray-500',
  };

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden ${statusColors[project.status]}`}>
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-4 flex-grow min-w-0">
          <ClientLogo client={project.client} className="h-10 w-10 flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer truncate" onClick={() => onSelectProject(project.id)} title={project.name}>
                {project.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{project.client.name}</p>
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0 ml-4">
          {currentUser.role === UserRole.SUPPORT && (
            <>
              {project.status === ProjectStatus.IN_PROGRESS && (
                <Button onClick={() => onUpdateProjectStatus(project.id, ProjectStatus.COMPLETED)} variant="secondary">Mark Completed</Button>
              )}
              {project.status === ProjectStatus.COMPLETED && (
                <Button onClick={() => onUpdateProjectStatus(project.id, ProjectStatus.ARCHIVED)} variant="secondary">Archive</Button>
              )}
            </>
          )}
          <Button onClick={() => onSelectProject(project.id)}>View</Button>
        </div>
      </div>
      {project.status === ProjectStatus.IN_PROGRESS && (
         <div className="px-4 pb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{Math.round(progress)}%</span>
            </div>
            <ProgressBar progress={progress} />
        </div>
      )}
    </div>
  );
};


const ProjectManagerDashboard: React.FC<ProjectManagerDashboardProps> = ({ projects, currentUser, onSelectProject, onUpdateProjectStatus, onAddProject }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { inProgress, completed, archived } = useMemo(() => {
    const initialGroups: {
      inProgress: Project[];
      completed: Project[];
      archived: Project[];
    } = {
      inProgress: [],
      completed: [],
      archived: [],
    };

    if (!projects || !Array.isArray(projects)) {
      return initialGroups;
    }

    return projects.reduce((acc, project) => {
      if (project.status === ProjectStatus.IN_PROGRESS) {
        acc.inProgress.push(project);
      } else if (project.status === ProjectStatus.COMPLETED) {
        acc.completed.push(project);
      } else if (project.status === ProjectStatus.ARCHIVED) {
        acc.archived.push(project);
      }
      return acc;
    }, initialGroups);
  }, [projects]);

  const title = currentUser.role === UserRole.SUPPORT ? "All Projects" : "My Assigned Projects";

  const renderProjectList = (projectList: Project[], title: string) => (
    <div id={`status-${title.toLowerCase().replace(' ','-')}`}>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{title}</h2>
      <div className="space-y-4">
        {projectList.length > 0 ? (
          projectList.map(project => (
            <ProjectCard 
              key={project.id}
              project={project}
              currentUser={currentUser}
              onSelectProject={onSelectProject}
              onUpdateProjectStatus={onUpdateProjectStatus}
            />
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No projects in this category.</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          {currentUser.role === UserRole.SUPPORT && (
            <Button onClick={() => setIsCreateModalOpen(true)}>Create New Project</Button>
          )}
        </div>
        
        <div className="space-y-12">
          {renderProjectList(inProgress, 'In Progress')}
          {renderProjectList(completed, 'Completed')}
          {renderProjectList(archived, 'Archived')}
        </div>
      </div>
      <CreateProjectModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddProject={onAddProject}
      />
    </>
  );
};

export default ProjectManagerDashboard;

