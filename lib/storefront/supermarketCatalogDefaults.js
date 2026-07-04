/**
 * Default supermarket homepage catalog — extracted from archive references
 * (supper-store.html / supper-store-reference.html — Naheed.pk & DSM Clifton).
 * Used when tenant has no custom banners/categories; live inventory overrides product rails.
 */

const DSM = 'https://www.dsmonline.pk/media/wysiwyg';
const DSM_CAT = 'https://www.dsmonline.pk/media/wysiwyg/categories';
const NAHEED = 'https://media.naheed.pk';

/** Naheed-style orange + DSM green accents for elevated supermarket chrome */
export const SUPERMARKET_THEME = {
  accent: '#f97316',
  accentDark: '#c2410c',
  accentLight: '#fff7ed',
  promoBar: '#ea580c',
};

export const SUPERMARKET_DELIVERY_NOTICE =
  'Delivery timings are from 10:00 AM to 9:00 PM. Orders are delivered within your service area.';

export const SUPERMARKET_PROMO_STRIP = {
  label: 'Free delivery on larger baskets',
  href: '/products',
};

/** Hero carousel — DSM Clifton + Naheed (auto-rotating archive banners) */
export const SUPERMARKET_DEFAULT_HERO_SLIDES = [
  {
    eyebrow: 'Weekly savings',
    title: 'Mega food offers',
    subtitle: 'Bundle deals on beverages, snacks, and pantry staples.',
    image: `${NAHEED}/homeslider_slides/g/r/grocery-banner_3.jpg`,
    ctaLabel: 'Shop deals',
    ctaHref: '/products?onSale=true',
  },
  {
    eyebrow: 'Fresh arrivals',
    title: 'Seasonal mangoes',
    subtitle: 'Farm-fresh Dasheri and Chaunsa — limited seasonal stock.',
    image: `${DSM}/MANGO_BANNER.png`,
    ctaLabel: 'Browse fresh',
    ctaHref: '/products?category=fresh-produce',
  },
  {
    eyebrow: 'Protein & snacks',
    title: 'Nutrilov range',
    subtitle: 'High-protein bars and choco almond favourites.',
    image: `${DSM}/nutrilov.png`,
    ctaLabel: 'Shop Nutrilov',
    ctaHref: '/products?search=nutrilov',
  },
  {
    eyebrow: 'Kids & toys',
    title: 'Pretty playtime',
    subtitle: 'Toys, games, and summer holiday picks for kids.',
    image: `${DSM}/preety_playtime.png`,
    ctaLabel: 'Shop toys',
    ctaHref: '/products?category=toys',
  },
  {
    eyebrow: 'Beauty',
    title: 'Maybelline eyes',
    subtitle: 'Mascara, liner, and eye makeup bestsellers.',
    image: `${DSM}/mabelline_new_eyes_11.png`,
    ctaLabel: 'Shop beauty',
    ctaHref: '/products?category=personal-care',
  },
  {
    eyebrow: 'The grocery spot',
    title: 'Everything for your home',
    subtitle: 'From breakfast to household — one cart, delivered fast.',
    image: `${NAHEED}/homeslider_slides/g/r/grocery-banner_3.jpg`,
    ctaLabel: 'Start shopping',
    ctaHref: '/products',
  },
  {
    eyebrow: 'New launch',
    title: 'One Skin',
    subtitle: 'Dermatologist-inspired daily skincare essentials.',
    image: `${NAHEED}/homeslider_slides/n/e/new_launch_alert_1360_x_280_px_.png`,
    ctaLabel: 'Discover',
    ctaHref: '/products?search=one+skin',
  },
  {
    eyebrow: 'Laundry',
    title: 'Surf Excel',
    subtitle: 'Stain removal and fabric care for the whole family.',
    image: `${NAHEED}/homeslider_slides/s/u/surf_excel_foc1360x280.png`,
    ctaLabel: 'Shop household',
    ctaHref: '/products?category=household',
  },
  {
    eyebrow: 'K-Beauty',
    title: 'Korean beauty edit',
    subtitle: 'Serums, masks, and trending K-beauty brands.',
    image: `${NAHEED}/homeslider_slides/k/-/k-beauty-2026.png`,
    ctaLabel: 'Explore K-Beauty',
    ctaHref: '/products?search=k-beauty',
  },
];

