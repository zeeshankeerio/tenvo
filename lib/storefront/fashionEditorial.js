/**
 * Zellbury-inspired editorial hero + navigation for clothing / fashion storefronts.
 * @see https://zellbury.com/
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { resolveStorefrontVertical } from '@/lib/config/storefrontDomains';
import { isLuxuryFashionStore, getLuxuryFashionVariant } from './luxuryFashion';

/** Domains that use the editorial hero + transparent nav pattern. */
export const FASHION_EDITORIAL_CANONICALS = new Set([
  'boutique-fashion',
  'textile-wholesale',
  'garments',
  'leather-footwear',
  'gems-jewellery',
]);

/**
 * @param {string | null | undefined} category
 */
export function isFashionEditorialStore(category) {
  const canonical = resolveDomainKey(category);
  if (FASHION_EDITORIAL_CANONICALS.has(canonical)) return true;
  if (isLuxuryFashionStore(category)) return true;
  const vertical = resolveStorefrontVertical(canonical);
  return vertical === 'fashion-clothing' || vertical === 'luxury-fashion';
}

/**
 * @typedef {object} EditorialSlide
 * @property {string} eyebrow
 * @property {string} title
 * @property {string} subtitle
 * @property {string} image
 * @property {string} ctaLabel
 * @property {string} ctaHref
 * @property {number} [rating]
 * @property {string} [ratingText]
 * @property {string} [promoTag]
 */

/**
 * @param {string} base `/store/{domain}`
 * @param {string} canonical
 * @returns {EditorialSlide[]}
 */
