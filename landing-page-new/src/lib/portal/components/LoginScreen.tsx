'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from './ui/Card';
import Button from './ui/Button';

const MagicLinkSent = ({ email, onRequestNew }: { email: string; onRequestNew: () => void }) => {
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  // Start countdown
  useState(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      <div className="max-w-md w-full relative">
        <div className="mb-8 flex justify-center">
          <div className="relative h-12 w-48">
            <Image
              src="/images/motionify-light-logo.png"
              alt="Motionify Studio"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <Card>
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Inbox!</h2>
            <p className="text-gray-500">
              If an account exists with this email, a magic link has been sent to your inbox.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">ℹ️  What to do next:</p>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the "Log In to Motionify Portal" button</li>
              <li>You'll be automatically logged in</li>
            </ol>
            <p className="text-sm text-gray-500 mt-4">
              ⏱️  The magic link expires in 15 minutes.
            </p>
          </div>

          <div className="text-center text-sm text-gray-600 mb-4">
            <p className="mb-2">Email taking too long? Check spam or</p>
            <Button
              onClick={onRequestNew}
              disabled={countdown > 0}
              variant="secondary"
              className="w-full"
            >
              {countdown > 0 ? `Request a New Link (Available in ${formatTime(countdown)})` : 'Request a New Link'}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
            <p>Didn't receive an email?</p>
            <a href="mailto:hello@motionify.studio" className="text-cyan-600 hover:text-cyan-500">
              Contact support: hello@motionify.studio
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await login(trimmedEmail, rememberMe);
      setShowSuccess(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleRequestNew = () => {
    setShowSuccess(false);
    setEmail('');
  };

  if (showSuccess) {
    return <MagicLinkSent email={email} onRequestNew={handleRequestNew} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      <div className="max-w-md w-full relative">
        <div className="mb-8 flex justify-center">
          <div className="relative h-12 w-48">
            <Image
              src="/images/motionify-light-logo.png"
              alt="Motionify Studio"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <Card>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Welcome to Motionify PM Portal</h2>
            <p className="text-gray-500 mt-2">Log in with your email - no password needed</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="block w-full px-4 py-3 text-base bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 rounded-lg text-gray-900 placeholder-gray-400"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-cyan-500 focus:ring-cyan-500 border-gray-300 rounded bg-gray-50"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                  Remember me for 30 days
                </label>
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Magic Link to Email'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>We'll send a secure login link to your email address.</p>
            <p className="mt-1">The link expires in 15 minutes.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
