import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/marketing/site-url';

const PATHS = [
  '',
  '/about',
  '/features',
  '/pricing',
  '/contact',
  '/demo',
  '/integrations',
  '/industries',
  '/solutions/marketing-crm',
  '/why-tenvo',
  '/register',
  '/login',
  '/case-studies',
  '/privacy',
  '/terms',
  '/careers',
  '/press',
  '/help',
  '/docs',
  '/status',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const last = new Date();
  return PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: last,
    changeFrequency:
      path === '' || path === '/contact' || path === '/pricing' || path === '/demo'
        ? 'weekly'
        : 'monthly',
    priority:
      path === ''
        ? 1
        : path === '/contact' || path === '/pricing' || path === '/register'
          ? 0.9
          : 0.8,
  }));
}