export function getFashionEditorialSlides(base, canonical) {
  const products = `${base}/products`;
  const variant = getLuxuryFashionVariant(canonical) || 'boutique';

  /** @type {Record<string, EditorialSlide[]>} */
  const byVariant = {
    boutique: [
      {
        eyebrow: 'Loved by 100,000+ Women',
        title: 'Ready-to-Wear, Ready to Style',
        subtitle: 'Effortless styles designed for your everyday glow, no stitching, no waiting.',
        image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Pret',
        ctaHref: `${products}?sort=newest`,
        rating: 4.8,
        ratingText: 'from 70,000+ reviews',
        promoTag: 'New arrivals',
      },
      {
        eyebrow: 'Premium Embroidery',
        title: 'Elegance in Every Stitch',
        subtitle: 'Intricate embroidery and luxurious fabrics, timeless sophistication for every occasion.',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Discover Luxury Pret',
        ctaHref: `${products}?sort=featured`,
        rating: 4.8,
        ratingText: 'from 30,500+ luxury shoppers',
        promoTag: 'Luxury pret',
      },
      {
        eyebrow: 'Trusted by Modern Gentlemen',
        title: 'Tradition Tailored to Perfection',
        subtitle: 'Classic eastern wear redefined with modern cuts, elevated details, and unmatched comfort.',
        image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Men Eastern',
        ctaHref: `${products}?category=eastern-wear`,
        rating: 4.8,
        ratingText: 'from 100,000+ satisfied customers',
        promoTag: 'Men',
      },
      {
        eyebrow: 'Premium Fabrics, Trusted Quality',
        title: 'Your Style, Your Stitch',
        subtitle: 'Clean contrasts, premium fabrics, and effortless sophistication, tailor every look your way.',
        image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Monochrome',
        ctaHref: `${products}?category=unstitched`,
        rating: 4.9,
        ratingText: 'from 20,000+ happy customers',
        promoTag: 'Monochrome',
      },
      {
        eyebrow: 'Trusted by Modern Men',
        title: 'Built for Everyday Style',
        subtitle: 'Smart fits and effortless essentials for work, weekends, and everything in between.',
        image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Men',
        ctaHref: `${products}?category=shirts`,
        rating: 4.7,
        ratingText: 'from 10,000+ reviews',
        promoTag: 'Menswear',
      },
      {
        eyebrow: 'Loved by Stylish Moms',
        title: 'Tiny Styles, Big Smiles',
        subtitle: 'Comfortable, playful, and adorable outfits designed for every little moment.',
        image: 'https://images.unsplash.com/photo-1503454537847-ef5213cf0b8a?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Kids',
        ctaHref: `${products}?category=kids`,
        rating: 4.9,
        ratingText: 'from 11,000+ happy parents',
        promoTag: 'Kids',
      },
    ],
    textile: [
      {
        eyebrow: 'Premium Fabrics, Trusted Quality',
        title: 'Your Style, Your Stitch',
        subtitle: 'Clean contrasts, premium fabrics, and effortless sophistication, tailor every look your way.',
        image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Fabrics',
        ctaHref: `${products}?category=lawn`,
        rating: 4.9,
        ratingText: 'from 20,000+ happy customers',
        promoTag: 'Lawn',
      },
      {
        eyebrow: 'Wholesale excellence',
        title: 'Trending Textures & Colours',
        subtitle: 'Digital lawn, khaddar, and bridal ranges trusted by retailers nationwide.',
        image: 'https://images.unsplash.com/photo-1583292650118-0c8d2f9a9f2d?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Browse Collection',
        ctaHref: products,
        rating: 4.8,
        ratingText: 'from 15,000+ retailers',
        promoTag: 'Khaddar',
      },
    ],
    leather: [
      {
        eyebrow: 'Crafted leather',
        title: 'Step Into Quality',
        subtitle: 'Hand-finished shoes, bags, and belts, durable materials with refined details.',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Footwear',
        ctaHref: `${products}?category=footwear`,
        rating: 4.7,
        ratingText: 'from 10,000+ reviews',
        promoTag: 'Footwear',
      },
      {
        eyebrow: 'New season',
        title: 'Built for Everyday Style',
        subtitle: 'Smart fits and effortless essentials for work, weekends, and everything in between.',
        image: 'https://images.unsplash.com/photo-1520639882103-d7964dc5a26a?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Leather',
        ctaHref: `${products}?category=leather`,
        rating: 4.8,
        ratingText: 'from 8,500+ shoppers',
        promoTag: 'Leather',
      },
    ],
    jewellery: [
      {
        eyebrow: 'Fine jewellery',
        title: 'Timeless Pieces, Crafted to Last',
        subtitle: 'Certified gold, diamonds, and bridal sets, hallmarked quality with insured delivery.',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Shop Gold',
        ctaHref: `${products}?category=gold`,
        rating: 4.9,
        ratingText: 'from 12,000+ buyers',
        promoTag: 'Gold',
      },
      {
        eyebrow: 'Bridal heritage',
        title: 'Celebrate Every Milestone',
        subtitle: 'Wedding sets, engagement rings, and heirloom designs for your special day.',
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1600&q=82&auto=format&fit=crop',
        ctaLabel: 'Explore Bridal',
        ctaHref: `${products}?category=bridal`,
        rating: 4.9,
        ratingText: 'from 5,000+ bridal clients',
        promoTag: 'Bridal',
      },
    ],
  };

  return byVariant[variant] || byVariant.boutique;
}

/**
 * @typedef {{ id: string; label: string; icon: string; href: string }} NavCategory
 * @typedef {{ id: string; label: string; categories: NavCategory[] }} NavTab
 */

/**
 * @param {string} base
 * @param {string} canonical
 * @param {Array<{ slug: string; name: string }>} [storeCategories]
 * @returns {{ tabs: NavTab[]; promos: Array<{ title: string; subtitle?: string; href: string; image: string }> }}
 */
