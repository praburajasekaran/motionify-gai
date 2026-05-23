import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, LogOut } from 'lucide-react';
import { Button, Card } from '../components/ui/design-system';
import { useAuthContext } from '../contexts/AuthContext';

function buildNextPath(projectId: string | null): string {
  return projectId ? `/projects/${projectId}` : '/projects';
}

function buildLoginPath(email: string | null, next: string): string {
  const params = new URLSearchParams({ next });
  if (email) params.set('email', email);
  return `/login?${params.toString()}`;
}

export function ProjectAccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading, logout } = useAuthContext();

  const projectId = searchParams.get('projectId');
  const email = searchParams.get('email');
  const next = buildNextPath(projectId);
  const userEmail = user?.email?.toLowerCase();
  const accessEmail = email?.toLowerCase();
  const isStaff = user?.role === 'super_admin' || user?.role === 'support';
  const isMatchingClient = Boolean(userEmail && accessEmail && userEmail === accessEmail);

  useEffect(() => {
    if (isLoading) return;
    if (!projectId) return;

    if (!user) {
      navigate(buildLoginPath(email, next), { replace: true });
      return;
    }

    if (isStaff || isMatchingClient) {
      navigate(next, { replace: true });
    }
  }, [email, isLoading, isMatchingClient, isStaff, navigate, next, projectId, user]);

  if (isLoading || (!user && projectId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Opening your project...</p>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <AlertCircle className="mx-auto h-9 w-9 text-amber-600 mb-4" />
          <h1 className="text-lg font-semibold text-foreground mb-2">We're setting up your project</h1>
          <p className="text-sm text-muted-foreground">
            Your payment was received, but the project link is not ready yet. The Motionify team has been notified.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h1 className="text-base font-semibold text-foreground mb-1">Use the right account</h1>
            <p className="text-sm text-muted-foreground mb-4">
              This project access link is for {email || 'another client account'}. Sign out and request a login link for that email to continue.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={logout} className="w-full sm:w-auto">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(buildLoginPath(email, next), { replace: true })}
                className="w-full sm:w-auto"
              >
                Request login link
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
