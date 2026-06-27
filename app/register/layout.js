import { buildMarketingMetadata } from '@/lib/marketing/seo';

export const metadata = buildMarketingMetadata({
  title: 'Start free',
  description:
    'Create your TENVO workspace: inventory, POS, storefront, and accounting in minutes. Free plan available; no credit card required to start.',
  path: '/register',
  noIndex: true,
  keywords: ['TENVO signup', 'free ERP trial', 'register TENVO'],
});

export default function RegisterLayout({ children }) {
  return children;
}
