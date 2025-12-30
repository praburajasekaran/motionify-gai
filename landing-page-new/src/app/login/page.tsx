"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false); // Local loading state for login action

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email);
      setIsSubmitted(true);
      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-blue-50 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Inbox!</CardTitle>
            <CardDescription className="text-base">
              We've sent a magic link to <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium flex items-center gap-2 text-blue-900">
                <CheckCircle2 className="h-4 w-4" />
                What to do next:
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-1 text-blue-800">
                <li>Check your email (and spam folder)</li>
                <li>Click the "Log In to Motionify Portal" button</li>
                <li>You'll be automatically logged in</li>
              </ol>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Link expires in 15 minutes.</p>
            </div>

            {/* Development Helper - Removed invalid placeholder token */}
            {/* To test: Request a real magic link and use the token from your email */}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t bg-muted/50 p-6">
            <div className="text-center w-full">
              <p className="text-sm text-muted-foreground mb-2">Email taking too long?</p>
              <Button
                variant="ghost"
                className="text-primary"
                disabled={countdown > 0}
                onClick={() => { setIsSubmitted(false); setCountdown(300); }}
              >
                {countdown > 0 ? `Resend available in ${formatTime(countdown)}` : 'Resend Magic Link'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="relative h-10 w-40 mx-auto mb-4">
            <Image
              src="/motionify-light-logo.png"
              alt="Motionify Studio"
              fill
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            Log in with your email - no password needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error ? "border-destructive focus-visible:ring-destructive" : ""}
                disabled={isSubmitting}
                required
                autoComplete="email"
              />
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isSubmitting}
              />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Remember me for 30 days
              </Label>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Magic Link...
                </>
              ) : (
                'Send Magic Link'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground border-t pt-6">
          <p className="w-full">
            We'll send a secure login link to your email.<br />
            The link expires in 15 minutes.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
