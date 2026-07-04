/**
 * Static marketing defaults for elevated restaurant / kitchen storefronts.
 */
import { buildUnsplashImageUrl } from '@/lib/storefront/unsplashUrl';

const tileImg = (id) => buildUnsplashImageUrl(id, { w: 960, q: 82 });

export const RESTAURANT_THEME = {
  accent: '#603cba',
  accentDark: '#4c2d9a',
  promoBar: '#603cba',
  cream: '#f2f2f2',
};

export const RESTAURANT_DELIVERY_NOTICE = 'Order online · Fresh meals · Delivery & pickup';

export const RESTAURANT_DEFAULT_SUB_NAV = [
  { id: 'menu', label: 'Full menu', hrefSuffix: '/products' },
  { id: 'deals', label: 'Deals', hrefSuffix: '/products?onSale=true' },
  { id: 'combos', label: 'Combos', hrefSuffix: '/products?search=combo' },
  { id: 'contact', label: 'Catering', hrefSuffix: '/contact' },
];

/** Wide promo tiles shown below trust strip (4-up on desktop). */
export const RESTAURANT_UPPER_PROMO_TILES = [
  {
    id: 'pizza',
    title: 'Wood-fired pizzas',
    image: tileImg('1504674900247-0877df9cc836'),
    href: '?search=pizza',
  },
  {
    id: 'bbq',
    title: 'BBQ & grills',
    image: tileImg('1607623814075-e51df1bdc82f'),
    href: '?search=grill',
  },
  {
    id: 'biryani',
    title: 'Biryani & rice',
    image: tileImg('1563379091339-03b21ab4a4f8'),
    href: '?search=biryani',
  },
  {
    id: 'deals',
    title: 'Today\'s deals',
    image: tileImg('1414235077428-338989a2e8c0'),
    href: '?onSale=true',
  },
];
