import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, Label } from '../components/ui/design-system';
import { useAuthContext } from '../contexts/AuthContext';
import { ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { requestMagicLink, verifyMagicLink } from '../lib/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuthContext();

  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const verificationAttempted = React.useRef<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');
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
    if (!email) return;
    setIsSending(true);
    setSendError('');
    setSendSuccess(false);
    try {
      const result = await requestMagicLink({ email, rememberMe });
      if (result.success) {
        setSendSuccess(true);
      } else {
        setSendError(result.message || 'Failed to send login link.');
      }
    } catch {
      setSendError('An unexpected error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying your login link…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in-up">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}images/motionify-studio-dark-web.png`}
            alt="Motionify Studio"
            className="h-8 w-auto"
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>

        {/* Verification error */}
        {verifyError && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200/60 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{verifyError}</span>
          </div>
        )}

        <Card className="p-6">
          {sendSuccess ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200/60 mb-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-1">Check your inbox</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a magic link to <span className="font-medium text-foreground">{email}</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => setSendSuccess(false)}>
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendLink} className="space-y-4">
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
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary/20"
                />
                Remember me for 30 days
              </label>

              {sendError && (
                <p className="text-sm text-destructive" role="alert">{sendError}</p>
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

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Motionify Studio · Admin Portal
        </p>
      </div>
    </div>
  );
};
