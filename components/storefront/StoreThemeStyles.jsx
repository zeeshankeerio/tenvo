'use client';

import { getStoreAccentPalette } from '@/lib/config/storefrontDomains';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { isAutoMarketplaceStore } from '@/lib/storefront/autoMarketplace';
import { isLuxuryFashionStore } from '@/lib/storefront/luxuryFashion';

/**
 * Injects per-store CSS variables for typography, accent, and surfaces.
 */
export function StoreThemeStyles({ business, settings }) {
  const category = resolveDomainKey(business?.category);
  const luxury = isLuxuryFashionStore(category);
  const dealership = isAutoDealershipStore(category);
  const marketplace = isAutoMarketplaceStore(category);
  const portal = dealership || marketplace;
  const { accent, accentDark, accentLight } = getStoreAccentPalette(settings, category);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          [data-store-theme] {
            --store-accent: ${accent};
            --store-accent-dark: ${accentDark};
            --store-accent-light: ${accentLight};
            --store-surface: ${portal ? '#ffffff' : luxury ? '#fafaf9' : '#f8fafc'};
            --store-card: #ffffff;
            --store-text: ${portal ? (marketplace ? '#171717' : '#0a0a0a') : luxury ? '#1c1917' : '#0f172a'};
            --store-muted: ${portal ? '#737373' : luxury ? '#78716c' : '#64748b'};
            --store-footer-bg: ${portal ? '#0a0a0a' : '#ffffff'};
            --store-footer-surface: ${portal ? '#171717' : accentLight};
            --store-footer-border: ${portal ? '#262626' : luxury ? '#e7e5e4' : '#e2e8f0'};
            --store-radius: ${portal ? '0.375rem' : luxury ? '0.125rem' : '0.75rem'};
            --store-radius-lg: ${portal ? '0.5rem' : luxury ? '0.25rem' : '1rem'};
            font-feature-settings: "kern" 1, "liga" 1;
            ${portal ? 'font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;' : ''}
          }
          [data-store-theme] .store-heading {
            letter-spacing: ${luxury ? '0.02em' : '-0.02em'};
            font-weight: 600;
            color: var(--store-text);
          }
          [data-store-theme] .store-price {
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: var(--store-text);
          }
          [data-store-luxury] .store-section-card {
            border-radius: var(--store-radius);
            border-color: #e7e5e4;
          }
          /* Hero / dark scrims - must win over .store-heading default color */
          [data-store-theme] .store-hero .store-heading,
          [data-store-theme] .store-heading--inverse {
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45), 0 6px 20px rgba(0, 0, 0, 0.35);
          }
          [data-store-theme] .store-hero .store-hero-eyebrow {
            color: rgba(255, 255, 255, 0.82);
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
          }
          [data-store-theme] .store-hero .store-hero-subtitle {
            color: rgba(255, 255, 255, 0.92);
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
          }
          [data-store-theme] .store-accent-bg {
            background-color: var(--store-accent);
          }
          [data-store-theme] .store-accent-text {
            color: var(--store-accent);
          }
        `,
      }}
    />
  );
}