/** Popular categories — square tiles (Naheed hot categories, 6-up desktop) */
export const SUPERMARKET_POPULAR_CATEGORIES = [
  {
    id: 'groceries',
    label: 'Groceries & Pets',
    slug: 'grocery',
    image: `${NAHEED}/apphome_categories/g/r/groceries_petscopmcopm.jpg`,
  },
  {
    id: 'health-beauty',
    label: 'Health & Beauty',
    slug: 'personal-care',
    image: `${NAHEED}/apphome_categories/h/e/health-_-beauty_2025copmcopm.jpg`,
  },
  {
    id: 'new-arrivals',
    label: 'New Arrivals',
    slug: '',
    hrefSuffix: '?sort=newest',
    image: `${NAHEED}/apphome_categories/i/c/icon.jpg`,
  },
  {
    id: 'k-beauty',
    label: 'K-Beauty',
    slug: 'personal-care',
    hrefSuffix: '?search=k-beauty',
    image: `${NAHEED}/apphome_categories/2/k/2k-beauty_1_.png`,
  },
  {
    id: 'deals-day',
    label: 'Deals of the Day',
    slug: '',
    hrefSuffix: '?onSale=true',
    image: `${NAHEED}/apphome_categories/6/6/6606_1_.jpg`,
  },
  {
    id: 'kitchen',
    label: 'Kitchen Appliances',
    slug: 'electronics',
    hrefSuffix: '?category=kitchen',
    image: `${NAHEED}/apphome_categories/k/i/kitchen-appliances_1.jpg`,
  },
  {
    id: 'fragrances',
    label: 'Fragrances',
    slug: 'personal-care',
    hrefSuffix: '?search=fragrance',
    image: `${NAHEED}/apphome_categories/f/r/fragrances_1000_1__1.jpg`,
  },
  {
    id: 'beverages',
    label: 'Beverages',
    slug: 'beverages',
    image: `${DSM_CAT}/Beverages_Banner_offer.png`,
  },
];

/** Left sidebar department tree (Naheed + DSM taxonomy, simplified) */
export const SUPERMARKET_SIDEBAR_DEPARTMENTS = [
  {
    id: 'fresh',
    label: 'Fresh Products',
    slug: 'fresh-produce',
    children: [
      { id: 'fruits', label: 'Fruits', slug: 'fruits' },
      { id: 'vegetables', label: 'Vegetables', slug: 'vegetables' },
      { id: 'meat', label: 'Meat & Poultry', slug: 'meat' },
      { id: 'seafood', label: 'Seafood', slug: 'seafood' },
    ],
  },
  {
    id: 'frozen',
    label: 'Frozen',
    slug: 'frozen',
    children: [
      { id: 'frozen-chicken', label: 'Frozen Chicken', slug: 'frozen-chicken' },
      { id: 'frozen-snacks', label: 'Nuggets & Snacks', slug: 'frozen-snacks' },
    ],
  },
  {
    id: 'dairy',
    label: 'Dairy',
    slug: 'dairy',
    children: [
      { id: 'milk', label: 'Milk & Drinks', slug: 'milk' },
      { id: 'cheese', label: 'Cheese & Cream', slug: 'cheese' },
      { id: 'yoghurt', label: 'Yoghurt', slug: 'yoghurt' },
    ],
  },
  {
    id: 'staples',
    label: 'Food Staples',
    slug: 'food-staples',
    children: [
      { id: 'rice', label: 'Rice & Flour', slug: 'rice' },
      { id: 'oil', label: 'Cooking Oil & Ghee', slug: 'cooking-oil' },
      { id: 'spices', label: 'Spices & Recipes', slug: 'spices' },
    ],
  },
  {
    id: 'beverages',
    label: 'Beverages',
    slug: 'beverages',
  },
  {
    id: 'snacks',
    label: 'Chocolates & Snacks',
    slug: 'snacks',
  },
  {
    id: 'household',
    label: 'Household & Laundry',
    slug: 'household',
  },
  {
    id: 'personal-care',
    label: 'Beauty & Personal Care',
    slug: 'personal-care',
  },
  {
    id: 'baby',
    label: 'Kids & Babies',
    slug: 'baby',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    slug: 'pharmacy',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    slug: 'electronics',
  },
  {
    id: 'deals',
    label: 'Deals & Offers',
    slug: '',
    hrefSuffix: '?onSale=true',
  },
];

