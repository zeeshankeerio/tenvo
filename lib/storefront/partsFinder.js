/**
 * Auto-parts storefront finder data and product-list URL builders.
 * Isolated from vehicle-dealership and auto-marketplace verticals.
 */

import { resolveDomainKey } from '../config/domainKeyAliases.js';

/** Canonical categories that use vehicle plate/VIN/fitment finder modules. */
export const AUTO_PARTS_FINDER_CANONICALS = new Set(['auto-parts', 'auto-workshop']);

/**
 * Whether the storefront should show vehicle plate/VIN/fitment finder UI.
 * Hardware-sanitary and industrial-parts are excluded (part-number search only).
 * @param {string | null | undefined} category
 */
export function isAutoPartsFinderStore(category) {
  const canonical = resolveDomainKey(category);
  return AUTO_PARTS_FINDER_CANONICALS.has(canonical);
}

/** domain_data keys surfaced on product cards and detail specs (hub key → label). */
export const AUTO_PARTS_DISPLAY_FIELDS = [
  ['partnumber', 'Part number'],
  ['oemnumber', 'OEM number'],
  ['vehiclemake', 'Vehicle make'],
  ['vehiclemodel', 'Vehicle model'],
  ['modelyear', 'Model year'],
  ['bodytype', 'Body type'],
  ['enginetype', 'Engine type'],
  ['engineno', 'Engine no'],
  ['vehicleclass', 'Vehicle class'],
  ['vehicletype', 'Vehicle type'],
  ['manufacturer', 'Manufacturer'],
  ['warrantyperiod', 'Warranty'],
];

/**
 * Build storefront specification map from auto-parts domain_data.
 * @param {Record<string, unknown> | null | undefined} domainData
 */
export function buildAutoPartsSpecifications(domainData) {
  if (!domainData || typeof domainData !== 'object') return {};
  /** @type {Record<string, string>} */
  const specs = {};
  for (const [key, label] of AUTO_PARTS_DISPLAY_FIELDS) {
    const val = domainData[key];
    if (val != null && String(val).trim()) specs[label] = String(val).trim();
  }
  const compat = domainData.vehiclecompatibility;
  if (compat != null) {
    const str = Array.isArray(compat) ? compat.join(', ') : String(compat);
    if (str.trim()) specs['Vehicle compatibility'] = str.trim();
  }
  return specs;
}

/** @typedef {'car' | 'moto'} PartsVehicleType */
/** @typedef {'partNumber' | 'partSize' | 'plate' | 'vin'} PartsSearchMode */

export const PARTS_BODY_TYPES = [
  'Sedan',
  'Hatchback',
  'SUV',
  'MPV',
  'Coupe',
  'Wagon',
  'Pickup',
  'Van',
  'Scooter',
  'Naked',
  'Sport',
];

export const PARTS_VEHICLE_CLASSES = [
  'Passenger',
  'Commercial',
  'Performance',
  'Electric',
  'Hybrid',
];

export const PARTS_CAR_MAKES = [
  'Toyota',
  'Honda',
  'Suzuki',
  'Hyundai',
  'Kia',
  'Nissan',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Volkswagen',
  'Mazda',
  'Mitsubishi',
];

export const PARTS_MOTO_MAKES = ['Yamaha', 'Honda', 'Suzuki', 'Kawasaki', 'BMW', 'Ducati'];

