'use client';

import Link from 'next/link';
import { Upload, ShieldCheck, Clock, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Premium prescription upload banner with trust indicators.
 * Positioned prominently to drive engagement for Rx services.
 */
export function PharmacyPrescriptionBanner({ storeBase, accent = '#16a34a' }) {
  const trustPoints = [
    { icon: ShieldCheck, text: 'Verified by licensed pharmacists' },
    { icon: Clock, text: 'Processing within 2 hours' },
    { icon: Pill, text: 'Genuine prescribed medicines' },
  ];

  return (
    <section className="border-y border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          {/* Left: Content */}
          <div className="max-w-2xl text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: `${accent}15`,
                color: accent,
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Prescription Service
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900 sm:text-3xl lg:text-4xl">
              Upload your prescription for Rx medicines
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
              Send your prescription securely and our licensed pharmacists will verify and prepare your
              Schedule H medicines for delivery. All Rx orders require valid prescription verification.
            </p>

            {/* Trust points */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 lg:justify-start">
              {trustPoints.map((point) => {
                const IconComponent = point.icon;
                return (
                  <div key={point.text} className="flex items-center gap-2 text-sm text-gray-700">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${accent}12` }}
                    >
                      <IconComponent className="h-4 w-4" style={{ color: accent }} />
                    </div>
                    <span className="font-medium">{point.text}</span>
                  </div>
                );
              })}
            </div>

            <Link
              href={`${storeBase}/contact?prescription=1`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
              style={{ backgroundColor: accent }}
            >
              <Upload className="h-4 w-4" />
              Upload prescription now
            </Link>
          </div>

          {/* Right: Illustration or stats */}
          <div className="grid w-full max-w-xs grid-cols-2 gap-4 lg:max-w-sm">
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-sm">
              <div className="text-3xl font-semibold" style={{ color: accent }}>
                2hrs
              </div>
              <div className="mt-1 text-xs font-medium text-gray-600">
                Average processing time
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-sm">
              <div className="text-3xl font-semibold" style={{ color: accent }}>
                100%
              </div>
              <div className="mt-1 text-xs font-medium text-gray-600">
                Pharmacist verified
              </div>
            </div>
            <div className="col-span-2 rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-sm">
              <div className="text-3xl font-semibold" style={{ color: accent }}>
                Licensed
              </div>
              <div className="mt-1 text-xs font-medium text-gray-600">
                Registered pharmacy with authorized dispensing
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
