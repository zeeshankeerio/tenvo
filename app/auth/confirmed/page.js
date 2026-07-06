'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, PartyPopper } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { businessAPI } from '@/lib/api/business';

export default function AuthConfirmedPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [status, setStatus] = useState('verifying');

    useEffect(() => {
        const checkStatus = async () => {
            if (!user) {
                // Wait a bit for auth context to sync
                return;
            }

            setStatus('success');

            // Try to find business and redirect
            try {
                const businesses = await businessAPI.getByUserId(user.id);
                setTimeout(() => {
                    if (businesses && businesses.length > 0) {
                        const biz = businesses[0];
                        
                        // CRITICAL: Check approval status before redirecting to dashboard
                        const approvalStatus = biz.approval_status;
                        const needsApproval = 
                            approvalStatus === 'pending_approval' || 
                            approvalStatus === 'info_requested' ||
                            approvalStatus === 'rejected';
                        
                        if (needsApproval) {
                            router.push('/pending-approval');
                        } else if (biz.approval_status === 'approved' || biz.approval_status === 'auto_approved') {
                            router.push(`/business/${biz.domain}`);
                        } else {
                            // No approval status set (legacy data) - allow access
                            router.push(`/business/${biz.domain}`);
                        }
                    } else {
                        router.push('/register?step=3'); // Or setup page
                    }
                }, 2500);
            } catch (e) {
                console.error("Redirect check failed", e);
                // Fallback
                setTimeout(() => router.push('/'), 3000);
            }
        };

        checkStatus();

        // Safety timeout
        const timer = setTimeout(() => {
            if (status === 'verifying') {
                setStatus('success');
                router.push('/register?step=3');
            }
        }, 8000);

        return () => clearTimeout(timer);
    }, [user, router, status]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">

                {status === 'verifying' && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                        <Loader2 className="w-16 h-16 text-wine animate-spin mb-4" />
                        <h1 className="text-2xl font-black text-gray-900">Verifying Identity...</h1>
                        <p className="text-gray-500">Securely exchanging tokens with server.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 relative">
                            <PartyPopper className="w-10 h-10 text-green-600 absolute -top-2 -right-2 rotate-12" />
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">Account Verified!</h1>
                        <p className="text-gray-600 font-medium text-lg">
                            Your secure dashboard is ready.
                        </p>
                        <p className="text-sm text-gray-400 mt-8 animate-pulse font-bold uppercase tracking-widest">
                            Redirecting...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
