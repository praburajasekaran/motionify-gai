"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as authApi from '@/lib/portal/api/auth.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function VerifyPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { verifyToken, isAuthenticated, isLoading } = useAuth();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [isVerified, setIsVerified] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [inquiryCreated, setInquiryCreated] = useState(false);

    useEffect(() => {
        const tokenFromParams = searchParams.get('token');
        const emailFromParams = searchParams.get('email');

        let finalToken = tokenFromParams;
        let finalEmail = emailFromParams;

        if (typeof window !== 'undefined' && (!finalToken || !finalEmail)) {
            const urlParams = new URLSearchParams(window.location.search);
            finalToken = finalToken || urlParams.get('token');
            finalEmail = finalEmail || urlParams.get('email');
        }

        console.log('[VerifyPage] URL params extraction:', {
            searchParamsToken: tokenFromParams ? tokenFromParams.substring(0, 10) + '...' : null,
            searchParamsEmail: emailFromParams,
            finalToken: finalToken ? finalToken.substring(0, 10) + '...' : null,
            finalEmail: finalEmail,
            fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
        });

        setToken(finalToken);
        setEmail(finalEmail);

        if (!finalToken) {
            console.error('[VerifyPage] Missing required token:', {
                hasToken: !!finalToken,
                hasEmail: !!finalEmail,
                url: typeof window !== 'undefined' ? window.location.href : 'N/A'
            });
            setErrorCode('MISSING_PARAMS');
            setErrorMessage('The magic link is missing the authentication token. Please request a new link.');
            setStatus('error');
            return;
        }

        const verify = async () => {
            try {
                console.log('[VerifyPage] Calling API for verification', {
                    token: finalToken.substring(0, 10) + '...',
                    email: finalEmail || '(will be looked up from token)'
                });

                const result = await verifyToken(finalToken, finalEmail || '');

                if (result.success) {
                    console.log('[VerifyPage] Verification successful', result.data);
                    setIsVerified(true);

                    if (result.data?.inquiryCreated && result.data?.inquiryNumber) {
                        setInquiryCreated(true);
                        setStatus('success');
                        // Redirect to InquiryTracking page in React portal
                        const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003';
                        const inquiryTrackingUrl = `${portalUrl}/#/inquiry-status/${result.data.inquiryNumber}`;
                        console.log('[VerifyPage] Redirecting to InquiryTracking:', inquiryTrackingUrl);
                        // Delay redirect slightly to show success message
                        setTimeout(() => {
                            window.location.href = inquiryTrackingUrl;
                        }, 3000);
                    } else {
                        router.push('/portal');
                    }
                } else {
                    const response = await authApi.verifyMagicLinkWithEmail(finalToken, finalEmail || undefined);
                    const error = 'error' in response ? response.error : null;

                    const errorCode = error?.code || 'UNKNOWN_ERROR';
                    const errorMessage = error?.message || 'Verification failed';

                    console.log('[VerifyPage] Setting error state:', { errorCode, errorMessage });
                    setErrorCode(errorCode);
                    setErrorMessage(errorMessage);
                    setStatus('error');
                }
            } catch (error: any) {
                console.error('[VerifyPage] Verification error:', error);
                setErrorCode('NETWORK_ERROR');
                setErrorMessage(error.message || 'An error occurred while verifying your link');
                setStatus('error');
            }
        };

        verify();
    }, [searchParams, verifyToken, router]);

    // Regular auth redirect (if not showing inquiry success message)
    useEffect(() => {
        if (isVerified && isAuthenticated && !isLoading && !inquiryCreated) {
            console.log('[VerifyPage] All conditions met, redirecting to /portal');
            router.push('/portal');
        }
    }, [isVerified, isAuthenticated, isLoading, inquiryCreated, router]);

    if (status === 'success' && inquiryCreated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md shadow-lg border-emerald-500/20">
                    <CardHeader className="text-center space-y-4 pt-12 pb-8">
                        <div className="mx-auto bg-emerald-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-bold text-gray-900">Inquiry Verified!</CardTitle>
                            <p className="text-gray-600">Your account has been created successfully.</p>
                        </div>
                    </CardHeader>
                    <CardContent className="text-center pb-12">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Redirecting to your portal...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md shadow-lg border-destructive/50">
                    <CardHeader className="text-center space-y-2">
                        <div className="mx-auto bg-destructive/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                            <XCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {errorCode === 'TOKEN_EXPIRED' ? 'Link Expired' :
                                errorCode === 'TOKEN_ALREADY_USED' ? 'Link Already Used' :
                                    errorCode === 'TOKEN_NOT_FOUND' ? 'Invalid Link' :
                                        errorCode === 'SERVICE_UNAVAILABLE' ? 'Service Unavailable' :
                                            errorCode === 'SERVER_ERROR' ? 'Server Error' :
                                                'Link Invalid or Expired'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-left">
                            {errorMessage ? (
                                <>
                                    <p className="font-medium text-destructive mb-2">{errorMessage}</p>
                                    {errorCode === 'MISSING_PARAMS' && typeof window !== 'undefined' && (
                                        <details className="mt-2 text-xs text-muted-foreground">
                                            <summary className="cursor-pointer hover:text-foreground">Debug info</summary>
                                            <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
                                                URL: {window.location.href}
                                                {'\n'}Search: {window.location.search}
                                                {'\n'}Has Token: {token ? 'Yes' : 'No'}
                                                {'\n'}Has Email: {email ? 'Yes' : 'No (optional)'}
                                            </pre>
                                        </details>
                                    )}
                                </>
                            ) : errorCode === 'TOKEN_EXPIRED' ? (
                                <p className="font-medium text-destructive">This magic link has expired (valid for 15 minutes). Please request a new one.</p>
                            ) : errorCode === 'TOKEN_ALREADY_USED' ? (
                                <p className="font-medium text-destructive">This magic link has already been used. Please request a new one.</p>
                            ) : errorCode === 'TOKEN_NOT_FOUND' ? (
                                <p className="font-medium text-destructive">This magic link is invalid. Please request a new one.</p>
                            ) : (
                                <>
                                    <p className="font-medium mb-2 text-destructive">This magic link is no longer valid. This could be because:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-1 text-destructive/80">
                                        <li>The link has already been used</li>
                                        <li>The link expired (valid for 15 minutes)</li>
                                        <li>The link was invalid or incomplete</li>
                                    </ul>
                                </>
                            )}
                        </div>

                        <Link href="/login">
                            <Button className="w-full">
                                Request a New Magic Link
                            </Button>
                        </Link>

                        <p className="text-sm text-muted-foreground">
                            Need help? Contact <a href="mailto:hello@motionify.studio" className="text-primary hover:underline">hello@motionify.studio</a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-6 pt-12 pb-8">
                    <div className="mx-auto relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-background p-4 rounded-full shadow-sm border border-primary/20">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-xl font-bold">Verifying your magic link...</CardTitle>
                        <p className="text-muted-foreground">Please wait, this will only take a moment.</p>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-6 pt-12 pb-8">
                    <div className="mx-auto relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-background p-4 rounded-full shadow-sm border border-primary/20">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-xl font-bold">Loading...</CardTitle>
                        <p className="text-muted-foreground">Please wait a moment.</p>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <VerifyPageContent />
        </Suspense>
    );
}
