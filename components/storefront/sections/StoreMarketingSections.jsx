import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getActivePageSections, getSectionBackgroundStyle } from '@/lib/storefront/storePageSections';

/**
 * Owner-configured marketing blocks on the public store homepage.
 */
export function StoreMarketingSections({ sections, businessDomain, accent = '#2563eb' }) {
  const active = getActivePageSections(sections);
  if (!active.length) return null;

  const base = `/store/${businessDomain}`;

  return (
    <div className="space-y-0">
      {active.map((section) => {
        const href = section.ctaHref.startsWith('/')
          ? `${base}${section.ctaHref === '/' ? '' : section.ctaHref}`
          : section.ctaHref;
        const style = getSectionBackgroundStyle(section, accent);
        const textStyle = { color: section.textColor || '#ffffff' };

        if (section.type === 'promo-strip') {
          const inner = (
            <div
              className="flex flex-col items-center justify-center gap-1 px-4 py-3 text-center sm:flex-row sm:gap-3"
              style={style}
            >
              <p className="text-sm font-semibold sm:text-base" style={textStyle}>
                {section.title || section.subtitle}
              </p>
              {section.title && section.subtitle ? (
                <p className="text-xs opacity-90 sm:text-sm" style={textStyle}>
                  {section.subtitle}
                </p>
              ) : null}
              {section.ctaLabel ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold underline sm:ml-2 sm:text-sm" style={textStyle}>
                  {section.ctaLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
          );

          if (section.ctaLabel) {
            return (
              <Link key={section.id} href={href} className="block transition hover:opacity-95">
                {inner}
              </Link>
            );
          }
          return (
            <div key={section.id} className="border-b border-white/10">
              {inner}
            </div>
          );
        }

        return (
          <section key={section.id} className="border-b border-slate-200/60">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
              <div
                className="relative min-h-[220px] overflow-hidden rounded-2xl sm:min-h-[260px] sm:rounded-3xl px-6 py-10 sm:px-10 sm:py-14 shadow-sm"
                style={style}
              >
                <div className="relative z-[1] max-w-2xl">
                  {section.title ? (
                    <h2 className="text-2xl font-black tracking-tight sm:text-4xl" style={textStyle}>
                      {section.title}
                    </h2>
                  ) : null}
                  {section.subtitle ? (
                    <p className="mt-2 text-sm leading-relaxed opacity-95 sm:text-lg" style={textStyle}>
                      {section.subtitle}
                    </p>
                  ) : null}
                  {section.ctaLabel ? (
                    <Link
                      href={href}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md transition hover:bg-white/95 sm:mt-6 sm:px-6 sm:py-3 sm:text-base"
                    >
                      {section.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
