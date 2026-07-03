/**
 * Build Tenvo Gym & Fitness seed catalog from archive/fitness-products.html (Synergize.pk reference).
 * Run: node scripts/build-fitness-seed-catalog.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'archive/fitness-products.html');
const outPath = path.join(root, 'lib/dataLab/fitnessDemoCatalog.js');

const CATEGORY_FROM_SLUG = {
  'whey-protein-in-pakistan': 'Whey Protein',
  'weight-gainer': 'Weight Gainer',
  'weight-loss': 'Weight Loss',
  'creatine': 'Creatine',
  'omega-3-fish-oil-pakistan': 'Omega 3 & Fish Oil',
  'vitamins-and-minerals': 'Vitamins & Minerals',
  'pre-workout': 'Pre Workout',
  'amino-acids': 'Amino Acids',
  't-boosters': 'T Boosters',
  'synergize-deals': 'Deals',
  'gnc-pakistan': 'GNC Supplements',
  'protein-bars': 'Protein Bars',
  'shaker-bottles-pakistan': 'Fitness Accessories',
  'fitness-accessories': 'Fitness Accessories',
};

/** @param {string} html */
function parseProducts(html) {
  const products = [];
  const liRe =
    /<li[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = liRe.exec(html)) !== null) {
    const block = match[0];
    const titleMatch = block.match(
      /<h2 class="woocommerce-loop-product__title">([^<]+)<\/h2>/
    );
    if (!titleMatch) continue;
    const name = titleMatch[1].replace(/\s+/g, ' ').trim();

    const srcsetMatch = block.match(/srcset="([^"]+)"/);
    let image_url = '';
    if (srcsetMatch) {
      const parts = srcsetMatch[1].split(',').map((p) => p.trim());
      const full = parts.find((p) => /\s500w$/.test(p)) || parts[parts.length - 1];
      image_url = full.replace(/\s+\d+w$/, '').trim();
    }
    if (!image_url) {
      const srcMatch = block.match(/src="(https:\/\/www\.synergize\.pk\/wp-content\/uploads\/[^"]+)"/);
      image_url = srcMatch ? srcMatch[1].replace(/-\d+x\d+(\.[a-z]+)$/i, '$1') : '';
    }

    const priceMatch = block.match(
      /woocommerce-Price-currencySymbol[^>]*>[^<]*<\/span>([\d,]+)<\/bdi>/
    );
    const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0;

    const delMatch = block.match(
      /<del>[\s\S]*?woocommerce-Price-currencySymbol[^>]*>[^<]*<\/span>([\d,]+)<\/bdi>/
    );
    const compare_price = delMatch ? Number(delMatch[1].replace(/,/g, '')) : null;

    const catMatch = block.match(/product_cat-([a-z0-9-]+)/);
    const catSlug = catMatch ? catMatch[1] : '';
    const category = CATEGORY_FROM_SLUG[catSlug] || inferCategory(name);

    const brandMatch = block.match(/product_brand-([a-z0-9-]+)/);
    const brand = brandMatch
      ? brandMatch[1]
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : inferBrand(name);

    if (!name || !image_url || !price) continue;

    products.push({
      name,
      brand,
      category,
      unit: inferUnit(name),
      price,
      compare_price: compare_price && compare_price > price ? compare_price : null,
      cost_price: Math.round(price * 0.68),
      stock: 12 + (products.length % 18),
      sku: `TF-GYM-${String(products.length + 1).padStart(3, '0')}`,
      description: `${name}. Authentic supplement with nationwide delivery.`,
      image_url,
      imageCredit: 'synergize.pk (archive reference)',
      is_featured: products.length < 8 || /whey|protein|mass|creatine|pre.?workout/i.test(name),
      domain_data: {
        supplementname: name,
        membershiptype: null,
      },
    });
  }
  return dedupeByName(products);
}

/** @param {string} name */
function inferCategory(name) {
  const n = name.toLowerCase();
  if (/whey|protein|isolate|casein/.test(n)) return 'Whey Protein';
  if (/mass|gainer|serious mass/.test(n)) return 'Weight Gainer';
  if (/creatine/.test(n)) return 'Creatine';
  if (/omega|fish oil/.test(n)) return 'Omega 3 & Fish Oil';
  if (/vitamin|multi/.test(n)) return 'Vitamins & Minerals';
  if (/pre.?workout|caffeine|pump/.test(n)) return 'Pre Workout';
  if (/bcaa|amino|glutamine/.test(n)) return 'Amino Acids';
  if (/bar/.test(n)) return 'Protein Bars';
  if (/shaker|belt|glove|strap/.test(n)) return 'Fitness Accessories';
  if (/fat burner|weight loss|ripped|lean/.test(n)) return 'Weight Loss';
  return 'Supplements';
}