export function getFashionEditorialNav(base, canonical, storeCategories = []) {
  const products = `${base}/products`;
  const slides = getFashionEditorialSlides(base, canonical);
  const promos = slides.slice(0, 2).map((s) => ({
    title: s.promoTag || s.ctaLabel,
    subtitle: s.eyebrow,
    href: s.ctaHref,
    image: s.image,
  }));

  const fromStore = storeCategories.slice(0, 8).map((c) => ({
    id: c.slug,
    label: c.name,
    icon: 'shirt',
    href: `${products}?category=${encodeURIComponent(c.slug)}`,
  }));

  if (fromStore.length >= 4) {
    return {
      promos,
      tabs: [{ id: 'shop', label: 'Shop', categories: fromStore }],
    };
  }

  const variant = getLuxuryFashionVariant(canonical) || 'boutique';

  /** @type {Record<string, NavTab[]>} */
  const presetTabs = {
    boutique: [
      {
        id: 'women',
        label: 'Women',
        categories: [
          { id: 'pret', label: 'Ready To Wear', icon: 'sparkles', href: `${products}?sort=newest` },
          { id: 'unstitched', label: 'Unstitched', icon: 'package', href: `${products}?category=unstitched` },
          { id: 'formal', label: 'Formal', icon: 'gift', href: `${products}?category=formal` },
          { id: 'accessories', label: 'Accessories', icon: 'star', href: `${products}?category=accessories` },
          { id: 'fragrance', label: 'Fragrance', icon: 'droplet', href: `${products}?category=fragrance` },
          { id: 'outerwear', label: 'Outerwear', icon: 'shirt', href: `${products}?category=outerwear` },
        ],
      },
      {
        id: 'men',
        label: 'Men',
        categories: [
          { id: 'eastern', label: 'Eastern Wear', icon: 'shirt', href: `${products}?category=eastern-wear` },
          { id: 'tees', label: 'T-Shirts', icon: 'tag', href: `${products}?category=t-shirts` },
          { id: 'shirts', label: 'Shirts', icon: 'shirt', href: `${products}?category=shirts` },
          { id: 'bottoms', label: 'Bottoms', icon: 'package', href: `${products}?category=bottoms` },
          { id: 'unstitched-m', label: 'Unstitched', icon: 'package', href: `${products}?category=unstitched` },
          { id: 'accessories-m', label: 'Accessories', icon: 'star', href: `${products}?category=accessories` },
        ],
      },
      {
        id: 'kids',
        label: 'Kids',
        categories: [
          { id: 'boys', label: 'Boys', icon: 'shirt', href: `${products}?category=boys` },
          { id: 'girls', label: 'Girls', icon: 'sparkles', href: `${products}?category=girls` },
        ],
      },
    ],
    textile: [
      {
        id: 'fabrics',
        label: 'Fabrics',
        categories: [
          { id: 'lawn', label: 'Lawn', icon: 'sparkles', href: `${products}?category=lawn` },
          { id: 'cotton', label: 'Cotton', icon: 'shirt', href: `${products}?category=cotton` },
          { id: 'khaddar', label: 'Khaddar', icon: 'package', href: `${products}?category=khaddar` },
          { id: 'bridal', label: 'Bridal', icon: 'gift', href: `${products}?category=bridal-collection` },
          { id: 'unstitched', label: 'Unstitched', icon: 'package', href: `${products}?category=unstitched` },
          { id: 'sale', label: 'Deals', icon: 'tag', href: `${products}?onSale=true` },
        ],
      },
      {
        id: 'men',
        label: 'Men',
        categories: [
          { id: 'mens-cotton', label: 'Cotton', icon: 'shirt', href: `${products}?category=cotton` },
          { id: 'mens-unstitched', label: 'Unstitched', icon: 'package', href: `${products}?category=unstitched` },
        ],
      },
      {
        id: 'women',
        label: 'Women',
        categories: [
          { id: 'w-lawn', label: 'Lawn', icon: 'sparkles', href: `${products}?category=lawn` },
          { id: 'w-bridal', label: 'Bridal', icon: 'gift', href: `${products}?category=bridal-collection` },
        ],
      },
    ],
    leather: [
      {
        id: 'shop',
        label: 'Shop',
        categories: [
          { id: 'footwear', label: 'Footwear', icon: 'shirt', href: `${products}?category=footwear` },
          { id: 'leather', label: 'Leather Goods', icon: 'package', href: `${products}?category=leather` },
          { id: 'new', label: 'New In', icon: 'sparkles', href: `${products}?sort=newest` },
          { id: 'sale', label: 'Sale', icon: 'tag', href: `${products}?onSale=true` },
        ],
      },
    ],
    jewellery: [
      {
        id: 'collections',
        label: 'Collections',
        categories: [
          { id: 'gold', label: 'Gold', icon: 'star', href: `${products}?category=gold` },
          { id: 'diamonds', label: 'Diamonds', icon: 'sparkles', href: `${products}?category=diamonds` },
          { id: 'bridal', label: 'Bridal', icon: 'gift', href: `${products}?category=bridal` },
          { id: 'gifts', label: 'Gifts', icon: 'package', href: `${products}?sort=featured` },
        ],
      },
    ],
  };

  return { tabs: presetTabs[variant] || presetTabs.boutique, promos };
}
