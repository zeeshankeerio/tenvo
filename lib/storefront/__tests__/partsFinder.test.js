import { describe, expect, it } from 'bun:test';
import {
  buildPartsProductsUrl,
  getModelsForMake,
  getEnginesForVehicle,
  isAutoPartsFinderStore,
  buildAutoPartsSpecifications,
} from '../partsFinder.js';

describe('partsFinder', () => {
  it('builds vehicle search URLs with structured params', () => {
    const url = buildPartsProductsUrl('/store/demo/products', {
      brand: 'Toyota',
      model: 'Corolla',
      year: '2020',
      body: 'Sedan',
      engine: '1.6 Petrol',
      engineNo: '2NR-FE',
      vehicleClass: 'Passenger',
      vehicleType: 'car',
    });
    expect(url).toContain('brand=Toyota');
    expect(url).toContain('model=Corolla');
    expect(url).toContain('year=2020');
    expect(url).toContain('body=Sedan');
    expect(url).toContain('engine=1.6');
    expect(url).toContain('engineNo=2NR-FE');
    expect(url).toContain('class=Passenger');
    expect(url).toContain('vehicleType=car');
  });

  it('builds part number search URLs', () => {
    const url = buildPartsProductsUrl('/store/demo/products', {
      search: '04465-13020',
      searchMode: 'partNumber',
    });
    expect(url).toBe('/store/demo/products?search=04465-13020&searchMode=partNumber');
  });

  it('filters SG models when sgOnly is true', () => {
    const sg = getModelsForMake('Toyota', { sgOnly: true });
    const all = getModelsForMake('Toyota', { sgOnly: false });
    expect(sg).toContain('Corolla');
    expect(all.length).toBeGreaterThan(sg.length);
  });

  it('returns engines for known make/model pairs', () => {
    const engines = getEnginesForVehicle('Toyota', 'Corolla');
    expect(engines).toContain('1.6 Petrol');
  });

  it('enables vehicle finder only for auto-parts and auto-workshop', () => {
    expect(isAutoPartsFinderStore('auto-parts')).toBe(true);
    expect(isAutoPartsFinderStore('auto-workshop')).toBe(true);
    expect(isAutoPartsFinderStore('hardware-sanitary')).toBe(false);
    expect(isAutoPartsFinderStore('industrial-parts')).toBe(false);
    expect(isAutoPartsFinderStore('vehicle-dealership')).toBe(false);
    expect(isAutoPartsFinderStore('auto-marketplace')).toBe(false);
  });

  it('builds specifications from domain_data keys used by storefront filters', () => {
    const specs = buildAutoPartsSpecifications({
      partnumber: '04465-13020',
      oemnumber: '90915-YZZD2',
      vehiclemake: 'Toyota',
      vehiclemodel: 'Corolla',
      modelyear: '2014-2024',
      vehiclecompatibility: 'Toyota Corolla 2014-2024',
    });
    expect(specs['Part number']).toBe('04465-13020');
    expect(specs['OEM number']).toBe('90915-YZZD2');
    expect(specs['Vehicle make']).toBe('Toyota');
    expect(specs['Vehicle compatibility']).toBe('Toyota Corolla 2014-2024');
  });
});
