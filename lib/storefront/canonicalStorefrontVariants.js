/**
 * Per-canonical-domain hero + landing variants for storefronts beyond the 8 demo pack.
 * Keys match `resolveDomainKey(category)` / domainKnowledge slugs.
 */

/** @typedef {{ slides: object[]; shortcuts?: object[]; searchPlaceholder?: string; trendingTerms?: string[]; tiles?: object[]; accentLabel?: string }} HeroVariant */
/** @typedef {object} LandingPatch */

/** @type {Record<string, HeroVariant>} */
export const CANONICAL_HERO_VARIANTS = {
  'clinics-healthcare': {
    slides: [
      {
        title: 'Healthcare you can trust',
        subtitle: 'Consultations, diagnostics, and wellness, book online.',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1600&q=82&auto=format&fit=crop',
      },
    ],
    shortcuts: [
      { id: 'consult', label: 'Consultations', slug: 'consultation', icon: 'heart' },
      { id: 'diagnostics', label: 'Diagnostics', slug: 'diagnostics', icon: 'activity' },
      { id: 'wellness', label: 'Wellness', slug: 'wellness', icon: 'leaf' },
      { id: 'contact', label: 'Book visit', slug: '', icon: 'phone', href: 'contact' },
    ],
    searchPlaceholder: 'Search services, specialists, packages…',
    trendingTerms: ['Consultation', 'Checkup', 'Lab tests', 'Vaccination'],
  },
  'diagnostic-lab': {
    slides: [
      {
        title: 'Accurate lab testing',
        subtitle: 'Blood work, imaging, and health panels, fast turnaround.',
        image: 'https://images.unsplash.com/photo-1579154204601-01588f351e24?w=1600&q=82&auto=format&fit=crop',
      },
    ],
    shortcuts: [
      { id: 'blood', label: 'Blood tests', slug: 'hematology', icon: 'activity' },
      { id: 'bio', label: 'Biochemistry', slug: 'biochemistry', icon: 'leaf' },
      { id: 'imaging', label: 'Imaging', slug: 'imaging', icon: 'thermometer' },
      { id: 'book', label: 'Book test', slug: '', icon: 'phone', href: 'contact' },
    ],
    searchPlaceholder: 'Search tests, panels, packages…',
    trendingTerms: ['CBC', 'Blood sugar', 'Lipid profile', 'Thyroid'],
  },
  'veterinary-clinic': {
    slides: [
      {
        title: 'Care for every pet',
        subtitle: 'Consultations, grooming products, and pet wellness essentials.',
        image: 'https://images.unsplash.com/photo-1450778869188-41d060ede37d?w=1600&q=82&auto=format&fit=crop',
      },
    ],
    shortcuts: [
      { id: 'consult', label: 'Consultation', slug: 'consultation', icon: 'heart' },
      { id: 'grooming', label: 'Grooming', slug: 'grooming', icon: 'sparkles' },
      { id: 'nutrition', label: 'Nutrition', slug: 'nutrition', icon: 'leaf' },
      { id: 'contact', label: 'Book visit', slug: '', icon: 'phone', href: 'contact' },
    ],
    searchPlaceholder: 'Search pet care, food, services…',
    trendingTerms: ['Checkup', 'Vaccination', 'Pet food', 'Grooming'],
  },
  'mobile-phone-shop': {
    slides: [
      {
        title: 'Latest smartphones & accessories',
        subtitle: 'Official warranty · Genuine devices · Fast delivery.',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1600&q=82&auto=format&fit=crop',
      },
    ],
    shortcuts: [
      { id: 'phones', label: 'Phones', slug: 'phones', icon: 'phone' },
      { id: 'audio', label: 'Audio', slug: 'audio', icon: 'headphones' },
      { id: 'accessories', label: 'Accessories', slug: 'accessories', icon: 'package' },
      { id: 'deals', label: 'Deals', slug: '', icon: 'tag', href: 'onSale' },
    ],
    searchPlaceholder: 'Search phones, brands, accessories…',
    trendingTerms: ['Samsung', 'iPhone', 'Earbuds', 'Charger'],
  },
  'computer-hardware': {
    slides: [
      {
        title: 'Computers & components',
        subtitle: 'Laptops, desktops, peripherals, and networking gear.',
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&q=82&auto=format&fit=crop',
      },
    ],
    shortcuts: [
      { id: 'laptops', label: 'Laptops', slug: 'laptops', icon: 'package' },
      { id: 'components', label: 'Components', slug: 'components', icon: 'zap' },
      { id: 'peripherals', label: 'Peripherals', slug: 'peripherals', icon: 'headphones' },
      { id: 'networking', label: 'Networking', slug: 'networking', icon: 'wifi' },
    ],
    searchPlaceholder: 'Search laptops, GPUs, keyboards…',
    trendingTerms: ['Laptop', 'SSD', 'Monitor', 'Keyboard'],
  },
  'solar-energy': {
    slides: [
      {
        title: 'Solar power solutions',
        subtitle: 'Panels, inverters, batteries, and installation essentials.',
        image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&q=82&auto=format&fit=crop',
      },
    ],
    shortcuts: [
      { id: 'panels', label: 'Panels', slug: 'panels', icon: 'zap' },
      { id: 'inverters', label: 'Inverters', slug: 'inverters', icon: 'package' },
      { id: 'batteries', label: 'Batteries', slug: 'batteries', icon: 'battery' },
      { id: 'accessories', label: 'Accessories', slug: 'accessories', icon: 'wrench' },
    ],
    searchPlaceholder: 'Search solar panels, inverters…',
    trendingTerms: ['Panel', 'Inverter', 'Battery', 'Mounting'],
  },
  'mobile-repairing': {
    slides: [
      {
        title: 'Mobile repair & parts',
        subtitle: 'Screens, batteries, and accessories, quality parts for every model.',
        image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1600&q=82&auto=format&fit=crop',
      },
    ],
    shortcuts: [
      { id: 'screens', label: 'Screens', slug: 'screens', icon: 'phone' },
      { id: 'batteries', label: 'Batteries', slug: 'batteries', icon: 'zap' },
      { id: 'parts', label: 'Parts', slug: 'parts', icon: 'package' },
      { id: 'repair', label: 'Book repair', slug: '', icon: 'wrench', href: 'contact' },
    ],
    searchPlaceholder: 'Search parts by model or brand…',
    trendingTerms: ['Screen', 'Battery', 'Charging port', 'Back glass'],
  },
  'boutique-fashion': {
    tiles: [
      { label: 'New In', hrefSuffix: '?sort=newest', desc: 'Latest arrivals' },
      { label: 'Designer', hrefSuffix: '?sort=featured', desc: 'Curated picks' },
      { label: 'Sale', hrefSuffix: '?onSale=true', desc: 'Limited offers' },
      { label: 'Accessories', hrefSuffix: '?category=accessories', desc: 'Complete the look' },
    ],
  },
  'gems-jewellery': {
    tiles: [
      { label: 'Gold', hrefSuffix: '?category=gold', desc: 'Rings & sets' },
      { label: 'Diamonds', hrefSuffix: '?category=diamonds', desc: 'Fine jewellery' },
      { label: 'Bridal', hrefSuffix: '?category=bridal', desc: 'Wedding sets' },
      { label: 'Gifts', hrefSuffix: '?sort=featured', desc: 'Occasion picks' },
    ],
  },
  'leather-footwear': {
    tiles: [
      { label: 'Footwear', hrefSuffix: '?category=footwear', desc: 'Shoes & sandals' },
      { label: 'Leather', hrefSuffix: '?category=leather', desc: 'Bags & belts' },
      { label: 'New', hrefSuffix: '?sort=newest', desc: 'Latest styles' },
      { label: 'Sale', hrefSuffix: '?onSale=true', desc: 'Seasonal deals' },
    ],
  },
  'salon-spa': {
    slides: [
      {
        title: 'Salon & spa services',
        subtitle: 'Hair, skin, nails, and professional retail, book your appointment.',
        image: 'https://images.unsplash.com/photo-1560066984-138d7434da07?w=1600&q=82&auto=format&fit=crop',
      },
    ],
    shortcuts: [
      { id: 'hair', label: 'Hair', slug: 'hair-services', icon: 'sparkles' },
      { id: 'skin', label: 'Skin', slug: 'skin-services', icon: 'leaf' },
      { id: 'nails', label: 'Nails', slug: 'nail-services', icon: 'gift' },
      { id: 'retail', label: 'Products', slug: 'retail-products', icon: 'package' },
    ],
    searchPlaceholder: 'Search services, packages, products…',
    trendingTerms: ['Haircut', 'Facial', 'Manicure', 'Keratin'],
  },
};

