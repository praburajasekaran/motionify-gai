'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppProvider, AppContext } from '@/lib/portal/AppContext';
import Header from '@/lib/portal/components/Header';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Extract projectId from URL if we're on a project page
    const projectMatch = pathname?.match(/\/portal\/projects\/([^/]+)/);
    const urlProjectId = projectMatch ? projectMatch[1] : null;

    // Get selected project ID from localStorage or URL
    const projectId = urlProjectId || localStorage.getItem('selectedProjectId');
    if (projectId) {
      setSelectedProjectId(projectId);
      if (urlProjectId) {
        localStorage.setItem('selectedProjectId', projectId);
      }
    }
  }, [pathname]);

  return (
    <AppProvider selectedProjectId={selectedProjectId}>
      <PortalLayoutContent>
        {children}
      </PortalLayoutContent>
    </AppProvider>
  );
}

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, project, isLoading, logout } = useContext(AppContext);
  const [isProjectView, setIsProjectView] = React.useState(false);
  const [hasRedirected, setHasRedirected] = React.useState(false);

  useEffect(() => {
    setIsProjectView(pathname?.includes('/projects/') || false);
  }, [pathname]);

  useEffect(() => {
    console.log('[PortalLayout] Auth check:', { isLoading, currentUser: !!currentUser });
    if (!isLoading && !currentUser && !hasRedirected) {
      console.log('[PortalLayout] Redirecting to /login');
      setHasRedirected(true);
      router.replace('/login');
    }
  }, [isLoading, currentUser, router, hasRedirected]);

  const handleLogout = () => {
    localStorage.removeItem('selectedProjectId');
    logout();
  };

  const handleBack = () => {
    router.push('/portal/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--todoist-gray-600)]">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="portal-container min-h-screen bg-[var(--todoist-gray-50)]">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        isProjectView={isProjectView}
        onBack={handleBack}
        projectName={project?.name}
        client={project?.client}
      />
      <main>
        {children}
      </main>
    </div>
  );
}
