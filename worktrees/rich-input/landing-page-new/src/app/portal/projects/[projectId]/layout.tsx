'use client';

import React, { useContext, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Home, ClipboardList, FolderKanban, Users2 } from 'lucide-react';
import { AppContext } from '@/lib/portal/AppContext';
import ClientLogo from '@/lib/portal/components/ui/ClientLogo';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const { project, projects } = useContext(AppContext);
  const projectId = params.projectId as string;

  // Update selected project ID in localStorage when projectId changes
  // The AppProvider will pick up the change via localStorage listener
  useEffect(() => {
    if (projectId) {
      const currentProjectId = localStorage.getItem('selectedProjectId');
      if (currentProjectId !== projectId) {
        localStorage.setItem('selectedProjectId', projectId);
        // Trigger custom event for same-tab updates
        window.dispatchEvent(new CustomEvent('localStorageChange'));
      }
    }
  }, [projectId]);

  // Wait for project to load - check if projectId exists in projects
  const projectExists = projects.some(p => p.id === projectId);
  
  if (!project && projectExists) {
    // Project exists but not selected yet - wait a bit for AppProvider to catch up
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--todoist-gray-600)]">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    // Project doesn't exist in the projects list
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--todoist-gray-600)]">Project not found</div>
      </div>
    );
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, href: `/portal/projects/${projectId}` },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList, href: `/portal/projects/${projectId}/tasks` },
    { id: 'files', label: 'Files', icon: FolderKanban, href: `/portal/projects/${projectId}/files` },
    { id: 'team', label: 'Team', icon: Users2, href: `/portal/projects/${projectId}/team` },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex-shrink-0 bg-[var(--todoist-white)] border-r border-[var(--todoist-gray-200)] flex flex-col transition-all duration-300">
        {/* Logo Section */}
        <div className="px-4 py-6 border-b border-[var(--todoist-gray-200)]">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-32 hidden lg:block">
              <Image
                src="/motionify-studio-dark.png"
                alt="Motionify Studio"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--todoist-gray-500)] hidden lg:block">
            Navigate
          </h2>
        </div>
        <nav className="flex-1 px-3 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center justify-center lg:justify-start px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-[var(--todoist-red-light)] text-[var(--todoist-red)] border-l-4 border-[var(--todoist-red)]'
                    : 'hover:bg-[var(--todoist-gray-50)] text-[var(--todoist-gray-700)]'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0 lg:mr-3" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-[var(--todoist-gray-50)] overflow-y-auto">
        <div className="p-8 sm:p-12 space-y-8">
          {/* Project header */}
          <div className="flex items-center gap-6">
            <ClientLogo
              client={project.client}
              className="h-12 w-12 rounded-lg border border-[var(--todoist-gray-200)]"
            />
            <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--todoist-gray-900)]">
              {project.name}
            </h1>
          </div>

          {/* Page content */}
          {children}
        </div>
      </main>
    </div>
  );
}
