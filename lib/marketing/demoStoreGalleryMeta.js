/**
 * Rich marketing metadata for featured Tenvo demo storefront cards.
 * Descriptions and accents align with `lib/dataLab/demoStoreProfiles.js`.
 */
import { ALL_DEMO_SEEDS } from '../dataLab/domains.mjs';
import { getDemoStorefrontProfile } from '../dataLab/demoStoreProfiles.js';
import { fashionStockImage } from '../dataLab/fashionDemoImages.js';
import { jewelleryStockImage } from '../dataLab/jewelleryDemoImages.js';
import { buildUnsplashImageUrl } from '../storefront/unsplashUrl.js';
import { AUTO_PARTS_DEFAULT_SLIDES } from '../storefront/autoPartsArchiveMap.js';
import { FITNESS_ASSETS } from '../storefront/fitnessStorefront.js';
import { FEATURED_DEMO_STORES } from './demoStores.js';

/** @param {string} photoId @param {number} [w] */
function unsplash(photoId, w = 900) {
  return buildUnsplashImageUrl(photoId, { w, q: 82 });
}

/** Autostore.pk archive heroes — aligned with `/store/demo-autoparts` slides */
const AUTOPARTS_SHOWROOM_HERO = AUTO_PARTS_DEFAULT_SLIDES[0]?.image || '';
const AUTOPARTS_PARTS_CATALOG_HERO = AUTO_PARTS_DEFAULT_SLIDES[3]?.image || '';

/** @type {Record<string, { vertical: string; icon: string; heroImage: string; logo?: string; backgroundColor: string; glowGradient: string; glowColor: string }>} */
const GALLERY_OVERRIDES = {
  'demo-boutique': {
    vertical: 'Fashion & boutique',
    icon: 'shirt',
    heroImage: fashionStockImage('1441984904996-e0b6ba687e04', 1000),
    backgroundColor: 'bg-gradient-to-br from-stone-900 via-rose-950 to-black',
    glowGradient: '#0c0a09',
    glowColor: 'rgba(12, 10, 9, 0.35)',
  },
  'demo-jewellery': {
    vertical: 'Gems & jewellery',
    icon: 'gem',
    heroImage: jewelleryStockImage('1515562141207-7a88fb7ce338', 1000),
    backgroundColor: 'bg-gradient-to-br from-amber-800 via-yellow-900 to-stone-950',
    glowGradient: '#b45309',
    glowColor: 'rgba(180, 83, 9, 0.35)',
  },
  'demo-restaurant': {
    vertical: 'Restaurant & BBQ',
    icon: 'utensils-crossed',
    heroImage: 'https://services.eatx.pk/ProductImages/11ab6a62-06db-49bd-9c60-b8c1f12dd5d5.jpeg',
    backgroundColor: 'bg-gradient-to-br from-red-900 via-rose-950 to-black',
    glowGradient: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.35)',
  },
  'demo-pharmacy': {
    vertical: 'Pharmacy',
    icon: 'pill',
    heroImage: unsplash('1576091160399-112ba8d25d1d', 1920),
    backgroundColor: 'bg-gradient-to-br from-emerald-600 via-teal-800 to-emerald-950',
    glowGradient: '#16a34a',
    glowColor: 'rgba(22, 163, 74, 0.35)',
  },
  'demo-supermarket': {
    vertical: 'Supermarket & grocery',
    icon: 'shopping-basket',
    heroImage: 'https://www.dsmonline.pk/media/wysiwyg/fifa_banner_new.jpeg',
    backgroundColor: 'bg-gradient-to-br from-orange-500 via-amber-700 to-orange-950',
    glowGradient: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.35)',
  },
  'demo-fmcg': {
    vertical: 'FMCG & grocery',
    icon: 'shopping-basket',
    heroImage: 'https://www.dsmonline.pk/media/wysiwyg/fifa_banner_new.jpeg',
    backgroundColor: 'bg-gradient-to-br from-orange-500 via-amber-700 to-orange-950',
    glowGradient: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.35)',
  },
  'demo-hardware': {
    vertical: 'Hardware & building',
    icon: 'wrench',
    heroImage: unsplash('1581578735548-049c48d88d70', 1200),
    backgroundColor: 'bg-gradient-to-br from-sky-800 via-slate-800 to-slate-950',
    glowGradient: '#0369a1',
    glowColor: 'rgba(3, 105, 161, 0.35)',
  },
  'demo-bakery': {
    vertical: 'Bakery & confectionery',
    icon: 'croissant',
    heroImage: unsplash('1555507036-ab1f4038808a', 1200),
    backgroundColor: 'bg-gradient-to-br from-orange-600 via-amber-700 to-orange-950',
    glowGradient: '#c2410c',
    glowColor: 'rgba(194, 65, 12, 0.35)',
  },
  'demo-electronics': {
    vertical: 'Electronics',
    icon: 'monitor',
    heroImage: unsplash('1498049794561-7780e7231661'),
    backgroundColor: 'bg-gradient-to-br from-indigo-600 via-violet-800 to-indigo-950',
    glowGradient: '#4f46e5',
    glowColor: 'rgba(79, 70, 229, 0.35)',
  },
  'demo-mobile': {
    vertical: 'Mobile & devices',
    icon: 'smartphone',
    heroImage: unsplash('1511707171634-5f897ff02aa9'),
    backgroundColor: 'bg-gradient-to-br from-teal-700 via-cyan-900 to-teal-950',
    glowGradient: '#0f766e',
    glowColor: 'rgba(15, 118, 110, 0.35)',
  },
  'demo-salon': {
    vertical: 'Salon & spa',
    icon: 'scissors',
    heroImage: unsplash('1560066984-138d9834df73'),
    backgroundColor: 'bg-gradient-to-br from-fuchsia-700 via-purple-900 to-fuchsia-950',
    glowGradient: '#a21caf',
    glowColor: 'rgba(162, 28, 175, 0.35)',
  },
  'demo-furniture': {
    vertical: 'Furniture & home',
    icon: 'sofa',
    heroImage: 'https://comfy.sg/cdn/shop/files/comfy-sofa-singapore.webp?width=1200',
    backgroundColor: 'bg-gradient-to-br from-amber-900 via-stone-800 to-stone-950',
    glowGradient: '#92400e',
    glowColor: 'rgba(146, 64, 14, 0.35)',
  },
  'demo-fitness': {
    vertical: 'Gym & fitness',
    marketingName: 'Fitness Demo',
    icon: 'dumbbell',
    heroImage: FITNESS_ASSETS.heroAthlete,
    slideTheme: 'dark',
    heroObjectFit: 'object-contain',
    heroObjectPosition: 'object-bottom',
    slideBackdropClass: 'bg-zinc-950',
    backgroundColor: 'bg-gradient-to-br from-rose-950 via-zinc-900 to-black',
    glowGradient: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.4)',
  },
  'demo-autoparts': {
    vertical: 'Auto parts',
    icon: 'car',
    heroImage: AUTOPARTS_PARTS_CATALOG_HERO,
    backgroundColor: 'bg-gradient-to-br from-red-700 via-zinc-900 to-black',
    glowGradient: '#cd232a',
    glowColor: 'rgba(205, 35, 42, 0.4)',
  },
  'demo-showroom': {
    vertical: 'Vehicle dealership',
    icon: 'car-front',
    heroImage: AUTOPARTS_SHOWROOM_HERO,
    logo: '/storefront/tenvo-car-dealership-tcd.svg',
    backgroundColor: 'bg-gradient-to-br from-zinc-800 via-neutral-900 to-black',
    glowGradient: '#111827',
    glowColor: 'rgba(17, 24, 39, 0.45)',
  },
  'demo-sgcarmart': {
    vertical: 'Tenvo Auto Marketplace',
    marketingName: 'Tenvo Auto Marketplace',
    icon: 'store',
    heroImage: 'https://images.unsplash.com/photo-1619405399517-d7fdef856543?w=1920&q=85&auto=format&fit=crop',
    backgroundColor: 'bg-gradient-to-br from-red-600 via-red-800 to-red-950',
    glowGradient: '#E30613',
    glowColor: 'rgba(227, 6, 19, 0.4)',
  },
};

