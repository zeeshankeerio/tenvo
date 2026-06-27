/**
 * Rich seed products for vehicle dealership demos.
 * Default catalog: Tenvo Vehicles template (cars + auto store starter inventory).
 * Singapore VINCAR inventory kept in VINCAR_LEGACY_PRODUCTS for profile=vincar seeds.
 */
import { stockImage } from './richProductCatalog.js';
import {
  SEHGAL_SHOWROOM_PRODUCTS,
  SEHGAL_SHOWROOM_CATEGORIES,
} from './sehgalShowroomCatalog.js';

export { SEHGAL_SHOWROOM_PRODUCTS, SEHGAL_SHOWROOM_CATEGORIES };

/** Primary demo seed (Sehgal showroom). */
export const VEHICLE_DEALERSHIP_SEED_PRODUCTS = SEHGAL_SHOWROOM_PRODUCTS;

/** @deprecated Use SEHGAL_SHOWROOM_CATEGORIES */
export const VEHICLE_DEALERSHIP_CATEGORIES = SEHGAL_SHOWROOM_CATEGORIES;

/** Singapore VINCAR-style inventory for profile=vincar demos. */
export const VINCAR_LEGACY_PRODUCTS = [
  {
    name: 'GAC E9 Electric MPV, Luxury 7-Seater',
    brand: 'GAC',
    category: 'New Cars',
    unit: 'unit',
    price: 198800,
    marketPrices: { SG: 198800, PK: 18500000 },
    compare_price: 205000,
    cost_price: 175000,
    stock: 4,
    sku: 'GAC-E9-2026',
    description: 'Flagship electric MPV with 700km CLTC range, dual motor AWD, and premium captain seats.',
    image_url: stockImage('1593941707882-a5bba14938c7', 1200),
    is_featured: true,
    domain_data: {
      vehiclemake: 'GAC',
      vehiclemodel: 'E9',
      modelyear: '2026',
      mileage: '0',
      fueltype: 'Electric',
      transmission: 'Single-speed',
      bodytype: 'MPV',
      condition: 'new',
    },
  },
  {
    name: 'Toyota Noah Hybrid 1.8 X',
    brand: 'Toyota',
    category: 'New Cars',
    unit: 'unit',
    price: 168888,
    marketPrices: { SG: 168888, PK: 15800000 },
    cost_price: 152000,
    stock: 6,
    sku: 'TYT-NOAH-HYB',
    description: 'Eight-seat family MPV with Toyota Safety Sense and outstanding fuel economy.',
    image_url: stockImage('1549317661-bd32c8ce0db2', 1200),
    is_featured: true,
    domain_data: {
      vehiclemake: 'Toyota',
      vehiclemodel: 'Noah Hybrid',
      modelyear: '2025',
      mileage: '0',
      fueltype: 'Hybrid',
      transmission: 'CVT',
      bodytype: 'MPV',
      condition: 'new',
    },
  },
];