/** Brand marquee — Naheed trending + DSM Clifton round brand icons */
export const SUPERMARKET_DEFAULT_BRANDS = [
  { id: 'maybelline', label: 'Maybelline', image: `${DSM_CAT}/mabelline_round.png`, hrefSuffix: '?search=maybelline' },
  { id: 'garnier', label: 'Garnier', image: `${DSM_CAT}/garnier_round.png`, hrefSuffix: '?search=garnier' },
  { id: 'unilever', label: 'Unilever', image: `${DSM_CAT}/unilever_round.png`, hrefSuffix: '?search=unilever' },
  { id: 'cool-cool', label: 'Cool & Cool', image: `${DSM_CAT}/coolncool_round.png`, hrefSuffix: '?search=cool' },
  { id: 'anex', label: 'Anex', image: `${NAHEED}/homepagetool_homepagetool/a/n/anex_23.jpg`, hrefSuffix: '?search=anex' },
  { id: 'walls', label: "Wall's", image: `${NAHEED}/homepagetool_homepagetool/w/a/walls_4.jpg`, hrefSuffix: '?search=walls' },
  { id: 'loreal', label: "L'Oreal Paris", image: `${NAHEED}/homepagetool_homepagetool/l/o/loreal40logo_3.jpg`, hrefSuffix: '?search=loreal' },
  { id: 'dettol', label: 'Dettol', image: `${NAHEED}/homepagetool_homepagetool/d/e/dettol_440x160_copy_2.jpg`, hrefSuffix: '?search=dettol' },
  { id: 'saeed-ghani', label: 'Saeed Ghani', image: `${DSM_CAT}/saeed_ghani_round.png`, hrefSuffix: '?search=saeed' },
  { id: 'conatural', label: 'CoNatural', image: `${DSM_CAT}/conatural_round.png`, hrefSuffix: '?search=conatural' },
  { id: 'rivaj', label: 'Rivaj', image: `${DSM_CAT}/rivaj_round.png`, hrefSuffix: '?search=rivaj' },
  { id: 'nestle', label: 'Nestlé', image: `${NAHEED}/homepagetool_homepagetool/u/n/unilever_11.jpg`, hrefSuffix: '?search=nestle' },
];

/** Mid-page promo tile grid (DSM category banners) */
export const SUPERMARKET_PROMO_TILES = [
  {
    id: 'stationery',
    title: 'Stationery',
    subtitle: 'School & office supplies',
    image: `${DSM_CAT}/Stationary_1.png`,
    href: '?category=stationery',
  },
  {
    id: 'skincare',
    title: 'Skin Care',
    subtitle: 'Derma & daily care',
    image: `${DSM_CAT}/Skin_care_banner.png`,
    href: '?category=skin-care',
  },
  {
    id: 'snacks-deals',
    title: 'Snacks & treats',
    subtitle: 'Limited-time bundles',
    image: `${DSM_CAT}/Beverages_Banner_offer.png`,
    href: '?onSale=true',
  },
  {
    id: 'keychains',
    title: 'Accessories',
    subtitle: 'Gifts & add-ons',
    image: `${DSM_CAT}/Keychain_banner1.png`,
    href: '?category=accessories',
  },
  {
    id: 'fragrance',
    title: 'Fragrance',
    subtitle: 'Embrace the season',
    image: `${DSM_CAT}/EMBRANCE_BANNER.png`,
    href: '?category=fragrance',
  },
  {
    id: 'beverages-offer',
    title: 'Beverages',
    subtitle: 'Chilled drinks & more',
    image: `${DSM_CAT}/Beverages_Banner_offer.png`,
    href: '?category=beverages',
  },
];

