/**
 * Central SEO config for TENVO marketing (2026: canonical URLs, rich snippets, E-E-A-T).
 * Set NEXT_PUBLIC_APP_URL=https://www.tenvo.store in production.
 */

import type { Metadata } from 'next';
import type { FaqItem } from '@/lib/marketing/structured-data';
import { getSiteUrl } from '@/lib/marketing/site-url';

export const SITE_NAME = 'TENVO';
export const DEFAULT_OG_IMAGE = '/industrial_hero_image.png';
export const DEFAULT_LOCALE = 'en_PK';

/** Core keywords — match product positioning (inventory, POS, storefront, Pakistan + global). */
export const DEFAULT_KEYWORDS = [
  'TENVO',
  'business operations software',
  'inventory management software',
  'POS software',
  'online storefront',
  'ERP Pakistan',
  'FBR GST invoicing',
  'multi-warehouse inventory',
  'retail management software',
  'restaurant POS',
  'accounting software',
  'Mindscape Analytics',
] as const;

/** Homepage FAQ copy (must match visible accordion on /). */
export const HOME_PAGE_FAQS: readonly FaqItem[] = [
  {
    question: 'Can I really import native Excel files directly?',
    answer:
      'Yes. TENVO supports direct upload of native .xlsx files. The interface checks columns in real time, warns about duplicate SKUs or invalid prices, and lets you partially import valid rows while exporting a fixed file for errors.',
  },
  {
    question: 'Is TENVO compliant with FBR tax laws?',
    answer:
      'TENVO includes a localized tax ledger that calculates standard GST and configurable provincial rates per invoice line, with audit-ready logs and export-oriented summaries. Live FBR IRIS sync is on the roadmap.',
  },
  {
    question: 'How does the Urdu language toggle work?',
    answer:
      'TENVO includes a language toggle with growing Urdu strings for core hub actions. Full product localization is expanding release by release.',
  },
  {
    question: 'Will we lose data during our migration?',
    answer:
      'Migration is guided: review spreadsheets, check SKU overlaps, verify supplier ledgers, run sandbox test uploads, and validate data before going live. Contact sales for enterprise migration support.',
  },
];

export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

/** Public marketing routes for sitemap (path, priority, changeFrequency). */
export const MARKETING_SITEMAP_ROUTES: ReadonlyArray<{
  path: string;
  priority: number;
  changeFrequency: SitemapChangeFrequency;
}> = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.95, changeFrequency: 'weekly' },
  { path: '/register', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/demo', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.85, changeFrequency: 'monthly' },
  { path: '/why-tenvo', priority: 0.85, changeFrequency: 'monthly' },
  { path: '/integrations', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/industries', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/industry-plans', priority: 0.85, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.75, changeFrequency: 'monthly' },
  { path: '/case-studies', priority: 0.75, changeFrequency: 'weekly' },
  { path: '/solutions/marketing-crm', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/help', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/docs', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/careers', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/press', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/status', priority: 0.2, changeFrequency: 'weekly' },
];

const INDEXABLE_ROBOTS: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

const NOINDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: true,
};

export function getTwitterHandle(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_TWITTER_HANDLE?.trim();
  if (!raw) return undefined;
  return raw.startsWith('@') ? raw : `@${raw}`;
}

/** Search-console / webmaster verification tags (set in production env). */
export function getSeoVerification(): Metadata['verification'] {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const yandex = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim();
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();

  const verification: NonNullable<Metadata['verification']> = {};
  if (google) verification.google = google;
  if (yandex) verification.yandex = yandex;
  if (bing) {
    verification.other = { 'msvalidate.01': bing };
  }
  return verification;
}

export type BuildMarketingMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
};

/** Build Next.js Metadata for a marketing page. */
export function buildMarketingMetadata({
  title,
  description,
  path = '',
  keywords,
  ogImage = DEFAULT_OG_IMAGE,
  ogTitle,
  noIndex = false,
  type = 'website',
}: BuildMarketingMetadataOptions): Metadata {
  const canonical = path || '/';
  const site = getSiteUrl();
  const twitter = getTwitterHandle();
  const canonicalUrl = `${site}${canonical === '/' ? '' : canonical}`;

  return {
    title,
    description,
    keywords: keywords ?? [...DEFAULT_KEYWORDS],
    alternates: {
      canonical,
      languages: {
        'en-PK': canonicalUrl,
        en: canonicalUrl,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      title: ogTitle || title,
      description,
      url: canonical,
      type,
      siteName: SITE_NAME,
      locale: DEFAULT_LOCALE,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${ogTitle || title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle || title,
      description,
      images: [ogImage],
      ...(twitter ? { site: twitter, creator: twitter } : {}),
    },
    robots: noIndex ? NOINDEX_ROBOTS : INDEXABLE_ROBOTS,
  };
}

/** Root layout defaults (homepage + fallback). */
export function getRootMarketingMetadata(): Metadata {
  const verification = getSeoVerification();
  return {
    ...buildMarketingMetadata({
      title: 'Inventory, POS, storefront, and accounting in one platform',
      description:
        'TENVO replaces stitched spreadsheets and disconnected apps with inventory, warehouses, POS, branded storefront, orders, and accounting. Pakistan-first depth; global roadmap. Start free at www.tenvo.store.',
      path: '/',
      keywords: [
        ...DEFAULT_KEYWORDS,
        'tenvo.store',
        'cloud ERP',
        'small business software',
        'SME operations platform',
      ],
      ogTitle: 'TENVO — Operations, commerce, and finance in one platform',
    }),
    authors: [{ name: 'Mindscape Analytics LLC', url: 'https://www.mindscapeanalytics.com/' }],
    creator: SITE_NAME,
    publisher: 'Mindscape Analytics LLC',
    category: 'Business Software',
    applicationName: SITE_NAME,
    ...(verification && Object.keys(verification).length > 0 ? { verification } : {}),
  };
}
