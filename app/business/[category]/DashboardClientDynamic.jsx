'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  loading: () => (
    <div className="space-y-4 py-4 animate-pulse">
      <div className="h-10 w-full max-w-2xl rounded-xl bg-slate-100" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="h-32 rounded-2xl border border-slate-100 bg-gradient-to-br from-cyan-50/80 to-white" />
        <div className="h-32 rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/80 to-white" />
        <div className="h-32 rounded-2xl border border-slate-100 bg-gradient-to-br from-violet-50/80 to-white" />
        <div className="h-32 rounded-2xl border border-slate-100 bg-gradient-to-br from-rose-50/80 to-white" />
      </div>
      <div className="h-72 rounded-2xl border border-slate-100 bg-gradient-to-br from-violet-50/30 to-cyan-50/20" />
    </div>
  ),
  ssr: false,
});

export default function DashboardClientDynamic() {
  return <DashboardClient />;
}