/**
 * Resolve hero shortcuts with base path.
 * @param {HeroVariant | undefined} variant
 * @param {string} base `/store/domain/products`
 */
export function resolveHeroShortcuts(variant, base) {
  if (!variant?.shortcuts) return [];
  const contactBase = base.replace(/\/products$/, '');
  return variant.shortcuts.map((s) => {
    if (s.href === 'contact') return { ...s, href: `${contactBase}/contact` };
    if (s.href === 'onSale') return { ...s, href: `${base}?onSale=true` };
    if (s.slug) return { ...s, href: `${base}?category=${encodeURIComponent(s.slug)}` };
    return s;
  });
}

/**
 * @param {string} canonical
 * @param {string} base `/store/{domain}`
 * @returns {LandingPatch | null}
 */
export function getExtendedCanonicalLanding(canonical, base) {
  const products = `${base}/products`;
  /** @type {Record<string, LandingPatch>} */
  const map = {
    'bakery-confectionery': {
      categoryHeading: 'Fresh bakes',
      gridTitle: 'Today\'s bakes',
      dealStrip: {
        badge: 'Fresh daily',
        title: 'Artisan breads, cakes & pastries',
        subtitle: 'Baked this morning · Custom orders welcome',
        cta: 'Order fresh',
        href: products,
      },
      servicePills: ['Baked fresh daily', 'Custom cakes', 'Same-day pickup', 'Hygienic kitchen'],
      quickActions: [
        { id: 'cakes', label: 'Cakes', href: `${products}?category=cakes`, icon: 'gift', description: 'Celebration cakes' },
        { id: 'bread', label: 'Breads', href: `${products}?category=bread`, icon: 'package', description: 'Daily loaves' },
        { id: 'pastries', label: 'Pastries', href: `${products}?category=pastries`, icon: 'sparkles', description: 'Sweet treats' },
        { id: 'custom', label: 'Custom order', href: `${base}/contact`, icon: 'phone', description: 'Events & weddings' },
      ],
      spotlights: [
        {
          id: 'custom-cakes',
          eyebrow: 'Celebrations',
          title: 'Custom cakes for every occasion',
          subtitle: 'Birthdays, weddings, and corporate events, order ahead for fresh delivery.',
          cta: 'Order custom cake',
          href: `${base}/contact`,
          tone: 'accent',
        },
      ],
    },
    'electronics-goods': {
      quickActions: [
        { id: 'featured', label: 'Top picks', href: `${products}?sort=featured`, icon: 'star', description: 'Best sellers' },
        { id: 'tv', label: 'TV & audio', href: `${products}?category=electronics`, icon: 'headphones', description: 'Home entertainment' },
        { id: 'appliances', label: 'Appliances', href: `${products}?category=appliances`, icon: 'package', description: 'Kitchen & home' },
        { id: 'deals', label: 'Deals', href: `${products}?onSale=true`, icon: 'tag', description: 'Limited offers' },
      ],
    },
    'mobile-phone-shop': {
      gridTitle: 'Top phones & gadgets',
      quickActions: [
        { id: 'phones', label: 'Phones', href: `${products}?category=phones`, icon: 'phone', description: 'Latest models' },
        { id: 'audio', label: 'Audio', href: `${products}?category=audio`, icon: 'headphones', description: 'Earbuds & speakers' },
        { id: 'accessories', label: 'Accessories', href: `${products}?category=accessories`, icon: 'package', description: 'Cases & chargers' },
        { id: 'deals', label: 'Deals', href: `${products}?onSale=true`, icon: 'tag', description: 'Bundle offers' },
      ],
    },
    'computer-hardware': {
      gridTitle: 'Computing essentials',
      quickActions: [
        { id: 'laptops', label: 'Laptops', href: `${products}?category=laptops`, icon: 'package', description: 'Work & gaming' },
        { id: 'components', label: 'Components', href: `${products}?category=components`, icon: 'zap', description: 'Build your PC' },
        { id: 'peripherals', label: 'Peripherals', href: `${products}?category=peripherals`, icon: 'headphones', description: 'Keyboards & mice' },
        { id: 'support', label: 'Support', href: `${base}/contact`, icon: 'phone', description: 'Pre-sales help' },
      ],
    },
    'solar-energy': {
      categoryHeading: 'Solar solutions',
      gridTitle: 'Power your home or business',
      quickActions: [
        { id: 'panels', label: 'Panels', href: `${products}?category=panels`, icon: 'zap', description: 'PV modules' },
        { id: 'inverters', label: 'Inverters', href: `${products}?category=inverters`, icon: 'package', description: 'On/off-grid' },
        { id: 'batteries', label: 'Batteries', href: `${products}?category=batteries`, icon: 'star', description: 'Storage' },
        { id: 'quote', label: 'Get quote', href: `${base}/contact`, icon: 'phone', description: 'Site survey' },
      ],
    },
    'boutique-fashion': {
      categoryHeading: 'Designer collections',
      gridTitle: 'Curated style',
      servicePills: ['Designer labels', 'Easy returns', 'Secure checkout', 'Personal styling'],
      spotlights: [
        {
          id: 'seasonal',
          eyebrow: 'New season',
          title: 'Arrivals from curated labels',
          subtitle: 'Luxury pret, formal wear, and statement accessories.',
          cta: 'Shop new in',
          href: `${products}?sort=newest`,
          tone: 'dark',
        },
      ],
    },
    'gems-jewellery': {
      categoryHeading: 'Fine jewellery',
      gridTitle: 'Signature pieces',
      dealStrip: {
        badge: 'Fine jewellery',
        title: 'Gold, diamonds & bridal heritage',
        subtitle: 'Certified quality · Insured shipping · Gift packaging',
        cta: 'Shop signature edit',
        href: `${products}?sort=featured`,
      },
      servicePills: ['Certified gold', 'Insured shipping', 'Gift packaging', 'Hallmark assured'],
      quickActions: [
        { id: 'gold', label: 'Gold', href: `${products}?category=gold`, icon: 'star', description: 'Rings & sets' },
        { id: 'bridal', label: 'Bridal', href: `${products}?category=bridal`, icon: 'gift', description: 'Wedding sets' },
        { id: 'diamonds', label: 'Diamonds', href: `${products}?category=diamonds`, icon: 'sparkles', description: 'Fine cuts' },
        { id: 'gifts', label: 'Gifts', href: `${products}?sort=featured`, icon: 'package', description: 'Occasions' },
      ],
      spotlights: [
        {
          id: 'signature',
          eyebrow: 'Signature edit',
          title: 'Pieces made to be treasured',
          subtitle: 'Hallmarked gold, fine diamonds, and bridal sets with insured delivery.',
          cta: 'Explore jewellery',
          href: `${products}?sort=featured`,
          tone: 'dark',
        },
      ],
    },
    'textile-wholesale': {
      categoryHeading: 'Shop by fabric',
      gridTitle: 'Trending fabrics',
      dealStrip: {
        badge: 'Premium fabrics',
        title: 'Lawn, cotton & bridal collections',
        subtitle: 'Wholesale quality for retailers',
        cta: 'Browse catalog',
        href: products,
      },
      servicePills: ['Wholesale pricing', 'Bulk orders', 'Quality fabrics', 'Nationwide delivery'],
      spotlights: [
        {
          id: 'fabric-edit',
          eyebrow: 'Fabric edit',
          title: 'Textures for every season',
          subtitle: 'Digital lawn, khaddar, and bridal ranges trusted by retailers.',
          cta: 'Shop fabrics',
          href: products,
          tone: 'dark',
        },
      ],
    },
    'leather-footwear': {
      categoryHeading: 'Footwear & leather',
      gridTitle: 'Crafted essentials',
      dealStrip: {
        badge: 'Leather craft',
        title: 'Footwear & leather goods',
        subtitle: 'Genuine leather · Seasonal styles',
        cta: 'Shop collection',
        href: products,
      },
      servicePills: ['Genuine leather', 'Durable craft', 'Easy returns', 'Secure checkout'],
      quickActions: [
        { id: 'shoes', label: 'Footwear', href: `${products}?category=footwear`, icon: 'shirt', description: 'Shoes & sandals' },
        { id: 'leather', label: 'Leather goods', href: `${products}?category=leather`, icon: 'package', description: 'Bags & belts' },
        { id: 'new', label: 'New in', href: `${products}?sort=newest`, icon: 'sparkles', description: 'Latest styles' },
        { id: 'sale', label: 'Sale', href: `${products}?onSale=true`, icon: 'tag', description: 'Seasonal offers' },
      ],
    },
    'clinics-healthcare': {
      categoryHeading: 'Health services',
      gridTitle: 'Popular services',
      servicePills: ['Licensed practitioners', 'Modern facility', 'Secure records', 'Flexible booking'],
      quickActions: [
        { id: 'consult', label: 'Consultations', href: `${products}?category=consultation`, icon: 'heart', description: 'Book a visit' },
        { id: 'diagnostics', label: 'Diagnostics', href: `${products}?category=diagnostics`, icon: 'star', description: 'Tests & scans' },
        { id: 'wellness', label: 'Wellness', href: `${products}?category=wellness`, icon: 'leaf', description: 'Preventive care' },
        { id: 'contact', label: 'Contact clinic', href: `${base}/contact`, icon: 'phone', description: 'Appointments' },
      ],
    },
    'diagnostic-lab': {
      categoryHeading: 'Lab services',
      gridTitle: 'Book a test',
      servicePills: ['Accredited lab', 'Fast turnaround', 'Home collection', 'Digital reports'],
      quickActions: [
        { id: 'blood', label: 'Blood tests', href: `${products}?category=hematology`, icon: 'activity', description: 'CBC & panels' },
        { id: 'bio', label: 'Biochemistry', href: `${products}?category=biochemistry`, icon: 'leaf', description: 'Metabolic panels' },
        { id: 'imaging', label: 'Imaging', href: `${products}?category=imaging`, icon: 'star', description: 'X-ray & ultrasound' },
        { id: 'book', label: 'Book test', href: `${base}/contact`, icon: 'phone', description: 'Schedule sample' },
      ],
    },
    'veterinary-clinic': {
      categoryHeading: 'Pet care',
      gridTitle: 'Services & essentials',
      servicePills: ['Licensed vets', 'Pet-friendly care', 'Quality nutrition', 'Grooming available'],
      quickActions: [
        { id: 'consult', label: 'Consultation', href: `${products}?category=consultation`, icon: 'heart', description: 'Vet visits' },
        { id: 'grooming', label: 'Grooming', href: `${products}?category=grooming`, icon: 'sparkles', description: 'Wash & trim' },
        { id: 'nutrition', label: 'Nutrition', href: `${products}?category=nutrition`, icon: 'leaf', description: 'Pet food' },
        { id: 'book', label: 'Book visit', href: `${base}/contact`, icon: 'phone', description: 'Appointments' },
      ],
    },
    'salon-spa': {
      categoryHeading: 'Services & retail',
      gridTitle: 'Book a service',
      dealStrip: {
        badge: 'Salon & spa',
        title: 'Hair, skin, nails & professional retail',
        subtitle: 'Appointments · Packages · Gift cards',
        cta: 'Book now',
        href: products,
      },
      servicePills: ['Expert stylists', 'Premium products', 'Hygienic standards', 'Membership perks'],
      quickActions: [
        { id: 'hair', label: 'Hair', href: `${products}?category=hair-services`, icon: 'sparkles', description: 'Cut & style' },
        { id: 'skin', label: 'Skin', href: `${products}?category=skin-services`, icon: 'leaf', description: 'Facials & care' },
        { id: 'nails', label: 'Nails', href: `${products}?category=nail-services`, icon: 'gift', description: 'Mani & pedi' },
        { id: 'retail', label: 'Products', href: `${products}?category=retail-products`, icon: 'package', description: 'Take-home care' },
      ],
    },
    'furniture': {
      categoryHeading: 'Rooms & collections',
      gridTitle: 'Home favourites',
      dealStrip: {
        badge: 'Season sale',
        title: 'Up to 35% off living & bedroom',
        subtitle: 'Sofas, beds, dining sets · Free assembly on qualifying orders',
        cta: 'Shop sale',
        href: `${products}?onSale=true`,
      },
      servicePills: ['Free delivery & assembly', 'Custom fabrics & sizes', '14-day returns', 'Showroom visits'],
      quickActions: [
        { id: 'living', label: 'Living room', href: `${products}?category=living-room`, icon: 'package', description: 'Sofas & tables' },
        { id: 'bedroom', label: 'Bedroom', href: `${products}?category=bedroom-furniture`, icon: 'gift', description: 'Beds & storage' },
        { id: 'dining', label: 'Dining', href: `${products}?category=dining-room`, icon: 'star', description: 'Tables & sets' },
        { id: 'sale', label: 'Offers', href: `${products}?onSale=true`, icon: 'tag', description: 'Clearance' },
      ],
      spotlights: [
        {
          id: 'woodin-edit',
          eyebrow: 'Woodin edit',
          title: 'Curated pieces for modern homes',
          subtitle: 'Boucle sectionals, sheesham dining, and sculptural beds with nationwide delivery.',
          cta: 'Explore collection',
          href: products,
          tone: 'dark',
        },
      ],
    },
    'restaurant-cafe': {
      categoryHeading: 'Menu categories',
      gridTitle: 'Popular dishes',
      dealStrip: {
        badge: 'Super picks',
        title: 'Today\'s best deals on pizza & BBQ',
        subtitle: 'Combos, family boxes, and late-night bundles',
        cta: 'View deals',
        href: `${products}?onSale=true`,
      },
      servicePills: ['Fast delivery', 'Freshly prepared', 'e-Cash rewards', 'Live support'],
      quickActions: [
        { id: 'mains', label: 'Mains', href: `${products}?category=main-course`, icon: 'utensils', description: 'Biryani, pizza, BBQ' },
        { id: 'starters', label: 'Starters', href: `${products}?category=appetizers`, icon: 'sparkles', description: 'Soups & salads' },
        { id: 'desserts', label: 'Desserts', href: `${products}?category=desserts`, icon: 'gift', description: 'Sweet treats' },
        { id: 'deals', label: 'Deals', href: `${products}?onSale=true`, icon: 'tag', description: 'Combos & offers' },
      ],
    },
    'bookshop-stationery': {
      categoryHeading: 'Books & stationery',
      quickActions: [
        { id: 'books', label: 'Books', href: `${products}?category=books`, icon: 'package', description: 'New releases' },
        { id: 'stationery', label: 'Stationery', href: `${products}?category=stationery`, icon: 'gift', description: 'School & office' },
        { id: 'gifts', label: 'Gifts', href: `${products}?sort=featured`, icon: 'sparkles', description: 'Curated picks' },
        { id: 'deals', label: 'Deals', href: `${products}?onSale=true`, icon: 'tag', description: 'Promotions' },
      ],
    },
    'construction-material': {
      categoryHeading: 'Building supplies',
      gridTitle: 'Project essentials',
      servicePills: ['Bulk pricing', 'Site delivery', 'Quality materials', 'Trade accounts'],
      quickActions: [
        { id: 'cement', label: 'Cement', href: `${products}?category=cement`, icon: 'package', description: 'Bags & mixes' },
        { id: 'steel', label: 'Steel', href: `${products}?category=steel`, icon: 'wrench', description: 'Bars & mesh' },
        { id: 'tiles', label: 'Tiles', href: `${products}?category=tiles`, icon: 'sparkles', description: 'Floor & wall' },
        { id: 'quote', label: 'Bulk quote', href: `${base}/contact`, icon: 'phone', description: 'Project orders' },
      ],
    },
    grocery: {
      categoryHeading: 'Aisle shortcuts',
    },
    'auto-workshop': {
      categoryHeading: 'Workshop services',
      gridTitle: 'Service & parts',
      quickActions: [
        { id: 'service', label: 'Services', href: `${products}?category=services`, icon: 'wrench', description: 'Maintenance' },
        { id: 'parts', label: 'Parts', href: `${products}?category=parts`, icon: 'filter', description: 'OEM & aftermarket' },
        { id: 'oil', label: 'Fluids', href: `${products}?category=lubricants`, icon: 'droplet', description: 'Oils & fluids' },
        { id: 'book', label: 'Book service', href: `${base}/contact`, icon: 'phone', description: 'Schedule visit' },
      ],
    },
  };

  return map[canonical] || null;
}
