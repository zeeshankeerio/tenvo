import Link from 'next/link';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { MarketingPageHeader, MarketingSection } from '@/components/marketing/layout/MarketingSection';
import { MARKETING_BODY } from '@/lib/utils/marketingLayout';
import { getSalesMeetingUrl } from '@/lib/marketing/salesLinks';

export const metadata = {
  title: 'Documentation',
  description: 'TENVO documentation overview: public guides and authenticated API access.',
};

export default function DocsPage() {
  return (
    <MarketingLayout>
      <MarketingPageHeader title="Documentation" />
      <MarketingSection className="bg-neutral-50/50" padding="default" width="narrow">
        <div className={MARKETING_BODY}>
          <p>
            Product tours and capability pages live under{' '}
            <Link href="/features" className="font-semibold text-brand-primary underline-offset-2 hover:underline">
              Features
            </Link>{' '}
            and{' '}
            <Link href="/integrations" className="font-semibold text-brand-primary underline-offset-2 hover:underline">
              Integrations
            </Link>
            . For tenant-specific REST access, authenticated routes are available under{' '}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">/api/v1</code> after you sign in to
            your business workspace.
          </p>
          <p>
            Need a tailored integration map for your stack?{' '}
            <a
              href={getSalesMeetingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-primary underline-offset-2 hover:underline"
            >
              Book a meeting
            </a>{' '}
            or{' '}
            <Link href="/contact" className="font-semibold text-brand-primary underline-offset-2 hover:underline">
              contact sales
            </Link>
            .
          </p>
        </div>
      </MarketingSection>
    </MarketingLayout>
  );
}
