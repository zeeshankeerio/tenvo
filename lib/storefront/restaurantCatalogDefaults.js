/**
 * Static marketing defaults for elevated restaurant / kitchen storefronts.
 */

export const RESTAURANT_THEME = {
  accent: '#dc2626',
  accentDark: '#991b1b',
  promoBar: '#dc2626',
  cream: '#fafafa',
};

/** Demo homepage spotlight — four Roll Inn category cards (eatx CDN). */
export const RESTAURANT_DEMO_SPOTLIGHT_CARDS = [
  {
    id: 'bbq',
    title: 'BBQ & grills',
    subtitle: 'Tikka, boti, and karahi specials',
    image: 'https://services.eatx.pk/CategoryImages/d27eaddf-be36-4430-ba9c-e0337d487193.jpeg',
    href: '?category=bbq',
  },
  {
    id: 'biryani',
    title: 'Biryani & rice',
    subtitle: 'Handi biryani and classic rice dishes',
    image: 'https://services.eatx.pk/CategoryImages/659d7eda-e5b0-4f77-bec8-d074a5ea1bec.jpeg',
    href: '?category=biryani',
  },
  {
    id: 'rolls',
    title: 'Signature rolls',
    subtitle: 'Behari, malai, and crispy rolls',
    image: 'https://services.eatx.pk/CategoryImages/fd8f69a1-7949-4325-825d-78d1ee1964a5.jpeg',
    href: '?category=rolls',
  },
  {
    id: 'deals',
    title: 'Deals & combos',
    subtitle: 'Value meals and bundle savings',
    image: 'https://services.eatx.pk/CategoryImages/f0cad0aa-4102-41ad-8bca-b0a08cbe6efa.jpeg',
    href: '?onSale=true',
  },
];

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
    id: 'bbq',
    title: 'BBQ & grills',
    image: 'https://services.eatx.pk/CategoryImages/d27eaddf-be36-4430-ba9c-e0337d487193.jpeg',
    href: '?category=bbq',
  },
  {
    id: 'biryani',
    title: 'Biryani & rice',
    image: 'https://services.eatx.pk/CategoryImages/659d7eda-e5b0-4f77-bec8-d074a5ea1bec.jpeg',
    href: '?category=biryani',
  },
  {
    id: 'rolls',
    title: 'Signature rolls',
    image: 'https://services.eatx.pk/CategoryImages/fd8f69a1-7949-4325-825d-78d1ee1964a5.jpeg',
    href: '?category=rolls',
  },
  {
    id: 'deals',
    title: "Today's deals",
    image: 'https://services.eatx.pk/CategoryImages/f0cad0aa-4102-41ad-8bca-b0a08cbe6efa.jpeg',
    href: '?onSale=true',
  },
];
