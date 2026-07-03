/**
 * Shared nav + hub metadata for domain commercial packages (`/solutions/[slug]`).
 * Keep labels and paths here so MarketingNav, footer, breadcrumbs, and sitemap stay in sync.
 */
import { listDomainPackages } from '@/lib/config/domainPackages';

/** Top-level marketing nav label for vertical commerce suites. */
export const INDUSTRY_PLANS_NAV = Object.freeze({
  label: 'Industry Plans',
  hubPath: '/industry-plans',
  hubTitle: 'Industry Plans',
  hubEyebrow: 'Vertical commerce suites',
  hubDescription:
    'Pre-built module mixes, higher limits, and storefront defaults for clothing, pharmacy, auto, showroom, furniture, and gym operators — on top of standard SaaS tiers.',
});

/** Short labels + Lucide icon names for nav dropdowns (resolved in client components). */
const NAV_META = Object.freeze({
  'clothing-commerce': { label: 'Clothing & textile', icon: 'Shirt' },
  'pharmacy-commerce': { label: 'Pharmacy & wellness', icon: 'Pill' },
  'auto-parts-commerce': { label: 'Auto parts', icon: 'Cog' },
  'vehicle-showroom': { label: 'Vehicle showroom', icon: 'CarFront' },
  'furniture-commerce': { label: 'Furniture & home', icon: 'Sofa' },
  'fitness-commerce': { label: 'Gym & fitness', icon: 'Dumbbell' },
});

/**
 * Nav items for Industry Plans mega-menu, mobile nav, and footer.
 * @returns {Array<{ key: string, label: string, href: string, tagline: string, icon: string }>}
 */
export function listIndustryPlanNavItems() {
  return listDomainPackages().map((pkg) => {
    const meta = NAV_META[pkg.key] || { label: pkg.name, icon: 'Sparkles' };
    return {
      key: pkg.key,
      label: meta.label,
      href: pkg.marketingPath || `/solutions/${pkg.slug}`,
      tagline: pkg.tagline,
      icon: meta.icon,
    };
  });
}
