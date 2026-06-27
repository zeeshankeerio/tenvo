import { buildMarketingMetadata } from '@/lib/marketing/seo';

export const metadata = buildMarketingMetadata({
  title: 'Sign in',
  description: 'Sign in to your TENVO workspace.',
  path: '/login',
  noIndex: true,
});

export default function LoginLayout({ children }) {
  return children;
}
