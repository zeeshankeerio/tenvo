import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/marketing/site-url';

function siteHost() {
  try {
    return new URL(getSiteUrl()).host;
  } catch {
    return 'www.tenvo.store';
  }
}

/** Paths that must not compete with marketing pages in search results. */
const DISALLOW = [
  '/api/',
  '/admin',
  '/business/',
  '/multi-business',
  '/store/',
  '/verify-email',
  '/innovation-showcase',
];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      {
        userAgent: 'GPTBot',
        allow: ['/llms.txt', '/'],
        disallow: DISALLOW,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: siteHost(),
  };
}