/** @type {Record<string, Array<{ name: string; sgOnly?: boolean }>>} */
export const PARTS_VEHICLE_MODELS = {
  Toyota: [
    { name: 'Corolla', sgOnly: true },
    { name: 'Yaris', sgOnly: true },
    { name: 'Vios', sgOnly: true },
    { name: 'Camry', sgOnly: true },
    { name: 'Fortuner' },
    { name: 'Hilux' },
    { name: 'Prado' },
    { name: 'Altis', sgOnly: true },
  ],
  Honda: [
    { name: 'Civic', sgOnly: true },
    { name: 'City', sgOnly: true },
    { name: 'Accord', sgOnly: true },
    { name: 'BR-V', sgOnly: true },
    { name: 'Vezel', sgOnly: true },
    { name: 'Fit', sgOnly: true },
  ],
  Suzuki: [
    { name: 'Swift', sgOnly: true },
    { name: 'Alto' },
    { name: 'Ciaz', sgOnly: true },
    { name: 'Jimny', sgOnly: true },
    { name: 'Wagon R' },
  ],
  Hyundai: [
    { name: 'Avante', sgOnly: true },
    { name: 'Elantra', sgOnly: true },
    { name: 'Tucson', sgOnly: true },
    { name: 'Sonata' },
    { name: 'Ioniq 5', sgOnly: true },
  ],
  Kia: [
    { name: 'Cerato', sgOnly: true },
    { name: 'Sportage', sgOnly: true },
    { name: 'Stonic', sgOnly: true },
    { name: 'Sorento' },
    { name: 'Picanto', sgOnly: true },
  ],
  Nissan: [
    { name: 'Sunny', sgOnly: true },
    { name: 'Sylphy', sgOnly: true },
    { name: 'Juke', sgOnly: true },
    { name: 'Qashqai', sgOnly: true },
    { name: 'Patrol' },
  ],
  BMW: [
    { name: '3 Series', sgOnly: true },
    { name: '5 Series', sgOnly: true },
    { name: 'X1', sgOnly: true },
    { name: 'X3', sgOnly: true },
    { name: 'X5' },
  ],
  'Mercedes-Benz': [
    { name: 'A-Class', sgOnly: true },
    { name: 'C-Class', sgOnly: true },
    { name: 'E-Class', sgOnly: true },
    { name: 'GLA', sgOnly: true },
    { name: 'GLC', sgOnly: true },
  ],
  Audi: [
    { name: 'A3', sgOnly: true },
    { name: 'A4', sgOnly: true },
    { name: 'A6', sgOnly: true },
    { name: 'Q3', sgOnly: true },
    { name: 'Q5', sgOnly: true },
  ],
  Volkswagen: [
    { name: 'Golf', sgOnly: true },
    { name: 'Polo', sgOnly: true },
    { name: 'Tiguan', sgOnly: true },
    { name: 'Passat', sgOnly: true },
  ],
  Mazda: [
    { name: 'Mazda3', sgOnly: true },
    { name: 'Mazda6', sgOnly: true },
    { name: 'CX-5', sgOnly: true },
    { name: 'CX-30', sgOnly: true },
  ],
  Mitsubishi: [
    { name: 'Attrage', sgOnly: true },
    { name: 'Lancer', sgOnly: true },
    { name: 'Outlander', sgOnly: true },
    { name: 'Xpander', sgOnly: true },
  ],
  Yamaha: [
    { name: 'NMAX', sgOnly: true },
    { name: 'Aerox', sgOnly: true },
    { name: 'YZF-R15' },
    { name: 'MT-15' },
  ],
  Kawasaki: [
    { name: 'Ninja 400', sgOnly: true },
    { name: 'Z650' },
    { name: 'Versys 650' },
  ],
  Ducati: [
    { name: 'Monster', sgOnly: true },
    { name: 'Panigale' },
    { name: 'Scrambler', sgOnly: true },
  ],
};

/** @type {Record<string, string[]>} */
export const PARTS_ENGINE_OPTIONS = {
  'Toyota|Corolla': ['1.3 Petrol', '1.6 Petrol', '1.8 Hybrid'],
  'Toyota|Yaris': ['1.3 Petrol', '1.5 Hybrid'],
  'Toyota|Vios': ['1.5 Petrol'],
  'Honda|Civic': ['1.5 Turbo', '2.0 Petrol', '1.8 Hybrid'],
  'Honda|City': ['1.5 Petrol', '1.5 Hybrid'],
  'Suzuki|Swift': ['1.2 Petrol', '1.4 Boosterjet'],
  'Hyundai|Avante': ['1.6 Petrol', '1.6 Turbo'],
  'BMW|3 Series': ['320i', '330i', '330e'],
  'Audi|A4': ['1.4 TFSI', '2.0 TFSI', '2.0 TDI'],
  'Volkswagen|Golf': ['1.4 TSI', '2.0 TSI', '1.6 TDI'],
};

