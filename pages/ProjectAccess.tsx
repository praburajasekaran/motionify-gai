import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, LogOut } from 'lucide-react';
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
  const [inviteState, setInviteState] = useState<'idle' | 'accepting' | 'accepted' | 'signup_required' | 'error'>('idle');
  const [inviteMessage, setInviteMessage] = useState('');
  const attemptedToken = useRef<string | null>(null);

  const projectId = searchParams.get('projectId');
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  const next = buildNextPath(projectId);
  const userEmail = user?.email?.toLowerCase();
  const accessEmail = email?.toLowerCase();
  const isStaff = user?.role === 'super_admin' || user?.role === 'support';
  const isMatchingClient = Boolean(userEmail && accessEmail && userEmail === accessEmail);

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;
    setInviteState('accepting');
    setInviteMessage('');

    fetch(`/.netlify/functions/invitations-accept/${encodeURIComponent(token)}`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || 'This invitation could not be accepted.');
        }

        const acceptedProjectId = data.project?.id;
        const acceptedEmail = data.email || email;
        const acceptedNext = buildNextPath(acceptedProjectId || projectId);

        if (data.requires_signup) {
          setInviteState('signup_required');
          setInviteMessage(`This invitation is for ${acceptedEmail || 'a new account'}. Ask your Motionify Studio contact to create the account, then reopen this invitation link.`);
          return;
        }

        setInviteState('accepted');
        setInviteMessage('Invitation accepted. Sign in to open the project.');
        navigate(buildLoginPath(acceptedEmail, acceptedNext), { replace: true });
      })
      .catch((error) => {
        setInviteState('error');
        setInviteMessage(error instanceof Error ? error.message : 'This invitation could not be accepted.');
      });
  }, [email, navigate, projectId, token]);

  useEffect(() => {
    if (isLoading) return;
    if (token) return;
    if (!projectId) return;

    if (!user) {
      navigate(buildLoginPath(email, next), { replace: true });
      return;
    }

    if (isStaff || isMatchingClient) {
      navigate(next, { replace: true });
    }
  }, [email, isLoading, isMatchingClient, isStaff, navigate, next, projectId, token, user]);

  if (inviteState === 'accepting' || isLoading || (!token && !user && projectId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">{token ? 'Accepting your invitation...' : 'Opening your project...'}</p>
        </div>
      </div>
    );
  }

  if (token && (inviteState === 'signup_required' || inviteState === 'error')) {
    const isSignupRequired = inviteState === 'signup_required';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          {isSignupRequired ? (
            <CheckCircle className="mx-auto h-9 w-9 text-amber-600 mb-4" />
          ) : (
            <AlertCircle className="mx-auto h-9 w-9 text-red-600 mb-4" />
          )}
          <h1 className="text-lg font-semibold text-foreground mb-2">
            {isSignupRequired ? 'Account setup required' : 'Invitation unavailable'}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">{inviteMessage}</p>
          <Button variant="outline" onClick={() => navigate('/login', { replace: true })}>
            Go to login
          </Button>
        </Card>
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
            Your payment was received, but the project link is not ready yet. The Motionify Studio team has been notified.
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
