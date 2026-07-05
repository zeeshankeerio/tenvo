import { describe, it, expect } from 'vitest';
import {
  supportsFashionGulSections,
  resolveFashionHomeEdit,
  resolveFashionSaleMosaic,
} from '../fashionGulSections.js';

describe('fashionGulSections', () => {
  it('supports editorial and jewellery verticals', () => {
    expect(supportsFashionGulSections('garments')).toBe(true);
    expect(supportsFashionGulSections('gems-jewellery')).toBe(true);
    expect(supportsFashionGulSections('pharmacy')).toBe(false);
  });

  it('resolves Gul Ahmed home edit defaults for demo boutique', () => {
    const section = resolveFashionHomeEdit({}, 'boutique-fashion', 'demo-boutique', '/store/demo-boutique');
    expect(section?.title).toBe('The Home Edit');
    expect(section?.tiles.length).toBe(4);
    expect(section?.tiles[0].image).toContain('grid-item-1');
  });

  it('resolves sale mosaic with five columns', () => {
    const section = resolveFashionSaleMosaic({}, 'garments', 'demo-boutique', '/store/demo-boutique');
    expect(section?.title).toBe('Sale');
    expect(section?.columns.length).toBe(5);
    expect(section?.columns[0].tiles[0].label).toBe('Kids');
  });

  it('uses jewellery-specific defaults for demo jewellery', () => {
    const home = resolveFashionHomeEdit({}, 'gems-jewellery', 'demo-jewellery', '/store/demo-jewellery');
    expect(home?.title).toBe('The Jewellery Edit');
  });
});
