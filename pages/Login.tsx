import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '../components/ui/design-system';
import { MotionifyLogo } from '../components/brand/MotionifyLogo';
import { useAuthContext } from '../contexts/AuthContext';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { requestMagicLink, verifyMagicLink } from '../lib/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuthContext();

  // Login Form States
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState('');

  // Verification States
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Ref to prevent double verification in React Strict Mode
  const verificationAttempted = React.useRef<string | null>(null);

  // Handle Magic Link Verification
  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');

    // Prevent double verification for the same token (React Strict Mode fix)
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
        // Set user in auth context - navigation will happen via the user check effect
        setUser(result.data.user);
      } else {
        // Show specific error message from API if available
        const errorMessage = result.error?.message || result.message || 'Verification failed. Link may be expired.';
        setVerifyError(errorMessage);
      }
    } catch (error) {
      setVerifyError('An unexpected error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
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
    } catch (error) {
      setSendError('An unexpected error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Verifying your login...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/images/motionify-studio-dark-web.png"
              alt="Motionify Studio"
              className="h-12"
            />
          </div>

          {verifyError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 mb-4">
              {verifyError}
            </div>
          )}

          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Login to your account</p>
        </div>

        {/* Magic Link Form */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Login via Email</h2>

          {sendSuccess ? (
            <div className="text-center py-4">
              <div className="bg-green-100 text-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-medium text-green-800">Check your inbox!</h3>
              <p className="text-sm text-green-700 mt-1">We sent a magic link to <strong>{email}</strong></p>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => setSendSuccess(false)}>
                  Use different email
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-300 text-primary focus:ring-primary/20"
                />
                Remember me for 30 days
              </label>

              {sendError && (
                <p className="text-sm text-red-500">{sendError}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  <>
                    Send Login Link
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
