'use client';

import { useEffect, useRef, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/portal/types';
import { AppContext } from '@/lib/portal/AppContext';

export default function PortalPage() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const { currentUser, isLoading } = useContext(AppContext);

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // Only redirect once to prevent loops
    if (hasRedirectedRef.current) return;

    console.log('[PortalPage] Checking user for redirect:', { currentUser: !!currentUser, isLoading });

    if (!currentUser) {
      console.log('[PortalPage] No user found, redirecting to login');
      hasRedirectedRef.current = true;
      router.push('/login');
      return;
    }

    hasRedirectedRef.current = true;

    // If user has a selected project, go there
    const projectId = localStorage.getItem('selectedProjectId');
    if (projectId) {
      console.log('[PortalPage] Redirecting to project:', projectId);
      router.push(`/portal/projects/${projectId}`);
      return;
    }

    // Otherwise, show dashboard (for project managers)
    console.log('[PortalPage] Redirecting to dashboard for role:', currentUser.role);
    if (currentUser.role === UserRole.SUPPORT || currentUser.role === UserRole.SUPER_ADMIN) {
      router.push('/portal/dashboard');
    } else {
      // Client users should have a project - try to find their project
      // Don't redirect to login as that creates a loop - let them see the portal
      // The AppProvider will auto-select their project if available
      router.push('/portal/dashboard');
    }
  }, [router, currentUser, isLoading]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-[var(--todoist-gray-600)]">Loading...</div>
    </div>
  );
}
