/**
 * Business-aware copy for single-tenant public storefronts.
 * Each registered business gets its own store, avoid marketplace-style labels.
 */

/**
 * @param {{ business_name?: string }} business
 * @param {{ featuredSectionTitle?: string; newArrivalsSectionTitle?: string; ctaLabel?: string }} domainCfg
 * @param {{ gridTitle?: string; categoryHeading?: string; vertical?: string; canonical?: string }} [landing]
 */
export function getStoreHomeCopy(business, domainCfg = {}, landing = {}) {
  const name = business?.business_name?.trim() || 'Our Store';

  const verticalHints = {
    pharmacy: { onSaleTitle: 'Best Deals', onSaleSubtitle: 'Save on wellness essentials' },
    'fashion-clothing': { onSaleTitle: 'Sale', onSaleSubtitle: 'Seasonal styles at special prices' },
    'luxury-fashion': { onSaleTitle: 'Exclusive offers', onSaleSubtitle: 'Limited pieces & bridal promotions' },
    supermarket: { onSaleTitle: 'Today\'s Deals', onSaleSubtitle: 'Groceries & pantry at great prices' },
    'hardware-parts': { onSaleTitle: 'Hot Deals', onSaleSubtitle: 'Parts and accessories on offer' },
    'restaurant-cafe': { onSaleTitle: 'Combo Deals', onSaleSubtitle: 'Bundle & save on meals' },
    'retail-shop': { onSaleTitle: 'Special Offers', onSaleSubtitle: 'Limited-time deals' },
  };
  const canonicalHints = {
    'dental-clinic': { onSaleTitle: 'Care packages', onSaleSubtitle: 'Treatment bundles & promotions' },
    'textile-wholesale': { onSaleTitle: 'Wholesale deals', onSaleSubtitle: 'Seasonal fabric promotions' },
    'hardware-sanitary': { onSaleTitle: 'Trade deals', onSaleSubtitle: 'Tools & sanitary offers' },
    'bakery-confectionery': { onSaleTitle: 'Daily specials', onSaleSubtitle: 'Fresh bakes & combo offers' },
    'mobile-phone-shop': { onSaleTitle: 'Phone deals', onSaleSubtitle: 'Devices & bundle offers' },
    'electronics-goods': { onSaleTitle: 'Tech deals', onSaleSubtitle: 'Electronics & appliance offers' },
    'boutique-fashion': { onSaleTitle: 'Designer sale', onSaleSubtitle: 'Limited-edition styles' },
    'gems-jewellery': { onSaleTitle: 'Jewellery offers', onSaleSubtitle: 'Gold & bridal promotions' },
    'clinics-healthcare': { onSaleTitle: 'Health packages', onSaleSubtitle: 'Checkups & wellness bundles' },
    'diagnostic-lab': { onSaleTitle: 'Test packages', onSaleSubtitle: 'Lab panels & checkups' },
    'veterinary-clinic': { onSaleTitle: 'Pet care offers', onSaleSubtitle: 'Services & nutrition deals' },
    'salon-spa': { onSaleTitle: 'Service packages', onSaleSubtitle: 'Hair, skin & spa bundles' },
    'solar-energy': { onSaleTitle: 'Solar bundles', onSaleSubtitle: 'Panels, inverters & kits' },
  };
  const hints = canonicalHints[landing.canonical] || verticalHints[landing.vertical] || {};

  const heroCtaByVertical = {
    'restaurant-cafe': 'Order Now',
    'bakery-confectionery': 'Order Fresh',
    pharmacy: domainCfg.ctaLabel || 'Browse Medicines',
    'fashion-clothing': domainCfg.ctaLabel || 'Shop Collection',
    'luxury-fashion': domainCfg.ctaLabel || 'Explore Collection',
    supermarket: domainCfg.ctaLabel || 'Start Shopping',
    'hardware-parts': domainCfg.ctaLabel || 'Shop Parts',
    'electronics-tech': domainCfg.ctaLabel || 'Explore Tech',
    'retail-shop': domainCfg.ctaLabel || 'Shop Now',
  };
  const heroCtaByCanonical = {
    'salon-spa': 'Book Now',
    'diagnostic-lab': 'Book Test',
    'veterinary-clinic': 'Book Visit',
    'clinics-healthcare': 'Book Visit',
    'dental-clinic': 'Book Appointment',
    'solar-energy': 'Get Quote',
  };

  return {
    storeName: name,
    categoryHeading: landing.categoryHeading || 'Shop by Category',
    featuredTitle: landing.gridTitle || domainCfg.featuredSectionTitle || 'Featured Products',
    featuredSubtitle: `Curated picks from ${name}`,
    newArrivalsTitle: domainCfg.newArrivalsSectionTitle || 'New Arrivals',
    newArrivalsSubtitle: `Just added at ${name}`,
    onSaleTitle: hints.onSaleTitle || 'Special Offers',
    onSaleSubtitle: hints.onSaleSubtitle || `Limited-time deals at ${name}`,
    shopAllTitle: `Shop ${name}`,
    shopAllSubtitle: 'Browse the full catalog',
    emptyTitle: 'Products Coming Soon',
    emptyBody: `${name} is setting up the catalog. Check back soon or get in touch.`,
    searchPlaceholder: `Search ${name}…`,
    heroCta: heroCtaByCanonical[landing.canonical] || heroCtaByVertical[landing.vertical] || domainCfg.ctaLabel || 'Shop Now',
  };
}