/**
 * @param {string} hex
 * @param {number} alpha
 */
function hexToGlow(hex, alpha = 0.35) {
  const raw = String(hex || '').replace('#', '');
  if (raw.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * @returns {Array<{
 *   key: string;
 *   name: string;
 *   domain: string;
 *   country: string;
 *   href: string;
 *   tier: 'full' | 'showcase';
 *   vertical: string;
 *   description: string;
 *   city: string;
 *   icon: string;
 *   heroImage: string;
 *   logo?: string;
 *   backgroundColor: string;
 *   glowGradient: string;
 *   glowColor: string;
 * }>}
 */
export function getFeaturedDemoGalleryItems() {
  const byDomain = new Map(
    FEATURED_DEMO_STORES.map((store) => {
      const seed = ALL_DEMO_SEEDS.find((s) => s.domain === store.domain);
      const domainKey = seed?.key || store.key;
      const profile = getDemoStorefrontProfile(domainKey);
      const override = GALLERY_OVERRIDES[store.domain] || {};
      const accent = profile.accentColor || override.glowGradient || '#6366f1';

      return [
        store.domain,
        {
          ...store,
          name: override.marketingName || store.name,
          vertical: override.vertical || store.name,
          description: profile.description,
          city: profile.city || store.country,
          icon: override.icon || 'store',
          heroImage:
            override.heroImage || profile.cover_image_url || unsplash('1441984904996-e0b6ba687e04'),
          slideTheme: override.slideTheme || 'light',
          heroObjectFit: override.heroObjectFit || 'object-cover',
          heroObjectPosition: override.heroObjectPosition || 'object-center',
          slideBackdropClass: override.slideBackdropClass || 'bg-slate-100',
          logo: override.logo || profile.logo_url || undefined,
          backgroundColor: override.backgroundColor || 'bg-gradient-to-br from-indigo-600 to-violet-900',
          glowGradient: override.glowGradient || accent,
          glowColor: override.glowColor || hexToGlow(accent),
        },
      ];
    })
  );

  return FEATURED_DEMO_STORES.map((store) => byDomain.get(store.domain)).filter(Boolean);
}

/** Demos hidden from full-screen hero until storefronts are launch-ready. */
export const HERO_EXCLUDED_DEMO_DOMAINS = new Set([
  'demo-mobile',
  'demo-electronics',
  'demo-solar',
  'demo-hardware',
  'demo-salon',
]);

/** Featured demos eligible for the homepage hero flip carousel. */
export function getHeroDemoGalleryItems() {
  return getFeaturedDemoGalleryItems().filter((store) => !HERO_EXCLUDED_DEMO_DOMAINS.has(store.domain));
}

/**
 * Hero image for a demo storefront domain (marketing sections).
 * @param {string} domain e.g. `demo-boutique`
 */
export function getDemoStoreHeroByDomain(domain) {
  const seed = ALL_DEMO_SEEDS.find((s) => s.domain === domain);
  if (!seed) return '';
  const profile = getDemoStorefrontProfile(seed.key);
  const override = GALLERY_OVERRIDES[domain] || {};
  return override.heroImage || profile.cover_image_url || unsplash('1441984904996-e0b6ba687e04');
}

/**
 * @param {string} domain
 */
export function getDemoStoreHref(domain) {
  return `/store/${domain}`;
}
