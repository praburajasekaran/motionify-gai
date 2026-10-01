import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getProposalById, type Proposal } from '../../lib/proposals';
import { getInquiryById } from '../../lib/inquiries';
import { useAuthContext } from '../../contexts/AuthContext';
import { ArrowLeft, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';

import { usePaymentCheckout } from '../../hooks/usePaymentCheckout';

export function Payment() {
    const { proposalId } = useParams<{ proposalId: string }>();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuthContext();

    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [inquiryNumber, setInquiryNumber] = useState<string>('');
    const [inquiryEmail, setInquiryEmail] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const checkout = usePaymentCheckout({ proposalId: proposalId || '' }, { name: user?.name || '', email: user?.email || '', contact: '' });
    const isProcessing = checkout.processing;
    const paymentComplete = checkout.state.status === 'complete';
    const activatedProjectId = checkout.state.status === 'complete' ? checkout.state.projectId : null;
    const clientEmail = checkout.state.status === 'complete' ? checkout.state.clientEmail || inquiryEmail : inquiryEmail;

    useEffect(() => {
        async function fetchData() {
            if (!proposalId) return;

            try {
                const fetchedProposal = await getProposalById(proposalId);
                setProposal(fetchedProposal);

                if (fetchedProposal?.inquiryId) {
                    const fetchedInquiry = await getInquiryById(fetchedProposal.inquiryId);
                    if (fetchedInquiry) {
                        setInquiryNumber(fetchedInquiry.inquiryNumber);
                        setInquiryEmail(fetchedInquiry.contactEmail);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [proposalId]);

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-muted">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (!proposal) {
        return <Navigate to="/" replace />;
    }

    if (paymentComplete) {
        return (
            <div className="min-h-screen bg-muted flex items-center justify-center p-4">
                <div className="bg-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h1>
                    <p className="text-muted-foreground mb-8">
                        Thank you for your payment. Your project is ready to open.
                    </p>
                    <button
                        onClick={() => {
                            if (activatedProjectId) {
                                const params = new URLSearchParams({
                                    projectId: activatedProjectId,
                                    ...(clientEmail ? { email: clientEmail } : {}),
                                });
                                navigate(`/project-access?${params.toString()}`);
                            } else {
                                navigate('/');
                            }
                        }}
                        className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
                    >
                        Open Project
                    </button>
                </div>
            </div>
        );
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount / 100);
    };

    return (
        <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Order Summary */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                            <div className="p-6 border-b border-border">
                                <h2 className="text-xl font-bold text-foreground">Payment Details</h2>
                                <p className="text-sm text-muted-foreground mt-1">Proposal for Inquiry {inquiryNumber}</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-border">
                                    <span className="text-muted-foreground">Total Project Value</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(proposal.totalPrice, proposal.currency)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border">
                                    <span className="text-muted-foreground">Advance Percentage</span>
                                    <span className="font-medium text-foreground">{proposal.advancePercentage}%</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-lg font-medium text-foreground">Amount Due Now</span>
                                    <span className="text-2xl font-bold text-violet-600">{formatCurrency(proposal.advanceAmount, proposal.currency)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <p>Your payment is secure. We use Razorpay checkout to protect your financial information.</p>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="md:col-span-1">
                        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sticky top-6">
                            <h3 className="font-semibold text-foreground mb-4">Pay Securely</h3>

                            <div className="space-y-4">
                                <div>
                                    <button
                                        onClick={checkout.start}
                                        disabled={isProcessing}
                                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                {checkout.progress}
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4 mr-2" />
                                                {checkout.state.status === 'unconfirmed' ? 'Retry payment confirmation' : `Pay ${formatCurrency(proposal.advanceAmount, proposal.currency)}`}
                                            </>
                                        )}
                                    </button>
                                    {checkout.error && <p role="alert" className="mt-3 text-sm text-destructive">{checkout.error}</p>}
                                    <p className="text-xs text-center text-muted-foreground mt-3">
                                        Razorpay secure checkout
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
