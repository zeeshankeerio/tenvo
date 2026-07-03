/**
 * Domain-aware copy and trust items for public storefront footers.
 */
import { getDomainConfig, resolveStorefrontVertical } from '@/lib/config/storefrontDomains';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { formatCurrency } from '@/lib/currency';

/** @param {string} icon */
function trustSubtitle(icon, { freeShippingThreshold, returnDays, currency, vertical }) {
  switch (icon) {
    case 'truck':
      return freeShippingThreshold > 0
        ? `On orders over ${formatCurrency(freeShippingThreshold, currency)}`
        : 'Fast & reliable delivery';
    case 'shield':
    case 'lock':
      return 'Encrypted secure checkout';
    case 'refresh':
      return returnDays > 0 ? `${returnDays}-day hassle-free returns` : 'See returns policy';
    case 'clock':
      return vertical === 'restaurant-cafe' ? 'Hot & fresh to your door' : 'Same-day dispatch available';
    case 'leaf':
      return vertical === 'supermarket' ? 'Sourced fresh daily' : 'Quality assured';
    case 'star':
      return 'Curated for your needs';
    case 'tag':
      return 'Best prices guaranteed';
    case 'user':
      return 'Licensed professionals';
    case 'gift':
      return 'Custom & bulk orders';
    case 'credit':
      return 'Cards, bank transfer & COD';
    default:
      return '';
  }
}

const PAYMENT_LABEL = {
  pharmacy: 'Cards, bank transfer & COD',
  supermarket: 'Cards, wallets & COD',
  'restaurant-cafe': 'Cards, wallets & COD',
  'hardware-parts': 'Cards, bank transfer & COD',
  'fashion-clothing': 'Cards, bank transfer & COD',
  'electronics-tech': 'Cards & secure online pay',
  'retail-shop': 'Cards, bank transfer & COD',
};

const SHOP_HEADING = {
  supermarket: 'Aisles',
  'restaurant-cafe': 'Menu',
  'bakery-confectionery': 'Bakes',
  pharmacy: 'Shop',
  'fashion-clothing': 'Shop',
  'electronics-tech': 'Tech',
  'hardware-parts': 'Catalog',
};

const SHOP_HEADING_CANONICAL = {
  'dental-clinic': 'Services',
  'clinics-healthcare': 'Services',
  'diagnostic-lab': 'Tests',
  'veterinary-clinic': 'Pet care',
  'salon-spa': 'Services',
  'mobile-phone-shop': 'Devices',
  'solar-energy': 'Solutions',
};

/**
 * @param {{
 *   business?: Record<string, unknown> | null,
 *   settings?: Record<string, unknown> | null,
 *   currency?: string,
 * }} args
 */
export function getStoreFooterCopy({ business, settings, currency = 'PKR' }) {
  const canonical = resolveDomainKey(business?.category);
  const domainCfg = getDomainConfig(canonical);
  const vertical = resolveStorefrontVertical(canonical);
  const storeName = business?.business_name?.trim() || 'Our Store';

  const freeShippingThreshold = Number(settings?.freeShippingThreshold) || 2000;
  const returnDays = Number(settings?.returnPolicyDays) || 7;

  const trustBadges = (domainCfg.trustBadges || []).slice(0, 4).map((badge) => ({
    icon: badge.icon,
    title: badge.title,
    subtitle:
      badge.subtitle ||
      trustSubtitle(badge.icon, { freeShippingThreshold, returnDays, currency, vertical }),
  }));

  if (trustBadges.length < 4) {
    trustBadges.push({
      icon: 'credit',
      title: 'Flexible Payment',
      subtitle: PAYMENT_LABEL[vertical] || PAYMENT_LABEL.pharmacy,
    });
  }

  const tagline =
    (typeof business?.description === 'string' && business.description.trim()) ||
    (typeof settings?.heroSubtitle === 'string' && settings.heroSubtitle.trim()) ||
    domainCfg.heroSubtitle ||
    `Quality products from ${storeName}. Secure checkout and reliable service.`;

  return {
    storeName,
    vertical,
    tagline,
    trustBadges,
    freeShippingThreshold,
    returnDays,
    newsletterTitle: 'Stay in the loop',
    newsletterBody: `Offers and new arrivals from ${storeName}.`,
    shopHeading: SHOP_HEADING_CANONICAL[canonical] || SHOP_HEADING[vertical] || 'Shop',
    supportHeading: 'Customer care',
    paymentLabel: PAYMENT_LABEL[vertical] || 'Cards, bank transfer & COD',
  };
}