/** @param {string} name */
function inferBrand(name) {
  const brands = [
    'Optimum Nutrition',
    'Rule 1',
    'Kevin Levrone',
    'Nutrex',
    'Labrada',
    'Applied Nutrition',
    'Xtend',
    'Skull Labz',
    'GAT',
    'MuscleTech',
    'Dymatize',
    'BSN',
    'Cellucor',
    'GNC',
  ];
  const hit = brands.find((b) => name.toLowerCase().includes(b.toLowerCase().split(' ')[0]));
  return hit || 'Tenvo Nutrition';
}

/** @param {string} name */
function inferUnit(name) {
  const n = name.toLowerCase();
  if (/tab|caps|cap\b/.test(n)) return 'pack';
  if (/kg|lb|lbs|g\b|servings/.test(n)) return 'tub';
  return 'pcs';
}

/** @param {Array<{ name: string }>} rows */
function dedupeByName(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const MEMBERSHIP_IMAGE_MALE =
  'https://assets.website-files.com/62258d7594580b9078cf9018/62259760973610c0a8578542_Group%20100.png';
const MEMBERSHIP_IMAGE_FEMALE =
  'https://assets.website-files.com/62258d7594580b9078cf9018/62259760d15b8935f9abff2b_Group%20101.png';

/** Pakistani gym-style gents + ladies packages (monthly through annual). */
const MEMBERSHIP_PACKAGES = [
  // Gents
  {
    name: 'Gents Gym Monthly Pass',
    gender: 'male',
    duration: 'monthly',
    price: 4995,
    compare_price: 5995,
    sku: 'TF-GYM-MEM-M-1M',
    description:
      '30-day unlimited access to the main gym floor, free weights, machines, and cardio. Locker included.',
  },
  {
    name: 'Gents Gym 3-Month Package',
    gender: 'male',
    duration: '3month',
    price: 13500,
    compare_price: 14985,
    sku: 'TF-GYM-MEM-M-3M',
    description:
      '90-day gents membership with 1 complimentary PT intro session and member pricing on supplements.',
  },
  {
    name: 'Gents Gym 6-Month Package',
    gender: 'male',
    duration: '6month',
    price: 24995,
    compare_price: 29970,
    sku: 'TF-GYM-MEM-M-6M',
    description:
      'Six months unlimited access, 2 PT sessions, monthly guest pass, and steam room access.',
  },
  {
    name: 'Gents Gym Annual Pass',
    gender: 'male',
    duration: 'yearly',
    price: 44995,
    compare_price: 59940,
    sku: 'TF-GYM-MEM-M-12M',
    description:
      'Best value yearly plan: unlimited gym, 4 PT sessions, nutrition consult, and 15% off supplements.',
  },
  // Ladies section (common Pakistani gym offering)
  {
    name: 'Ladies Section Monthly Pass',
    gender: 'female',
    duration: 'monthly',
    price: 5995,
    compare_price: 7495,
    sku: 'TF-GYM-MEM-F-1M',
    description:
      '30-day ladies-only floor access with female trainers on duty, cardio, and strength zones.',
  },
  {
    name: 'Ladies Section 3-Month Package',
    gender: 'female',
    duration: '3month',
    price: 16200,
    compare_price: 17985,
    sku: 'TF-GYM-MEM-F-3M',
    description:
      '90-day ladies membership with 1 PT intro, group class access, and secure locker.',
  },
  {
    name: 'Ladies Section 6-Month Package',
    gender: 'female',
    duration: '6month',
    price: 29995,
    compare_price: 35970,
    sku: 'TF-GYM-MEM-F-6M',
    description:
      'Six months ladies-only access, 2 PT sessions, yoga class pack add-on, and steam access.',
  },
  {
    name: 'Ladies Section Annual Pass',
    gender: 'female',
    duration: 'yearly',
    price: 53995,
    compare_price: 71940,
    sku: 'TF-GYM-MEM-F-12M',
    description:
      'Year-round ladies membership with 4 PT sessions, nutrition check-in, and 15% supplement discount.',
  },
];

const MEMBERSHIP_PRODUCTS = [
  ...MEMBERSHIP_PACKAGES.map((pkg) => ({
    name: pkg.name,
    brand: 'Tenvo Fitness',
    category: 'Memberships',
    unit: pkg.duration === 'monthly' ? 'month' : 'package',
    price: pkg.price,
    compare_price: pkg.compare_price,
    cost_price: Math.round(pkg.price * 0.28),
    stock: 999,
    sku: pkg.sku,
    description: pkg.description,
    image_url: pkg.gender === 'female' ? MEMBERSHIP_IMAGE_FEMALE : MEMBERSHIP_IMAGE_MALE,
    imageCredit: 'workoutwildandfree.webflow.io (archive)',
    is_featured: pkg.duration === 'monthly',
    domain_data: {
      gender: pkg.gender,
      facility: pkg.gender === 'female' ? 'ladies' : 'gents',
      duration: pkg.duration,
      membershiptype:
        pkg.duration === 'monthly'
          ? 'Monthly'
          : pkg.duration === '3month'
            ? 'Quarterly'
            : pkg.duration === '6month'
              ? 'Semi-Annual'
              : 'Annual',
      bookable: true,
      supplementname: null,
    },
  })),
  {
    name: 'Rookie Trial Pass',
    brand: 'Tenvo Fitness',
    category: 'Memberships',
    unit: 'session',
    price: 997,
    compare_price: 1997,
    cost_price: 200,
    stock: 999,
    sku: 'TF-GYM-MEM-002',
    description: 'One-time intro pass with coach orientation and access to all main workout zones.',
    image_url:
      'https://assets.website-files.com/62258d7594580b9078cf9018/62259760ab10d7619d303c29_Group%20102.png',
    imageCredit: 'workoutwildandfree.webflow.io (archive)',
    is_featured: true,
    domain_data: {
      gender: 'unisex',
      duration: 'trial',
      membershiptype: 'Trial',
      bookable: true,
      supplementname: null,
    },
  },
  {
    name: 'Personal Training (5 Sessions)',
    brand: 'Tenvo Fitness',
    category: 'Personal Training',
    unit: 'pack',
    price: 12500,
    compare_price: 15000,
    cost_price: 4500,
    stock: 999,
    sku: 'TF-GYM-PT-001',
    description: 'Five one-on-one sessions with a certified strength or mobility coach.',
    image_url:
      'https://assets.website-files.com/62258d7594580b9078cf9018/62259760ab10d7619d303c29_Group%20102.png',
    imageCredit: 'workoutwildandfree.webflow.io (archive)',
    is_featured: true,
    domain_data: { membershiptype: 'Monthly', trainer: 'Assigned on booking' },
  },
  {
    name: 'Yoga & Mobility Class Pack',
    brand: 'Tenvo Fitness',
    category: 'Classes',
    unit: 'pack',
    price: 3500,
    compare_price: 4200,
    cost_price: 900,
    stock: 999,
    sku: 'TF-GYM-CLS-001',
    description: 'Eight flexibility and recovery classes. Ideal for desk athletes and lifters.',
    image_url:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&auto=format&fit=crop',
    imageCredit: 'Unsplash (demo)',
    domain_data: { membershiptype: 'Quarterly', supplementname: null },
  },
  {
    name: 'Nutrition Consultation',
    brand: 'Tenvo Fitness',
    category: 'Personal Training',
    unit: 'session',
    price: 2500,
    cost_price: 800,
    stock: 999,
    sku: 'TF-GYM-NUT-001',
    description: '45-minute consult to align protein, recovery, and supplement plan with your training block.',
    image_url:
      'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&q=80&auto=format&fit=crop',
    imageCredit: 'Unsplash (demo)',
    domain_data: { supplementname: 'Custom stack', trainer: 'Nutrition coach' },
  },
];

const html = fs.readFileSync(htmlPath, 'utf8');
const supplementProducts = parseProducts(html);
const products = [...MEMBERSHIP_PRODUCTS, ...supplementProducts.slice(0, 48)];

const categories = [
  'Whey Protein',
  'Weight Gainer',
  'Creatine',
  'Pre Workout',
  'Amino Acids',
  'Vitamins & Minerals',
  'Omega 3 & Fish Oil',
  'Protein Bars',
  'Fitness Accessories',
  'Weight Loss',
  'Memberships',
  'Personal Training',
  'Classes',
  'Deals',
];

const file = `/**
 * Tenvo Gym & Fitness demo catalog — supplements from archive/fitness-products.html
 * (Synergize.pk reference) plus membership/class SKUs from archive/fitness.html.
 * Regenerate: node scripts/build-fitness-seed-catalog.mjs
 */
/** @type {string[]} */
export const FITNESS_SEED_CATEGORIES = ${JSON.stringify(categories, null, 2)};

/** @type {Array<Record<string, unknown>>} */
export const FITNESS_SEED_PRODUCTS = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync(outPath, file);
console.log(`Wrote ${products.length} products (${supplementProducts.length} parsed) to ${outPath}`);
