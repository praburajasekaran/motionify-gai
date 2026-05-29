import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { verifyMagicLink } from '../../lib/auth';
import { inquiryStatusPath, portalLoginPath } from '../../lib/canonical-links';

export function InquiryVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const attemptedToken = useRef<string | null>(null);
  const [state, setState] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your inquiry...');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email') || undefined;

    if (!token) {
      setState('error');
      setMessage('This inquiry verification link is missing a token.');
      return;
    }

    if (attemptedToken.current === token) return;
    attemptedToken.current = token;

    async function verify() {
      const result = await verifyMagicLink(token, email);
      if (result.success && result.data?.inquiryNumber) {
        setState('success');
        setMessage('Inquiry verified. Opening your inquiry status...');
        navigate(inquiryStatusPath(result.data.inquiryNumber), { replace: true });
        return;
      }

      setState('error');
      setMessage(result.error?.message || result.message || 'This inquiry verification link is invalid or expired.');
    }

    verify();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center">
        {state === 'verifying' && <Loader2 className="h-9 w-9 animate-spin text-amber-700 mx-auto mb-4" />}
        {state === 'success' && <CheckCircle className="h-9 w-9 text-emerald-600 mx-auto mb-4" />}
        {state === 'error' && <AlertCircle className="h-9 w-9 text-red-600 mx-auto mb-4" />}
        <h1 className="text-2xl font-bold text-gray-950 mb-2">Inquiry Verification</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        {state === 'error' && (
          <Link to={portalLoginPath()} className="inline-flex px-5 py-2.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800">
            Go to Portal Login
          </Link>
        )}
      </div>
    </div>
  );
}
