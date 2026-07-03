'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RegistrationApprovalsPanel } from '@/components/admin/RegistrationApprovalsPanel';

export default function RegistrationApprovalsPage() {
  const { isPlatformAdmin, isLoading: bizLoading } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (bizLoading) return;
    if (!isPlatformAdmin) {
      toast.error('Access denied - Platform administrator only');
      router.push('/');
    }
  }, [isPlatformAdmin, bizLoading, router]);

  if (bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-wine" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Admin
          </Button>
        </div>
        <RegistrationApprovalsPanel />
      </div>
    </div>
  );
}
