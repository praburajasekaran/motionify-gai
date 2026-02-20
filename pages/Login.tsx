import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { requestMagicLink, verifyMagicLink } from '../lib/auth';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

  .login-root {
    min-height: 100vh;
    background: #080808;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    position: relative;
    overflow: hidden;
    font-family: 'IBM Plex Mono', monospace;
  }

  .login-glow-tr {
    position: fixed;
    top: -180px;
    right: -180px;
    width: 560px;
    height: 560px;
    background: radial-gradient(circle, rgba(224, 160, 60, 0.11) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .login-glow-bl {
    position: fixed;
    bottom: -200px;
    left: -100px;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(224, 160, 60, 0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .login-grain {
    position: fixed;
    inset: -200%;
    width: 400%;
    height: 400%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
    opacity: 1;
    pointer-events: none;
    z-index: 1;
    animation: grain 9s steps(10) infinite;
  }

  @keyframes grain {
    0%   { transform: translate(0, 0); }
    10%  { transform: translate(-5%, -10%); }
    20%  { transform: translate(-15%, 5%); }
    30%  { transform: translate(7%, -25%); }
    40%  { transform: translate(-5%, 25%); }
    50%  { transform: translate(-15%, 10%); }
    60%  { transform: translate(15%, 0%); }
    70%  { transform: translate(0%, 15%); }
    80%  { transform: translate(3%, 35%); }
    90%  { transform: translate(-10%, 10%); }
    100% { transform: translate(0, 0); }
  }

  .login-container {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 400px;
    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .login-logo-wrap {
    margin-bottom: 52px;
  }

  .login-logo-img {
    height: 28px;
    width: auto;
    filter: brightness(0) invert(1);
    opacity: 0.85;
  }

  .login-eyebrow {
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(224, 160, 60, 0.7);
    margin: 0 0 14px;
  }

  .login-heading {
    font-family: 'Cormorant Garamond', serif;
    font-size: 58px;
    font-weight: 300;
    font-style: italic;
    color: #F0EAD9;
    line-height: 1.05;
    margin: 0 0 10px;
    letter-spacing: -0.02em;
  }

  .login-sub {
    font-size: 11px;
    font-weight: 300;
    color: rgba(240, 234, 217, 0.3);
    letter-spacing: 0.06em;
    margin: 0;
  }

  .login-rule {
    height: 1px;
    background: linear-gradient(90deg, rgba(224, 160, 60, 0.25) 0%, transparent 80%);
    margin: 32px 0;
  }

  .login-label {
    display: block;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(240, 234, 217, 0.4);
    margin-bottom: 8px;
  }

  .login-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 3px;
    padding: 13px 14px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    font-weight: 300;
    color: #F0EAD9;
    outline: none;
    transition: border-color 0.2s ease, background 0.2s ease;
    box-sizing: border-box;
  }

  .login-input::placeholder {
    color: rgba(240, 234, 217, 0.18);
  }

  .login-input:focus {
    border-color: rgba(224, 160, 60, 0.45);
    background: rgba(255, 255, 255, 0.06);
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .login-field {
    display: flex;
    flex-direction: column;
  }

  .login-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 20px;
    margin-top: 4px;
    background: #E0A03C;
    color: #080808;
    border: none;
    border-radius: 3px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
  }

  .login-btn:hover:not(:disabled) {
    background: #ECAC48;
  }

  .login-btn:active:not(:disabled) {
    transform: scale(0.99);
  }

  .login-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .login-btn-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  .login-form-error {
    font-size: 11px;
    color: #F87171;
    margin: 0;
    letter-spacing: 0.02em;
  }

  .login-verify-state {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .login-spinner {
    width: 28px;
    height: 28px;
    color: #E0A03C;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .login-verify-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(240, 234, 217, 0.4);
  }

  .login-error-banner {
    padding: 11px 14px;
    background: rgba(248, 113, 113, 0.07);
    border: 1px solid rgba(248, 113, 113, 0.18);
    border-radius: 3px;
    font-size: 11px;
    color: #FCA5A5;
    line-height: 1.6;
    letter-spacing: 0.02em;
    margin-bottom: 20px;
  }

  .login-success-state {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 18px 16px;
    background: rgba(224, 160, 60, 0.05);
    border: 1px solid rgba(224, 160, 60, 0.18);
    border-radius: 3px;
    animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .login-success-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .login-success-icon {
    width: 18px;
    height: 18px;
    color: #E0A03C;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .login-success-title {
    font-size: 12px;
    font-weight: 500;
    color: #F0EAD9;
    margin: 0 0 4px;
    letter-spacing: 0.04em;
  }

  .login-success-sub {
    font-size: 11px;
    font-weight: 300;
    color: rgba(240, 234, 217, 0.45);
    margin: 0;
    line-height: 1.5;
  }

  .login-success-sub strong {
    color: rgba(240, 234, 217, 0.75);
    font-weight: 400;
  }

  .login-reset-btn {
    background: none;
    border: none;
    padding: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: rgba(224, 160, 60, 0.55);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: rgba(224, 160, 60, 0.3);
    transition: color 0.2s;
    align-self: flex-start;
  }

  .login-reset-btn:hover {
    color: #E0A03C;
  }

  .login-footer {
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(240, 234, 217, 0.15);
    text-align: center;
    margin: 0;
  }
`;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuthContext();

  const [email, setEmail] = useState('');
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
        setVerifyError(result.error?.message || result.message || 'Verification failed. Link may be expired.');
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
      const result = await requestMagicLink({ email });
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

  return (
    <>
      <style>{STYLES}</style>
      <div className="login-root">
        <div className="login-glow-tr" />
        <div className="login-glow-bl" />
        <div className="login-grain" />

        <div className="login-container">
          {isVerifying ? (
            <div className="login-verify-state">
              <Loader2 className="login-spinner" />
              <span className="login-verify-label">Verifying your link</span>
            </div>
          ) : (
            <>
              <div className="login-logo-wrap">
                <img
                  src="/portal/images/motionify-studio-dark-web.png"
                  alt="Motionify Studio"
                  className="login-logo-img"
                />
              </div>

              <p className="login-eyebrow">Studio Portal</p>
              <h1 className="login-heading">Welcome back.</h1>
              <p className="login-sub">Sign in to continue to your workspace</p>

              <div className="login-rule" />

              {verifyError && (
                <div className="login-error-banner">{verifyError}</div>
              )}

              {sendSuccess ? (
                <div className="login-success-state">
                  <div className="login-success-row">
                    <CheckCircle className="login-success-icon" />
                    <div>
                      <p className="login-success-title">Check your inbox</p>
                      <p className="login-success-sub">
                        Magic link sent to <strong>{email}</strong>
                      </p>
                    </div>
                  </div>
                  <button className="login-reset-btn" onClick={() => setSendSuccess(false)}>
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendLink} className="login-form">
                  <div className="login-field">
                    <label htmlFor="email" className="login-label">Email address</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="login-input"
                      required
                    />
                  </div>

                  {sendError && <p className="login-form-error">{sendError}</p>}

                  <button type="submit" className="login-btn" disabled={isSending}>
                    {isSending ? (
                      <>
                        <Loader2 className="login-btn-icon" style={{ animation: 'spin 1s linear infinite' }} />
                        Sending link
                      </>
                    ) : (
                      <>
                        Send magic link
                        <ArrowRight className="login-btn-icon" />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="login-rule" />
              <p className="login-footer">Motionify Studio · Admin Portal</p>
            </>
          )}
        </div>
      </div>
    </>
  );
};