/** Naheed-style upper promo tiles */
export const SUPERMARKET_UPPER_PROMO_TILES = [
  {
    id: 'bebelle',
    title: 'Bebelle',
    image: `${NAHEED}/homepagetool_homepagetool/n/a/naheed_regular_-_tile_3.png`,
    href: '?search=bebelle',
  },
  {
    id: 'centrum',
    title: 'Centrum',
    image: `${NAHEED}/homepagetool_homepagetool/c/e/centrum_may_asset_1_naheed_440x160_1.jpg`,
    href: '?search=centrum',
  },
  {
    id: 'neutrogena',
    title: 'Neutrogena',
    image: `${NAHEED}/homepagetool_homepagetool/s/i/size_440_x_160-01_1__2.png`,
    href: '?search=neutrogena',
  },
  {
    id: 'garnier-tile',
    title: 'Garnier',
    image: `${NAHEED}/homepagetool_homepagetool/g/a/garnier_june_tile_440_x_160_1.png`,
    href: '?search=garnier',
  },
];

/**
 * Homepage product rails — titles from DSM Clifton archive.
 * @type {Array<{ id: string; title: string; subtitle?: string; href: string; partition: 'deals' | 'topSellers' | 'fresh' }>}
 */
export const SUPERMARKET_HOME_RAILS = [
  {
    id: 'mega-food',
    title: 'Mega Food Offer',
    subtitle: 'Bundle savings on food & beverages',
    href: '?onSale=true',
    partition: 'deals',
  },
  {
    id: 'mega-non-food',
    title: 'Mega Non-Food Offer',
    subtitle: 'Personal care, household & more',
    href: '?onSale=true',
    partition: 'topSellers',
  },
  {
    id: 'moharram',
    title: 'Moharram Essentials',
    subtitle: 'Haleem mixes, dates, and pantry staples',
    href: '?category=food-staples',
    partition: 'deals',
  },
  {
    id: 'summer-glow',
    title: 'Summer Glow',
    subtitle: 'Skincare and sun-ready personal care',
    href: '?category=personal-care',
    partition: 'fresh',
  },
  {
    id: 'dsm-fruits',
    title: 'DSM Fruits',
    subtitle: 'Seasonal mangoes, apples, and more',
    href: '?category=fresh-produce',
    partition: 'fresh',
  },
  {
    id: 'dsm-vegetables',
    title: 'DSM Vegetables',
    subtitle: 'Farm-fresh greens and daily produce',
    href: '?category=fresh-produce',
    partition: 'fresh',
  },
  {
    id: 'sweet-corner',
    title: 'Sweet Corner',
    subtitle: 'Desserts, khurma, and sweet treats',
    href: '?category=bakery',
    partition: 'deals',
  },
  {
    id: 'pharmacy-rail',
    title: 'Pharmacy',
    subtitle: 'OTC, vitamins, and wellness',
    href: '?category=pharmacy',
    partition: 'topSellers',
  },
  {
    id: 'home-appliances',
    title: 'Home Appliances',
    subtitle: 'Kitchen gadgets and small appliances',
    href: '?category=electronics',
    partition: 'topSellers',
  },
  {
    id: 'fresh-picks',
    title: 'Fresh Picks',
    subtitle: 'Produce, dairy & bakery favourites',
    href: '?sort=newest',
    partition: 'fresh',
  },
  {
    id: 'household',
    title: 'Household Essentials',
    subtitle: 'Laundry, cleaners & daily needs',
    href: '?category=household',
    partition: 'topSellers',
  },
  {
    id: 'cook-save',
    title: 'Cook & Save',
    subtitle: 'Kitchen appliances & cookware deals',
    href: '?category=kitchen',
    partition: 'deals',
  },
  {
    id: 'season-top',
    title: "Season's Top Picks",
    subtitle: 'Customer favourites this season',
    href: '?sort=popularity',
    partition: 'topSellers',
  },
  {
    id: 'hydrate-skin',
    title: 'Hydrate Your Skin',
    subtitle: 'Skincare & personal care',
    href: '?category=personal-care',
    partition: 'fresh',
  },
];

