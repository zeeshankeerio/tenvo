/**
 * Rich imagery and copy for vertical preset slides on domain package pages.
 * Merged with `content.verticalPresets` at render time.
 */
import { fashionStockImage } from '@/lib/dataLab/fashionDemoImages.js';
import { buildUnsplashImageUrl } from '@/lib/storefront/unsplashUrl.js';
import { AUTO_PARTS_DEFAULT_SLIDES } from '@/lib/storefront/autoPartsArchiveMap.js';
import { FITNESS_ASSETS } from '@/lib/storefront/fitnessStorefront.js';
import { getDemoStoreHeroByDomain } from '@/lib/marketing/demoStoreGalleryMeta.js';

/** @param {string} photoId @param {number} [w] */
function unsplash(photoId, w = 1920) {
  return buildUnsplashImageUrl(photoId, { w, q: 85 });
}

/** @type {Record<string, { heroImage: string, icon: string, bullets: string[], accent?: string }>} */
export const VERTICAL_PRESET_SLIDE_META = Object.freeze({
  garments: {
    heroImage: fashionStockImage('1441984904996-e0b6ba687e04', 1920),
    icon: 'Shirt',
    bullets: ['Size/color variant matrix', 'Seasonal collections & lookbooks', 'Storefront, POS, and wholesale stock sync'],
    accent: '#be123c',
  },
  'boutique-fashion': {
    heroImage: fashionStockImage('1556905055-8f358a7a47b2', 1920),
    icon: 'Gem',
    bullets: ['Designer collections & stitching types', 'Luxury storefront templates', 'Appointment-led boutique flows'],
    accent: '#7c3aed',
  },
  'textile-wholesale': {
    heroImage: fashionStockImage('1469334031218-e382a71b716b', 1920),
    icon: 'Layers',
    bullets: ['Thaan, article, and broker fields', 'B2B price lists & credit limits', 'Multi-warehouse roll tracking'],
    accent: '#059669',
  },
  'textile-mill': {
    heroImage: fashionStockImage('1617137968427-85924c800a22', 1920),
    icon: 'Factory',
    bullets: ['Fabric production & BOM', 'Batch rolls and quality grades', 'Mill-to-wholesale fulfilment'],
    accent: '#0369a1',
  },
  pharmacy: {
    heroImage: unsplash('1576091160399-112ba8d25d1d'),
    icon: 'Pill',
    bullets: ['Expiry-aware batch inventory', 'OTC catalog & delivery thresholds', 'Counter POS with GST receipts'],
    accent: '#059669',
  },
  'auto-parts': {
    heroImage: AUTO_PARTS_DEFAULT_SLIDES[3]?.image || unsplash('1492144534655-ae79c964c9d7'),
    icon: 'Cog',
    bullets: ['Vehicle-aware parts finder hero', 'OEM filters & multi-brand catalog', 'Trade counter + workshop accounts'],
    accent: '#dc2626',
  },
  'vehicle-dealership': {
    heroImage: AUTO_PARTS_DEFAULT_SLIDES[0]?.image || unsplash('1492144534655-ae79c964c9d7'),
    icon: 'CarFront',
    bullets: ['Vehicle listings with booking CTAs', 'Test drives & lead nurture', 'Parts and accessories e-shop'],
    accent: '#111827',
  },
  furniture: {
    heroImage: 'https://comfy.sg/cdn/shop/files/comfy-sofa-singapore.webp?width=1920',
    icon: 'Sofa',
    bullets: ['Room-inspired collection pages', 'Showroom quotes & deposits', 'Delivery challans & reservations'],
    accent: '#92400e',
  },
  'gym-fitness': {
    heroImage: FITNESS_ASSETS.heroAthlete,
    icon: 'Dumbbell',
    bullets: [
      'Archive supplement catalog with real product photos',
      'Membership tiers and PT class packs',
      'Tenant booking URLs on elevated storefront',
    ],
    accent: '#e11d48',
  },
});

/**
 * @param {Array<{ key: string, label: string, desc: string }>} presets
 * @param {string} [fallbackHero]
 */
export function enrichVerticalPresetSlides(presets, fallbackHero = '') {
  if (!Array.isArray(presets)) return [];
  return presets.map((preset) => {
    const meta = VERTICAL_PRESET_SLIDE_META[preset.key] || {};
    return {
      ...preset,
      heroImage: meta.heroImage || fallbackHero || unsplash('1441984904996-e0b6ba687e04'),
      icon: meta.icon || 'Store',
      bullets: meta.bullets?.length ? meta.bullets : [preset.desc],
      accent: meta.accent || '#6366f1',
    };
  });
}

