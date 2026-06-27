import Link from 'next/link';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { MarketingPageHeader, MarketingSection } from '@/components/marketing/layout/MarketingSection';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { MARKETING_BODY } from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

export const metadata = buildMarketingMetadata({
  title: 'Help Center',
  description:
    'Get started with TENVO: features, pricing, demos, and support. Find answers about inventory, POS, storefront, and accounting.',
  path: '/help',
});

export default function HelpPage() {
  const items = [
    { href: '/features', label: 'Core features', desc: 'Storefront, POS, inventory, accounting, and compliance positioning.' },
    { href: '/why-tenvo', label: 'Why TENVO', desc: 'How we compare to stitched storefront-only or global bundles.' },
    { href: '/pricing', label: 'Pricing', desc: 'Plans and currencies for your market.' },
    { href: getBookMeetingHref(), label: 'Book a meeting', desc: 'Pick a 30-minute slot with our team.', external: true },
    { href: '/contact', label: 'Contact support', desc: 'Billing, onboarding, and technical questions.' },
    { href: '/integrations', label: 'Integrations', desc: 'Channels, payments, and carriers we talk about on the site.' },
  ];

  return (
    <MarketingLayout>
      <MarketingPageHeader
        title="Help Center"
        description={
          <>
            Signed-in product help lives inside your workspace after you{' '}
            <Link href="/register" className="font-semibold text-brand-primary underline-offset-2 hover:underline">
              register
            </Link>
            . Start here on the public site:
          </>
        }
      />

      <MarketingSection className="bg-neutral-50/50" padding="default" width="narrow">
        <ul className="space-y-3 sm:space-y-4">
          {items.map((item) => (
            <li key={item.href}>
              <MarketingCtaLink
                href={item.href}
                className="block rounded-2xl border border-neutral-200 bg-white p-4 motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-brand-primary/40 motion-safe:hover:shadow-sm sm:p-5"
              >
                <span className="font-semibold text-neutral-900">{item.label}</span>
                <p className={cn('mt-1', MARKETING_BODY)}>{item.desc}</p>
              </MarketingCtaLink>
            </li>
          ))}
        </ul>
      </MarketingSection>
    </MarketingLayout>
  );
}
