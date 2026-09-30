import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, Label } from '../components/ui/design-system';
import { useAuthContext } from '../contexts/AuthContext';
import { ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { requestMagicLink, verifyMagicLink } from '../lib/auth';
import { useTheme } from 'next-themes';

type LoginRequestState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; email: string }
  | { status: 'failed'; message: string };

function getSafeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }
  return next;
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuthContext();
  const { resolvedTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [requestState, setRequestState] = useState<LoginRequestState>({ status: 'idle' });
  const isSending = requestState.status === 'sending';
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (user) navigate(getSafeNextPath(searchParams.get('next')), { replace: true });
  }, [user, navigate, searchParams]);

  const verificationAttempted = React.useRef<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');
    if (emailParam && !token) {
      setEmail(emailParam);
    }
    if (token && verificationAttempted.current !== token) {
      verificationAttempted.current = token;
      handleVerification(token, emailParam || undefined);
    }
  }, [searchParams]);

  const handleVerification = async (token: string, email?: string) => {
    setIsVerifying(true);
    setVerifyError('');
    try {
      const result = await verifyMagicLink(token, email);
      if (result.success && result.data) {
        setUser(result.data.user);
        navigate(getSafeNextPath(searchParams.get('next')), { replace: true });
      } else {
        setVerifyError(result.error?.message || result.message || 'Verification failed. The link may have expired.');
      }
    } catch {
      setVerifyError('An unexpected error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submittedEmail = email.trim();
    if (!submittedEmail || isSending) return;
    setRequestState({ status: 'sending' });
    try {
      const next = getSafeNextPath(searchParams.get('next'));
      const result = await requestMagicLink({
        email: submittedEmail,
        rememberMe,
        ...(next !== '/' ? { next } : {}),
      });
      if (result.success) {
        setRequestState({ status: 'sent', email: submittedEmail });
      } else {
        setRequestState({ status: 'failed', message: result.message || 'Failed to send login link. Please try again.' });
      }
    } catch {
      setRequestState({ status: 'failed', message: 'We could not send your login link. Please try again.' });
    }
  };

  if (isVerifying) {
    return (
      <main className="portal-shell min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center" role="status">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying your login link…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="portal-shell min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}${resolvedTheme === 'dark' ? 'motionify-dark-logo.png' : 'motionify-studio-dark.png'}`}
            alt="Motionify Studio"
            className="h-10 w-auto"
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>

        {/* Verification error */}
        {verifyError && (
          <div role="alert" className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{verifyError}</span>
          </div>
        )}

        <Card className="p-6">
          {requestState.status === 'sent' ? (
            <div className="text-center py-2" role="status">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200/60 mb-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Check your inbox</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a sign-in link to <span className="font-medium text-foreground break-words">{requestState.email}</span>.
              </p>
              <Button variant="outline" size="sm" onClick={() => setRequestState({ status: 'idle' })}>
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendLink} className="space-y-4" aria-busy={isSending}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoFocus
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isSending}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isSending}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary/20"
                />
                Remember me for 30 days
              </label>

              {requestState.status === 'failed' && (
                <p className="text-sm text-destructive" role="alert">{requestState.message}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link…
                  </>
                ) : (
                  <>
                    Send magic link
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Motionify Studio · Client and team workspace
        </p>
      </div>
    </main>
  );
};
