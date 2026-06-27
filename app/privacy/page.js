import Link from 'next/link';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { MarketingPageHeader, MarketingSection } from '@/components/marketing/layout/MarketingSection';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { TENVO_PARENT_COMPANY } from '@/lib/marketing/tenvo-assistant-knowledge';

export const metadata = buildMarketingMetadata({
  title: 'Privacy Policy',
  description:
    'How TENVO at www.tenvo.store collects and uses information on this public website, forms, and analytics.',
  path: '/privacy',
  noIndex: false,
});

export default function PrivacyPage() {
  const updated = new Date().toISOString().slice(0, 10);

  return (
    <MarketingLayout>
      <MarketingPageHeader title="Privacy Policy">
        <p className="mt-2 text-sm text-neutral-500">Last updated: {updated}</p>
      </MarketingPageHeader>
      <MarketingSection className="bg-neutral-50/50" padding="default" width="narrow">
        <div className="space-y-6 text-sm font-medium leading-relaxed text-neutral-700 sm:space-y-8">
          <p>
            This policy describes the public marketing site for TENVO, a product developed by{' '}
            {TENVO_PARENT_COMPANY.name}. It does not replace your separate agreement or privacy terms
            when you use the signed-in application or a tenant storefront.
          </p>
          <h2 className="pt-2 text-base font-black text-neutral-900 sm:text-lg">Information you submit</h2>
          <p>
            When you use contact, demo, newsletter, or similar forms, we process the fields you provide so
            our team can respond. Messages may be delivered by email (for example via Resend) to{' '}
            <a className="font-bold text-brand-primary underline-offset-2 hover:underline" href="mailto:tenvo@mindscapeanalytics.com">
              tenvo@mindscapeanalytics.com
            </a>
            . Do not include payment card numbers or government ID numbers in free-form messages.
          </p>
          <h2 className="pt-2 text-base font-black text-neutral-900 sm:text-lg">Analytics</h2>
          <p>
            We may use first-party analytics to understand navigation and campaign performance. You can ask
            questions about data use anytime via{' '}
            <Link href="/contact" className="font-bold text-brand-primary underline-offset-2 hover:underline">
              Contact
            </Link>{' '}
            or our parent company at{' '}
            <a
              href={TENVO_PARENT_COMPANY.contactPage}
              className="font-bold text-brand-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mindscape contact
            </a>
            .
          </p>
        </div>
      </MarketingSection>
    </MarketingLayout>
  );
}
