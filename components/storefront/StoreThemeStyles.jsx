'use client';

import { getStoreAccentPalette } from '@/lib/config/storefrontDomains';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { isAutoMarketplaceStore } from '@/lib/storefront/autoMarketplace';
import { isLuxuryFashionStore } from '@/lib/storefront/luxuryFashion';
import { isFitnessElevatedStore } from '@/lib/storefront/fitnessStorefront';

/**
 * Injects per-store CSS variables for typography, accent, and surfaces.
 */
export function StoreThemeStyles({ business, settings }) {
  const category = resolveDomainKey(business?.category);
  const luxury = isLuxuryFashionStore(category);
  const dealership = isAutoDealershipStore(category);
  const marketplace = isAutoMarketplaceStore(category);
  const fitness = isFitnessElevatedStore(category);
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
            --store-surface: ${fitness ? '#0a0a0a' : portal ? '#ffffff' : luxury ? '#fafaf9' : '#f8fafc'};
            --store-card: ${fitness ? '#141414' : '#ffffff'};
            --store-text: ${fitness ? '#fafafa' : portal ? (marketplace ? '#171717' : '#0a0a0a') : luxury ? '#1c1917' : '#0f172a'};
            --store-muted: ${fitness ? 'rgba(255,255,255,0.55)' : portal ? '#737373' : luxury ? '#78716c' : '#64748b'};
            --store-footer-bg: ${fitness || portal ? '#0a0a0a' : '#ffffff'};
            --store-footer-surface: ${fitness ? '#111111' : portal ? '#171717' : accentLight};
            --store-footer-border: ${fitness || portal ? '#27272a' : luxury ? '#e7e5e4' : '#e2e8f0'};
            --store-radius: ${portal ? '0.375rem' : luxury ? '0.125rem' : '0.75rem'};
            --store-radius-lg: ${portal ? '0.5rem' : luxury ? '0.25rem' : '1rem'};
            font-feature-settings: "kern" 1, "liga" 1;
            ${portal ? 'font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;' : ''}
          }
          [data-store-fitness] .store-heading {
            color: #ffffff;
          }
          [data-store-fitness] .fitness-hero .fitness-hero-eyebrow {
            color: rgba(251, 113, 133, 0.95);
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
          }
          [data-store-fitness] .fitness-hero .store-heading--inverse {
            text-shadow: 0 2px 28px rgba(0, 0, 0, 0.4);
          }
          [data-store-fitness] .fitness-hero .fitness-hero-title {
            background-image: linear-gradient(
              176deg,
              #ffffff 0%,
              #ffe4e6 24%,
              #fb7185 52%,
              #e11d48 72%,
              #9f1239 100%
            );
            background-size: 100% 220%;
            background-position: 50% 20%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
            text-shadow: none;
            filter:
              drop-shadow(0 6px 22px rgba(159, 18, 57, 0.5))
              drop-shadow(0 2px 6px rgba(0, 0, 0, 0.55));
            animation: fitness-hero-title-sheen 7s ease-in-out infinite;
          }
          @keyframes fitness-hero-title-sheen {
            0%, 100% { background-position: 50% 16%; }
            50% { background-position: 50% 84%; }
          }
          /* Reusable static wine→white gradient for fitness section headings.
             No animation (motion is reserved for the hero focal title). */
          [data-store-fitness] .fitness-heading-gradient {
            background-image: linear-gradient(
              92deg,
              #ffffff 0%,
              #ffe4e6 46%,
              #fb7185 78%,
              #e11d48 100%
            );
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
            filter: drop-shadow(0 2px 10px rgba(159, 18, 57, 0.28));
          }
          @media (max-width: 1023px) {
            [data-store-fitness] .fitness-hero .fitness-hero-title {
              letter-spacing: -0.03em;
            }
            [data-store-fitness] .fitness-hero .fitness-hero-subtitle {
              text-shadow: 0 1px 12px rgba(0, 0, 0, 0.55);
            }
            [data-store-fitness] .fitness-hero .fitness-hero-athlete {
              animation-duration: 5.5s;
            }
          }
          [data-store-fitness] .fitness-hero .store-hero-subtitle,
          [data-store-fitness] .fitness-hero p.text-zinc-300 {
            color: rgba(212, 212, 216, 0.92);
          }
          @keyframes fitness-hero-glow-pulse {
            0%, 100% { opacity: 0.72; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.04); }
          }
          @keyframes fitness-hero-flare-drift {
            0%, 100% { opacity: 0.55; transform: rotate(-12deg) translate3d(0, 0, 0); }
            50% { opacity: 0.85; transform: rotate(-10deg) translate3d(-12px, 8px, 0); }
          }
          @keyframes fitness-hero-spark {
            0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.45; }
            50% { transform: translate3d(10px, -14px, 0) scale(1.08); opacity: 0.95; }
          }
          @keyframes fitness-athlete-float {
            0%, 100% { transform: translate3d(0, 0, 0); }
            50% { transform: translate3d(0, -8px, 0); }
          }
          @keyframes fitness-hero-ring-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes fitness-hero-ring-glow {
            0%, 100% { opacity: 0.9; filter: drop-shadow(0 0 28px rgba(225, 29, 72, 0.38)); }
            50% { opacity: 1; filter: drop-shadow(0 0 48px rgba(225, 29, 72, 0.58)); }
          }
          [data-store-fitness] .fitness-hero .fitness-hero-glow {
            animation: fitness-hero-glow-pulse 6s ease-in-out infinite;
          }
          [data-store-fitness] .fitness-hero .fitness-hero-flare {
            animation: fitness-hero-flare-drift 9s ease-in-out infinite;
          }
          [data-store-fitness] .fitness-hero .fitness-hero-spark {
            animation: fitness-hero-spark 8s ease-in-out infinite;
          }
          [data-store-fitness] .fitness-hero .fitness-hero-athlete {
            animation: fitness-athlete-float 7s ease-in-out infinite;
          }
          [data-store-fitness] .fitness-hero .fitness-hero-ring {
            animation: fitness-hero-ring-glow 5s ease-in-out infinite, fitness-hero-ring-spin 48s linear infinite;
          }
          [data-store-fitness] .fitness-hero .fitness-hero-trending-track:hover {
            animation-play-state: paused;
          }
          @keyframes fitness-training-marquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          [data-store-fitness] .fitness-training-marquee-track {
            animation: fitness-training-marquee 38s linear infinite;
            will-change: transform;
          }
          [data-store-fitness] .fitness-training-marquee-track:hover {
            animation-play-state: paused;
          }
          [data-store-fitness] .fitness-membership-marquee-track {
            animation: fitness-training-marquee 38s linear infinite reverse;
            will-change: transform;
          }
          [data-store-fitness] .fitness-membership-marquee-track:hover {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            [data-store-fitness] .fitness-hero .fitness-hero-title,
            [data-store-fitness] .fitness-hero .fitness-hero-glow,
            [data-store-fitness] .fitness-hero .fitness-hero-flare,
            [data-store-fitness] .fitness-hero .fitness-hero-spark,
            [data-store-fitness] .fitness-hero .fitness-hero-athlete,
            [data-store-fitness] .fitness-hero .fitness-hero-ring,
            [data-store-fitness] .fitness-hero .fitness-hero-trending-track,
            [data-store-fitness] .fitness-training-marquee-track,
            [data-store-fitness] .fitness-membership-marquee-track {
              animation: none;
            }
          }
          [data-store-fitness] .fitness-mobile-scroll {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            overscroll-behavior-x: contain;
          }
          [data-store-fitness] .fitness-mobile-scroll::-webkit-scrollbar {
            display: none;
          }

          /* Pharmacy elevated store — auto-scrolling category marquee */
          @keyframes pharmacy-category-marquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          [data-store-pharmacy] .pharmacy-category-marquee-track {
            animation: pharmacy-category-marquee 35s linear infinite;
            will-change: transform;
          }
          [data-store-pharmacy] .pharmacy-category-marquee-track:hover {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            [data-store-pharmacy] .pharmacy-category-marquee-track {
              animation: none;
            }
          }

          [data-store-fitness] .fitness-product-card {
            background-color: var(--store-card);
            border-color: rgba(255, 255, 255, 0.1);
            color: #fafafa;
          }
          [data-store-fitness] .fitness-product-card .fitness-product-title,
          [data-store-fitness] .fitness-product-card .store-price {
            color: #fafafa !important;
          }
          [data-store-fitness] .fitness-product-card .fitness-product-meta {
            color: rgba(255, 255, 255, 0.5);
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
          @keyframes store-marquee-scroll {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          [data-store-theme] .store-marquee-track {
            animation: store-marquee-scroll var(--store-marquee-duration, 38s) linear infinite;
            will-change: transform;
          }
          [data-store-theme] .store-marquee-track--reverse {
            animation-direction: reverse;
          }
          [data-store-theme] .store-marquee-track:hover {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            [data-store-theme] .store-marquee-track {
              animation: none;
            }
          }
        `,
      }}
    />
  );
}