/** Mid-page banner row (Naheed midimage-blocks) */
export const SUPERMARKET_MID_PROMO_TILES = [
  {
    id: 'garnier-mid',
    title: 'Garnier',
    image: `${NAHEED}/homepagetool_homepagetool/g/a/garnier_june_tile_440_x_160_1.png`,
    href: '?search=garnier',
  },
  {
    id: 'dettol-mid',
    title: 'Dettol',
    image: `${NAHEED}/homepagetool_homepagetool/d/e/dettol_440x160_copy_2.jpg`,
    href: '?search=dettol',
  },
  {
    id: 'walkeaze',
    title: 'Walkeaze',
    image: `${NAHEED}/homepagetool_homepagetool/w/a/walkeaze_june_440x160--naheed.jpg`,
    href: '?search=walkeaze',
  },
  {
    id: 'centrum-mid',
    title: 'Centrum',
    image: `${NAHEED}/homepagetool_homepagetool/c/e/centrum_may_asset_1_naheed_440x160_1.jpg`,
    href: '?search=centrum',
  },
];

/** Configurable homepage section headings */
export const SUPERMARKET_DEFAULT_SECTION_TITLES = {
  popularCategories: 'Popular Categories',
  trendingNow: 'Trending Now',
  shopByOffer: 'Shop by Offer',
  weeklyEssentials: 'Weekly essentials, one tap away',
  deliveryBanner: 'Free delivery on larger baskets',
};

/** Header sub-navigation (Naheed top taxonomy strip) */
export const SUPERMARKET_DEFAULT_SUB_NAV = [
  { id: 'mother-baby', label: 'Mother & Baby', slug: 'baby' },
  { id: 'beauty', label: 'Beauty', slug: 'personal-care' },
  { id: 'fragrances', label: 'Fragrances', slug: 'personal-care', hrefSuffix: '?search=fragrance' },
  { id: 'grocery', label: 'Grocery', slug: 'grocery' },
  { id: 'pharmacy', label: 'Pharmacy', slug: 'pharmacy' },
  { id: 'electronics', label: 'Electronics', slug: 'electronics' },
  { id: 'deals', label: 'Deals', slug: '', hrefSuffix: '?onSale=true' },
];

/** Footer trust strip (Naheed store-info bar) */
export const SUPERMARKET_FOOTER_TRUST = [
  { id: 'shipping', label: 'Free Shipping', desc: 'On qualifying orders', icon: 'truck' },
  { id: 'returns', label: 'Easy Returns', desc: 'Hassle-free policy', icon: 'refresh' },
  { id: 'cod', label: 'Payment on Delivery', desc: 'Pay when it arrives', icon: 'credit' },
  { id: 'support', label: 'Customer Support', desc: 'We are here to help', icon: 'shield' },
];

/** Homepage trust strip (above categories) */
export const SUPERMARKET_HOME_TRUST_PILLARS = [
  { id: 'fresh', label: 'Fresh daily', desc: 'Produce restocked every morning' },
  { id: 'delivery', label: 'Fast delivery', desc: 'Same-day slots in your area' },
  { id: 'prices', label: 'Best prices', desc: 'Honest value on everyday items' },
  { id: 'cod', label: 'COD & wallets', desc: 'Pay how you prefer at checkout' },
];
