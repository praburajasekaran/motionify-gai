'use client';

import React, { useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/lib/portal/AppContext';
import ProjectManagerDashboard from '@/lib/portal/components/ProjectManagerDashboard';
import { UserRole } from '@/lib/portal/types';

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, projects, updateProjectStatus, addProject } = useContext(AppContext);

  const handleProjectSelect = (projectId: string) => {
    localStorage.setItem('selectedProjectId', projectId);
    router.push(`/portal/projects/${projectId}`);
  };

  // Filter projects based on user role
  const projectsForUser = useMemo(() => {
    if (!currentUser || !projects) return [];

    if (currentUser.role === UserRole.SUPPORT) {
      return projects;
    } else if (currentUser.role === UserRole.MOTIONIFY_MEMBER) {
      return projects.filter(p => p.motionifyTeam.some(u => u.id === currentUser.id));
    }
    // For clients, return empty array - they should be redirected to their project
    return [];
  }, [currentUser, projects]);

  if (!currentUser || !projects) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectManagerDashboard
        projects={projectsForUser}
        currentUser={currentUser}
        onSelectProject={handleProjectSelect}
        onUpdateProjectStatus={updateProjectStatus}
        onAddProject={addProject}
      />
    </div>
  );
}