/** @type {Record<string, string[]>} */
export const PARTS_ENGINE_NO_OPTIONS = {
  'Toyota|Corolla|1.6 Petrol': ['2NR-FE', '1ZR-FE'],
  'Toyota|Yaris|1.5 Hybrid': ['2NR-FKE'],
  'Honda|Civic|1.5 Turbo': ['L15B7'],
  'Honda|City|1.5 Petrol': ['L15Z1'],
  'Suzuki|Swift|1.2 Petrol': ['K12M'],
  'BMW|3 Series|320i': ['B48B20'],
  'Audi|A4|2.0 TFSI': ['DKZA'],
  'Volkswagen|Golf|1.4 TSI': ['CZDA'],
};

export const PARTS_VEHICLE_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 30 }, (_, i) => String(y - i));
})();

/** Back-compat exports used by heroPresets marquee */
export const VEHICLE_MAKES = PARTS_CAR_MAKES;
export const VEHICLE_MODELS = Object.fromEntries(
  Object.entries(PARTS_VEHICLE_MODELS).map(([make, models]) => [
    make,
    models.map((m) => m.name),
  ])
);
export const VEHICLE_YEARS = PARTS_VEHICLE_YEARS;

/**
 * @param {string} make
 * @param {{ vehicleType?: PartsVehicleType; sgOnly?: boolean }} [opts]
 */
export function getModelsForMake(make, { vehicleType = 'car', sgOnly = false } = {}) {
  const pool = vehicleType === 'moto' ? PARTS_MOTO_MAKES : PARTS_CAR_MAKES;
  if (!make || !pool.includes(make)) return [];
  const rows = PARTS_VEHICLE_MODELS[make] || [];
  return rows.filter((m) => !sgOnly || m.sgOnly).map((m) => m.name);
}

/**
 * @param {string} make
 * @param {string} model
 */
export function getEnginesForVehicle(make, model) {
  if (!make || !model) return [];
  return PARTS_ENGINE_OPTIONS[`${make}|${model}`] || ['1.4 Petrol', '1.6 Petrol', '2.0 Petrol', '1.5 Diesel'];
}

/**
 * @param {string} make
 * @param {string} model
 * @param {string} engine
 */
export function getEngineNosForVehicle(make, model, engine) {
  if (!make || !model || !engine) return [];
  return PARTS_ENGINE_NO_OPTIONS[`${make}|${model}|${engine}`] || ['Generic'];
}

/**
 * Build storefront products URL for parts finder searches.
 * @param {string} basePath e.g. `/store/demo-auto/products`
 * @param {object} input
 */
export function buildPartsProductsUrl(basePath, input = {}) {
  const params = new URLSearchParams();
  const {
    search,
    searchMode,
    brand,
    model,
    year,
    body,
    engine,
    engineNo,
    vehicleClass,
    vehicleType,
    category,
  } = input;

  if (searchMode && search) {
    params.set('search', String(search).trim());
    params.set('searchMode', searchMode);
  } else if (search) {
    params.set('search', String(search).trim());
  }

  if (brand) params.set('brand', brand);
  if (model) params.set('model', model);
  if (year) params.set('year', year);
  if (body) params.set('body', body);
  if (engine) params.set('engine', engine);
  if (engineNo) params.set('engineNo', engineNo);
  if (vehicleClass) params.set('class', vehicleClass);
  if (vehicleType) params.set('vehicleType', vehicleType);
  if (category) params.set('category', category);

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
