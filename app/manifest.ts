import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';

export default function manifest(): MetadataRoute.Manifest {
  const site = getSiteUrl();
  return {
    name: `${SITE_NAME} — Business operations platform`,
    short_name: SITE_NAME,
    description:
      'Inventory, POS, storefront, orders, and accounting in one platform for growing businesses.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f766e',
    lang: 'en',
    dir: 'ltr',
    categories: ['business', 'productivity', 'finance'],
    icons: [
      {
        src: '/tenvo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    id: site,
  };
}
