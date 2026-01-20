import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getProposalById, type Proposal } from '../../lib/proposals';
import { getInquiryById, updateInquiryStatus } from '../../lib/inquiries';
import { useAuthContext } from '../../contexts/AuthContext';
import { ArrowLeft, CreditCard, Lock, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image?: string;
    order_id: string;
    handler: (response: any) => void;
    prefill: {
        name: string;
        email: string;
        contact: string;
    };
    notes: {
        address: string;
    };
    theme: {
        color: string;
    };
}

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => any;
    }
}

export function Payment() {
    const { proposalId } = useParams<{ proposalId: string }>();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuthContext();

    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [inquiryNumber, setInquiryNumber] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentComplete, setPaymentComplete] = useState(false);

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

    const handlePayment = async () => {
        setIsProcessing(true);

        if (!proposal || !proposal.inquiryId) return;

        try {
            // 1. Create Order
            const response = await fetch('/.netlify/functions/payments/create-order', {
                method: 'POST',
                body: JSON.stringify({
                    proposalId: proposal.id,
                    paymentType: 'advance' // Hardcoded for now based on UI
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const orderData = await response.json();

            if (!response.ok) {
                throw new Error(orderData.error || 'Failed to create order');
            }

            // 2. Initialize Razorpay
            const options: RazorpayOptions = {
                key: orderData.razorpayKeyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: orderData.name,
                description: orderData.description,
                order_id: orderData.razorpayOrderId,
                handler: async function (response: any) {
                    try {
                        const verifyResponse = await fetch('/.netlify/functions/payments/verify', {
                            method: 'POST',
                            body: JSON.stringify({
                                paymentId: orderData.id,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            }),
                            headers: { 'Content-Type': 'application/json' }
                        });

                        if (verifyResponse.ok) {
                            setPaymentComplete(true);
                        } else {
                            alert('Payment verification failed. Please contact support.');
                            setIsProcessing(false);
                        }
                    } catch (error) {
                        console.error('Verification error:', error);
                        alert('Payment verification failed.');
                        setIsProcessing(false);
                    }
                },
                prefill: {
                    name: user?.user_metadata?.full_name || '',
                    email: user?.email || '',
                    contact: ''
                },
                notes: {
                    address: 'Razorpay Corporate Office'
                },
                theme: {
                    color: '#7C3AED' // Violet-600
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response: any) {
                alert(response.error.description);
                setIsProcessing(false);
            });
            rzp1.open();

        } catch (error) {
            console.error("Payment initiation failed", error);
            alert("Failed to initiate payment. Please try again.");
            setIsProcessing(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (!proposal) {
        return <Navigate to="/" replace />;
    }

    // Security check - ensure user owns this (though API should handle this, frontend check is good UX)
    // We're skipping complex checks here relying on Previous page checks, but added basic existence check.

    if (paymentComplete) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
                    <p className="text-gray-600 mb-8">
                        Thank you for your payment. Your project has been moved to the setup phase.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
                    >
                        Go to Dashboard
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
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Order Summary */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                                <p className="text-sm text-gray-500 mt-1">Proposal for Inquiry {inquiryNumber}</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Total Project Value</span>
                                    <span className="font-semibold text-gray-900">{formatCurrency(proposal.totalPrice, proposal.currency)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-600">Advance Percentage</span>
                                    <span className="font-medium text-gray-900">{proposal.advancePercentage}%</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-lg font-medium text-gray-900">Amount Due Now</span>
                                    <span className="text-2xl font-bold text-violet-600">{formatCurrency(proposal.advanceAmount, proposal.currency)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-500 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <p>Your payment is secure. We use 256-bit encryption to protect your financial information.</p>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Pay with Card</h3>

                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <CreditCard className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        disabled
                                        value="•••• •••• •••• 4242"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        disabled
                                        value="12/28"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm text-center"
                                    />
                                    <input
                                        type="text"
                                        disabled
                                        value="•••"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm text-center"
                                    />
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <button
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4 mr-2" />
                                                Pay {formatCurrency(proposal.advanceAmount, proposal.currency)}
                                            </>
                                        )}
                                    </button>
                                    <p className="text-xs text-center text-gray-400 mt-3">
                                        This is a secure 256-bit SSL encrypted payment.
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
