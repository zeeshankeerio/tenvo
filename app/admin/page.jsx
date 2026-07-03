'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/lib/context/BusinessContext';
import { BusinessLoadingBoundary } from '@/components/guards/BusinessLoadingBoundary';

const PlatformAdminPanel = React.lazy(() => import('@/components/admin/PlatformAdminPanel'));

export default function AdminPage() {
    const { isLoading, isPlatformAdmin } = useBusiness();

    return (
        <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">
            <BusinessLoadingBoundary isLoading={isLoading}>
                {isPlatformAdmin ? (
                    <Suspense
                        fallback={
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                            </div>
                        }
                    >
                        <PlatformAdminPanel />
                    </Suspense>
                ) : (
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                                Access Restricted
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-gray-600">
                            <p>
                                Platform administration is available to platform owner and platform admin accounts.
                            </p>
                            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 w-fit">
                                <ShieldCheck className="w-4 h-4" />
                                Business-level settings remain available in your workspace.
                            </div>
                            <div>
                                <Button asChild variant="outline">
                                    <Link href="/">Return to dashboard</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </BusinessLoadingBoundary>
        </main>
    );
}