/** Channel carousel backgrounds per suite (index matches channelPillars order). */
export const PACKAGE_CHANNEL_HERO_IMAGES = Object.freeze({
  'clothing-commerce': [
    fashionStockImage('1441984904996-e0b6ba687e04', 1920),
    fashionStockImage('1556905055-8f358a7a47b2', 1920),
    fashionStockImage('1469334031218-e382a71b716b', 1920),
  ],
  'pharmacy-commerce': [
    unsplash('1584308666744-24d5c474f2ae'),
    unsplash('1576091160399-112ba8d25d1d'),
    unsplash('1579684385127-1ef15d508118'),
  ],
  'auto-parts-commerce': [
    AUTO_PARTS_DEFAULT_SLIDES[3]?.image || unsplash('1492144534655-ae79c964c9d7'),
    AUTO_PARTS_DEFAULT_SLIDES[1]?.image || unsplash('1486262715619-67b85e44308f'),
    unsplash('1586528116311-ad8dd3c8310d'),
  ],
  'vehicle-showroom': [
    AUTO_PARTS_DEFAULT_SLIDES[0]?.image || unsplash('1492144534655-ae79c964c9d7'),
    unsplash('1503376780353-7ebb837afccc'),
    unsplash('1486262715619-67b85e44308f'),
  ],
  'furniture-commerce': [
    'https://comfy.sg/cdn/shop/files/comfy-sofa-singapore.webp?width=1920',
    unsplash('1555041469-a586c61ea9bc'),
    unsplash('1586023492125-27b2c045efd7'),
  ],
  'fitness-commerce': [
    FITNESS_ASSETS.heroAthlete,
    'https://www.synergize.pk/wp-content/uploads/2026/06/xtend-whey-30-pakistan.png',
    FITNESS_ASSETS.programStrength,
  ],
});

/**
 * Hero slide backgrounds for domain package showcase (intro + channel pillars).
 * @param {import('@/lib/config/domainPackages').DomainPackageDefinition} pkg
 * @param {{ heroEyebrow?: string, channelPillars?: Array<{ title: string, body: string, icon: string }> }} content
 */
export function buildPackageHeroSlides(pkg, content) {
  const fallback = pkg.demoStoreDomain ? getDemoStoreHeroByDomain(pkg.demoStoreDomain) : '';
  const channelHeroes = PACKAGE_CHANNEL_HERO_IMAGES[pkg.key] || [];
  const slides = [];

  slides.push({
    id: 'intro',
    kind: 'intro',
    eyebrow: content?.heroEyebrow || pkg.pricing?.badge || 'Vertical commerce suite',
    title: pkg.name,
    body: pkg.summary,
    heroImage: fallback || unsplash('1441984904996-e0b6ba687e04'),
    accent: '#6366f1',
  });

  for (const [i, pillar] of (content?.channelPillars || []).entries()) {
    slides.push({
      id: `channel-${pillar.title}`,
      kind: 'channel',
      eyebrow: 'How you sell',
      title: pillar.title,
      body: pillar.body,
      heroImage: channelHeroes[i] || fallback || unsplash('1498049794561-7780e7231661'),
      icon: pillar.icon,
      accent: '#6366f1',
    });
  }

  return slides;
}

/**
 * Single hero carousel: suite intro, channel pillars, then registration vertical presets.
 * @param {import('@/lib/config/domainPackages').DomainPackageDefinition} pkg
 * @param {{ channelPillars?: Array<{ title: string, body: string, icon: string }>, verticalPresets?: Array<{ key: string, label: string, desc: string }> }} content
 * @param {ReturnType<typeof enrichVerticalPresetSlides>} [enrichedVerticalSlides]
 */
export function buildUnifiedPackageSlides(pkg, content, enrichedVerticalSlides = []) {
  const heroSlides = buildPackageHeroSlides(pkg, content);
  const verticalSlides = (enrichedVerticalSlides || []).map((preset) => ({
    id: `vertical-${preset.key}`,
    kind: 'vertical',
    key: preset.key,
    eyebrow: 'Registration preset',
    title: preset.label,
    body: preset.desc,
    heroImage: preset.heroImage,
    icon: preset.icon,
    bullets: preset.bullets,
    accent: preset.accent,
  }));
  return [...heroSlides, ...verticalSlides];
}
