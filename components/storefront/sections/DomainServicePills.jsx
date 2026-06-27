'use client';

import { CheckCircle2 } from 'lucide-react';

export function DomainServicePills({ pills = [], accent }) {
  if (!pills.length) return null;

  return (
    <section className="hidden md:block border-b bg-slate-50/80">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {pills.map((pill) => (
            <span key={pill} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
