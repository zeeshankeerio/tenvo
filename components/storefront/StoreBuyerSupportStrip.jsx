'use client';

import Link from 'next/link';
import { Headphones, ChevronRight } from 'lucide-react';

const LINKS = (root) => [
  { label: 'Track order', href: `${root}/orders` },
  { label: 'Contact us', href: `${root}/contact` },
  { label: 'Shipping', href: `${root}/shipping` },
  { label: 'Returns', href: `${root}/returns` },
  { label: 'FAQs', href: `${root}/faqs` },
];

/**
 * Compact buyer-support shortcuts for mobile homepage (footer covers desktop).
 */
export function StoreBuyerSupportStrip({ businessDomain, accent }) {
  const root = `/store/${businessDomain}`;

  return (
    <section className="border-t border-gray-100 bg-gray-50 px-4 py-4 lg:hidden">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-2 flex items-center gap-2">
          <Headphones className="h-4 w-4 text-gray-400" aria-hidden />
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Need help?</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LINKS(root).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-800 transition-colors hover:border-gray-300"
            >
              {link.label}
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden />
            </Link>
          ))}
        </div>
        <Link
          href={`${root}/contact`}
          className="mt-3 flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          Message the store
        </Link>
      </div>
    </section>
  );
}

export default StoreBuyerSupportStrip;
