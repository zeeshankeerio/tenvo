/**
 * Maps registration / demo slugs to canonical domainKnowledge keys.
 * Keeps hub URLs like `textile` wired to the correct vertical preset.
 */
export const DOMAIN_KEY_ALIASES = Object.freeze({
  textile: 'textile-wholesale',
  apparel: 'garments',
  clothing: 'garments',
  'clothing-store': 'garments',
  restaurant: 'restaurant-cafe',
  cafe: 'restaurant-cafe',
  'hardware-store': 'hardware-sanitary',
  hardware: 'hardware-sanitary',
  electronics: 'electronics-goods',
  mobile: 'mobile-phone-shop',
  clinic: 'dental-clinic',
  salon: 'salon-spa',
  spa: 'salon-spa',
  bakery: 'bakery-confectionery',
  grocery: 'supermarket',
  jewellery: 'gems-jewellery',
  jewelry: 'gems-jewellery',
  boutique: 'boutique-fashion',
  vet: 'veterinary-clinic',
  veterinary: 'veterinary-clinic',
  dealership: 'vehicle-dealership',
  vincar: 'vehicle-dealership',
  sehgal: 'vehicle-dealership',
  'sehgal-motorsports': 'vehicle-dealership',
  showroom: 'vehicle-dealership',
  'tenvo-vehicles': 'vehicle-dealership',
  'car-dealer': 'vehicle-dealership',
  'auto-dealer': 'vehicle-dealership',
  'car-marketplace': 'auto-marketplace',
  sgcarmart: 'auto-marketplace',
  'auto-marketplace': 'auto-marketplace',
  'fitness-gym': 'gym-fitness',
  gym: 'gym-fitness',
});

/**
 * @param {string} category
 * @returns {string}
 */
export function resolveDomainKey(category) {
  const key = String(category || '').trim();
  if (!key) return 'retail-shop';
  if (DOMAIN_KEY_ALIASES[key]) return DOMAIN_KEY_ALIASES[key];
  return key;
}

/**
 * @param {string} category
 * @returns {boolean}
 */
export function isKnownDomainKey(category) {
  const resolved = resolveDomainKey(category);
  return resolved !== 'retail-shop' || category === 'retail-shop' || category === '';
}
