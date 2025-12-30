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

  useEffect(() => {
    // Determine if we're in a project view based on the pathname
    setIsProjectView(pathname?.includes('/projects/') || false);
  }, [pathname]);

  useEffect(() => {
    console.log('[PortalLayout] Auth check:', { isLoading, currentUser: !!currentUser });
    if (!isLoading && !currentUser) {
      console.log('[PortalLayout] Redirecting to /login');
      router.push('/login');
    }
  }, [isLoading, currentUser, router]);

  const handleLogout = () => {
    // Clear portal specific state
    localStorage.removeItem('selectedProjectId');
    // Call auth logout
    logout();
    // Redirect is handled by the effect above when currentUser becomes null
    // or by the logout function itself if it redirects
  };

  const handleBack = () => {
    router.push('/portal/dashboard');
  };

  // Show loading while waiting for user to load
  // OPTIMIZATION: Only show loading if actively loading, not if user is simply not logged in
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--todoist-gray-600)]">Loading...</div>
      </div>
    );
  }

  // If not loading and no user, the useEffect above will redirect to login
  // Show a brief loading state during redirect
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--todoist-gray-600)]">Redirecting...</div>
      </div>
    );
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
