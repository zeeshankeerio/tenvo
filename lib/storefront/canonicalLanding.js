/**
 * Canonical domain-key overrides, finer than vertical presets (hardware vs auto, dental vs pharmacy).
 */

/**
 * @param {string} base `/store/{domain}`
 * @param {string} canonical resolved domain key
 */
export function getCanonicalLandingOverrides(canonical, base) {
  /** @type {Record<string, object>} */
  const map = {
    'hardware-sanitary': {
      categoryHeading: 'Shop by department',
      gridTitle: 'Popular in store',
      dealStrip: {
        badge: 'Trade & DIY',
        title: 'Tools, plumbing & sanitary, ready for pickup or delivery',
        subtitle: 'Stanley · Bosch · Grohe · local hardware',
        cta: 'Browse departments',
        href: `${base}/products`,
      },
      servicePills: ['Genuine brands', 'Bulk & trade pricing', 'Fast dispatch', 'Expert advice'],
      quickActions: [
        { id: 'tools', label: 'Tools', href: `${base}/products?category=tools`, icon: 'wrench', description: 'Hand & power tools' },
        { id: 'plumbing', label: 'Plumbing', href: `${base}/products?category=plumbing`, icon: 'wrench', description: 'Pipes & fittings' },
        { id: 'sanitary', label: 'Sanitary', href: `${base}/products?category=sanitary`, icon: 'package', description: 'Bath & kitchen' },
        { id: 'power', label: 'Power Tools', href: `${base}/products?category=power-tools`, icon: 'zap', description: 'Drills & saws' },
      ],
      spotlights: [
        {
          id: 'trade',
          eyebrow: 'Trade accounts',
          title: 'Built for contractors & DIY',
          subtitle: 'Quality hardware and sanitary ware, bulk orders and delivery across the region.',
          cta: 'Shop hardware',
          href: `${base}/products`,
          tone: 'dark',
        },
      ],
    },
    'auto-parts': {
      categoryHeading: 'Browse by category',
      gridTitle: 'Featured parts and accessories',
      dealStrip: {
        badge: 'Auto parts',
        title: 'Genuine car accessories, care products, and OEM parts',
        subtitle: 'Cash on delivery and nationwide shipping where available',
        cta: 'Shop catalog',
        href: `${base}/products`,
      },
      servicePills: ['Genuine and OEM', 'Cash on delivery', 'Nationwide shipping', 'Part number search'],
      quickActions: [
        { id: 'car-care', label: 'Car care', href: `${base}/products?category=car-care`, icon: 'droplet', description: 'Wash, wax, detail' },
        { id: 'oils', label: 'Oils', href: `${base}/products?category=lubricants`, icon: 'droplet', description: 'Engine and ATF' },
        { id: 'accessories', label: 'Accessories', href: `${base}/products?category=accessories`, icon: 'package', description: 'Body kits and more' },
        { id: 'deals', label: 'Deals', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Limited offers' },
      ],
      spotlights: [
        {
          id: 'finder',
          eyebrow: 'Smart search',
          title: 'Find the right fit fast',
          subtitle: 'Search by part number, vehicle plate, VIN, or make and model.',
          cta: 'Open parts finder',
          href: `${base}/products`,
          tone: 'dark',
        },
      ],
    },
    'dental-clinic': {
      categoryHeading: 'Dental services & care',
      gridTitle: 'Popular treatments',
      dealStrip: {
        badge: 'Dental care',
        title: 'Professional treatments & smile care',
        subtitle: 'Preventive · restorative · cosmetic · diagnostics',
        cta: 'View services',
        href: `${base}/products?sort=featured`,
      },
      servicePills: ['Licensed clinicians', 'Modern equipment', 'Sterile protocols', 'Flexible booking'],
      quickActions: [
        { id: 'preventive', label: 'Preventive', href: `${base}/products?category=preventive`, icon: 'shield', description: 'Cleaning & checkups' },
        { id: 'restorative', label: 'Restorative', href: `${base}/products?category=restorative`, icon: 'star', description: 'Fillings & crowns' },
        { id: 'cosmetic', label: 'Cosmetic', href: `${base}/products?category=cosmetic`, icon: 'sparkles', description: 'Whitening & veneers' },
        { id: 'contact', label: 'Book visit', href: `${base}/contact`, icon: 'phone', description: 'Schedule appointment' },
      ],
      spotlights: [
        {
          id: 'smile',
          eyebrow: 'Cosmetic dentistry',
          title: 'Confident smiles start here',
          subtitle: 'Whitening, veneers, and restorative care from experienced clinicians.',
          cta: 'Explore services',
          href: `${base}/products?category=cosmetic`,
          tone: 'accent',
        },
      ],
    },
    'textile-wholesale': {
      categoryHeading: 'Shop by fabric',
      gridTitle: 'Trending fabrics',
      dealStrip: {
        badge: 'Premium fabrics',
        title: 'Lawn, silk & bridal collections',
        subtitle: 'Wholesale quality · Bulk orders welcome',
        cta: 'Browse fabrics',
        href: `${base}/products`,
      },
      servicePills: ['Wholesale pricing', 'Bulk orders', 'Quality fabrics', 'Nationwide delivery'],
      quickActions: [
        { id: 'lawn', label: 'Lawn', href: `${base}/products?category=lawn`, icon: 'sparkles', description: 'Digital & printed' },
        { id: 'cotton', label: 'Cotton', href: `${base}/products?category=cotton`, icon: 'shirt', description: 'Unstitched & mens' },
        { id: 'khaddar', label: 'Khaddar', href: `${base}/products?category=khaddar`, icon: 'package', description: 'Winter collections' },
        { id: 'bridal', label: 'Bridal', href: `${base}/products?category=bridal-collection`, icon: 'gift', description: 'Formal & luxury' },
      ],
      spotlights: [
        {
          id: 'bridal-fabrics',
          eyebrow: 'Bridal edit',
          title: 'Formal & luxury ranges',
          subtitle: 'Embroidered chiffon, silk, and occasion fabrics for retailers and designers.',
          cta: 'Shop bridal',
          href: `${base}/products?category=bridal-collection`,
          tone: 'dark',
        },
      ],
    },
    'gems-jewellery': {
      categoryHeading: 'Fine jewellery',
      gridTitle: 'Signature pieces',
      dealStrip: {
        badge: 'Fine jewellery',
        title: 'Gold, diamonds & bridal sets',
        subtitle: 'Hallmarked quality · Insured delivery · Gift packaging',
        cta: 'Shop jewellery',
        href: `${base}/products?sort=featured`,
      },
      servicePills: ['Certified gold', 'Insured shipping', 'Gift packaging', 'Hallmark assured'],
      quickActions: [
        { id: 'gold', label: 'Gold', href: `${base}/products?category=gold`, icon: 'star', description: 'Rings & sets' },
        { id: 'bridal', label: 'Bridal', href: `${base}/products?category=bridal`, icon: 'gift', description: 'Wedding sets' },
        { id: 'diamonds', label: 'Diamonds', href: `${base}/products?category=diamonds`, icon: 'sparkles', description: 'Fine cuts' },
        { id: 'gifts', label: 'Gifts', href: `${base}/products?sort=featured`, icon: 'package', description: 'Occasions' },
      ],
      spotlights: [
        {
          id: 'bridal-jewellery',
          eyebrow: 'Bridal heritage',
          title: 'Wedding sets crafted to last',
          subtitle: 'Engagement rings, necklaces, and complete bridal sets with certified stones.',
          cta: 'Explore bridal',
          href: `${base}/products?category=bridal`,
          tone: 'dark',
        },
      ],
    },
    'boutique-fashion': {
      categoryHeading: 'Designer collections',
      gridTitle: 'Curated style',
      servicePills: ['Designer labels', 'Easy returns', 'Secure checkout', 'Personal styling'],
      quickActions: [
        { id: 'new', label: 'New In', href: `${base}/products?sort=newest`, icon: 'sparkles', description: 'Latest arrivals' },
        { id: 'designer', label: 'Designer', href: `${base}/products?sort=featured`, icon: 'star', description: 'Curated picks' },
        { id: 'sale', label: 'Sale', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Limited offers' },
        { id: 'styling', label: 'Styling', href: `${base}/contact`, icon: 'phone', description: 'Book consultation' },
      ],
      spotlights: [
        {
          id: 'designer-edit',
          eyebrow: 'Designer edit',
          title: 'Limited pieces from leading labels',
          subtitle: 'Runway-inspired silhouettes, luxury formals, and accessories that complete the look.',
          cta: 'View designer edit',
          href: `${base}/products?sort=featured`,
          tone: 'dark',
        },
      ],
    },
    'leather-footwear': {
      categoryHeading: 'Footwear & leather',
      gridTitle: 'Crafted essentials',
      dealStrip: {
        badge: 'Leather craft',
        title: 'Premium footwear & leather goods',
        subtitle: 'Genuine materials · Durable finishes · Seasonal styles',
        cta: 'Shop leather',
        href: `${base}/products`,
      },
      servicePills: ['Genuine leather', 'Durable craft', 'Easy returns', 'Secure checkout'],
      quickActions: [
        { id: 'shoes', label: 'Footwear', href: `${base}/products?category=footwear`, icon: 'shirt', description: 'Shoes & sandals' },
        { id: 'leather', label: 'Leather goods', href: `${base}/products?category=leather`, icon: 'package', description: 'Bags & belts' },
        { id: 'new', label: 'New in', href: `${base}/products?sort=newest`, icon: 'sparkles', description: 'Latest styles' },
        { id: 'sale', label: 'Sale', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Seasonal offers' },
      ],
      spotlights: [
        {
          id: 'leather-craft',
          eyebrow: 'Crafted leather',
          title: 'Built for everyday elegance',
          subtitle: 'Hand-finished shoes, bags, and belts in premium leather.',
          cta: 'Explore footwear',
          href: `${base}/products?category=footwear`,
          tone: 'dark',
        },
      ],
    },
    'restaurant-cafe': {
      quickActions: [
        { id: 'mains', label: 'Mains', href: `${base}/products?category=main-course`, icon: 'utensils', description: 'Biryani, pizza & more' },
        { id: 'beverages', label: 'Drinks', href: `${base}/products?category=beverages`, icon: 'cup', description: 'Fresh beverages' },
        { id: 'desserts', label: 'Desserts', href: `${base}/products?category=desserts`, icon: 'gift', description: 'Sweet finishes' },
        { id: 'combos', label: 'Combos', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Bundle deals' },
      ],
    },
    'retail-shop': {
      quickActions: [
        { id: 'clothing', label: 'Clothing', href: `${base}/products?category=clothing`, icon: 'shirt', description: 'Apparel & fashion' },
        { id: 'electronics', label: 'Electronics', href: `${base}/products?category=electronics`, icon: 'headphones', description: 'Gadgets & tech' },
        { id: 'home', label: 'Home', href: `${base}/products?category=home-living`, icon: 'package', description: 'Home & living' },
        { id: 'sale', label: 'Deals', href: `${base}/products?onSale=true`, icon: 'tag', description: 'Limited offers' },
      ],
    },
  };

  return map[canonical] || null;
}
