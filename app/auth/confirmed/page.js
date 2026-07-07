'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, PartyPopper } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { businessAPI } from '@/lib/api/business';

const BLOCKED_APPROVAL_STATUSES = new Set([
  'pending_approval',
  'info_requested',
  'rejected',
]);

export default function AuthConfirmedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (redirectedRef.current) return;

    const timer = setTimeout(async () => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;

      try {
        const businesses = await businessAPI.getByUserId(user.id);

        if (!businesses?.length) {
          router.replace('/register?step=3');
          return;
        }

        const biz = businesses[0];
        const approvalStatus = String(biz.approval_status || '');

        if (BLOCKED_APPROVAL_STATUSES.has(approvalStatus)) {
          router.replace('/pending-approval');
          return;
        }

        router.replace(`/business/${biz.domain}`);
      } catch (e) {
        console.error('[auth/confirmed] redirect check failed', e);
        router.replace('/register?step=3');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, authLoading, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
          {authLoading ? (
            <>
              <Loader2 className="w-16 h-16 text-wine animate-spin mb-4" />
              <h1 className="text-2xl font-semibold text-gray-900">Verifying identity...</h1>
              <p className="text-gray-500">Securely exchanging tokens with server.</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 relative">
                <PartyPopper className="w-10 h-10 text-green-600 absolute -top-2 -right-2 rotate-12" />
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Account verified</h1>
              <p className="text-gray-600 font-medium text-lg">Your secure dashboard is ready.</p>
              <p className="text-sm text-gray-400 mt-8 animate-pulse font-semibold uppercase tracking-widest">
                Redirecting...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
