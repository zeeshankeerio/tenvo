'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Clock, Calendar, Mail, ArrowLeft, RefreshCw,
  ShieldCheck, MailCheck, Rocket, CheckCircle2, Tag,
} from 'lucide-react';
import { businessAPI } from '@/lib/api/business';
import { recordDemoRequest } from '@/lib/actions/admin/registrationApproval';
import { toast } from 'react-hot-toast';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import { getSalesMeetingUrl } from '@/lib/marketing/salesLinks';

export default function PendingApprovalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoRequested, setDemoRequested] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBusiness = async () => {
    if (!user) return;
    
    try {
      const businesses = await businessAPI.getByUserId(user.id);
      if (businesses?.length > 0) {
        const biz = businesses[0];
        
        // If approved, redirect to dashboard
        if (biz.approval_status === 'approved' || biz.approval_status === 'auto_approved') {
          toast.success('Your registration has been approved! Redirecting to dashboard...');
          router.push(`/business/${biz.domain}`);
          return;
        }
        
        setBusiness(biz);
        setDemoRequested(biz.is_demo_requested || false);
      }
    } catch (error) {
      console.error('Failed to fetch business:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/pending-approval');
      return;
    }

    fetchBusiness();
  }, [user, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBusiness();
  };

  const handleBookDemo = async () => {
    if (business) {
      try {
        const result = await recordDemoRequest({ businessId: business.id });
        if (result.success) {
          setDemoRequested(true);
          toast.success('Demo request recorded! Opening booking page...');
          // Open Calendly or sales meeting URL
          const meetingUrl = getSalesMeetingUrl();
          window.open(meetingUrl, '_blank');
        } else {
          toast.error(result.error || 'Failed to record demo request');
        }
      } catch (error) {
        console.error('Failed to record demo request:', error);
        toast.error('Failed to record demo request');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 shadow-xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Registration Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find a pending registration for your account.
          </p>
          <Button onClick={() => router.push('/register')} className="w-full">
            Register New Business
          </Button>
        </Card>
      </div>
    );
  }

  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@tenvo.app';
  const isInfoRequested = business.approval_status === 'info_requested';
  const submittedLabel = business.approval_requested_at
    ? new Date(business.approval_requested_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  const steps = [
    {
      icon: ShieldCheck,
      title: 'We verify your details',
      desc: 'Our team confirms your business information.',
    },
    {
      icon: MailCheck,
      title: 'You get the green light',
      desc: 'An approval email lands in your inbox.',
    },
    {
      icon: Rocket,
      title: 'Go live instantly',
      desc: 'Dashboard, storefront, and inventory unlock.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden rounded-2xl border-neutral-200 p-0 shadow-xl">
          <div className="grid lg:grid-cols-2">
            {/* LEFT: brand + guidance */}
            <div className="relative flex flex-col gap-5 overflow-hidden bg-gradient-to-br from-wine-700 via-wine-800 to-wine-950 p-7 text-white sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/5 blur-3xl" aria-hidden />

              <div className="relative">
                <TenvoTextLogo className="h-8" textClassName="text-white" taglineClassName="text-white/60" />
              </div>

              <div className="relative">
                {isInfoRequested ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100 ring-1 ring-inset ring-amber-300/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    Action needed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                    </span>
                    Under review
                  </span>
                )}

                <h1 className="mt-4 text-2xl font-semibold leading-tight sm:text-[28px]">
                  {isInfoRequested ? 'A quick detail needed' : 'Registration under review'}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  Thank you for registering{' '}
                  <span className="font-semibold text-white">{business.business_name}</span>.{' '}
                  {isInfoRequested
                    ? 'Share the details below and we will finish your approval.'
                    : "We're getting your workspace ready."}
                </p>
              </div>

              {isInfoRequested && business.approval_notes ? (
                <div className="relative rounded-xl bg-white/10 p-4 ring-1 ring-inset ring-white/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-100">
                    What we need
                  </p>
                  <p className="mt-1 text-sm text-white/90">{business.approval_notes}</p>
                </div>
              ) : null}

              <div className="relative mt-auto space-y-4 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  What happens next
                </p>
                <ol className="space-y-4">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                      <li key={step.title} className="flex gap-3">
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/15">
                          <StepIcon className="h-4 w-4 text-white" />
                          <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-wine-800">
                            {index + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{step.title}</p>
                          <p className="text-xs text-white/70">{step.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            {/* RIGHT: details + actions */}
            <div className="flex flex-col gap-5 p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Estimated review time</p>
                  <p className="text-xs text-gray-500">Typically 24-48 hours on business days</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Your registration
                </p>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="w-20 shrink-0 text-gray-500">Email</dt>
                    <dd className="truncate font-medium text-gray-900">{business.email}</dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="w-20 shrink-0 text-gray-500">Submitted</dt>
                    <dd className="font-medium text-gray-900">{submittedLabel}</dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 shrink-0 text-gray-400" />
                    <dt className="w-20 shrink-0 text-gray-500">Category</dt>
                    <dd className="truncate font-medium capitalize text-gray-900">{business.category}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2.5">
                <Button
                  size="lg"
                  onClick={handleBookDemo}
                  disabled={demoRequested}
                  className="h-12 w-full bg-wine text-base font-semibold text-white hover:bg-wine/90"
                >
                  {demoRequested ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Demo requested
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-5 w-5" />
                      Book a demo call
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-11 w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Checking status...' : 'Check approval status'}
                </Button>

                <div className="flex gap-2.5">
                  <Button
                    variant="ghost"
                    onClick={() => (window.location.href = `mailto:${supportEmail}`)}
                    className="flex-1 text-gray-600 hover:text-gray-900"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email support
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/')}
                    className="flex-1 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </div>
              </div>

              <p className="mt-auto border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
                We'll email <span className="font-medium text-gray-700">{business.email}</span>{' '}
                the moment you're approved. Questions?{' '}
                <a href={`mailto:${supportEmail}`} className="font-medium text-wine hover:underline">
                  {supportEmail}
                </a>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
