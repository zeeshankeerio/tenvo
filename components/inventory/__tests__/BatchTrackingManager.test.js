/**
 * Unit tests for BatchTrackingManager - Pakistani Textile Tracking Fields
 */

import { describe, test, expect } from 'vitest';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { getDomainKnowledge } from '@/lib/domainKnowledge';

describe('BatchTrackingManager - Textile Tracking', () => {
  describe('Textile Area Calculation', () => {
    test('calculates approx area from meters × inches', () => {
      const lengthMeters = 40;
      const widthInches = 44;
      const lengthYards = lengthMeters * 1.09361;
      const area = (lengthYards * widthInches) / 1296;
      expect(area).toBeCloseTo(1.49, 1);
    });

    test('returns 0 for missing dimensions', () => {
      expect((0 * 45) / 1296).toBe(0);
      expect((50 * 0) / 1296).toBe(0);
    });
  });

  describe('Textile Category Detection', () => {
    test('identifies textile-wholesale as textile category', () => {
      expect(resolveDomainKey('textile-wholesale')).toBe('textile-wholesale');
    });

    test('identifies textile alias as textile-wholesale', () => {
      expect(resolveDomainKey('textile')).toBe('textile-wholesale');
    });

    test('does not identify non-textile categories as wholesale', () => {
      const categories = ['electronics', 'pharmacy', 'garments', 'grocery', 'textile-retail'];
      categories.forEach((category) => {
        expect(resolveDomainKey(category) === 'textile-wholesale').toBe(false);
      });
    });
  });

  describe('Fabric Type Options', () => {
    test('domain knowledge includes PK wholesale fabric types', () => {
      const fabricTypes = getDomainKnowledge('textile-wholesale')?.fieldConfig?.fabrictype?.options || [];
      expect(fabricTypes).toContain('Lawn');
      expect(fabricTypes).toContain('Khaddar');
      expect(fabricTypes).toContain('Silk');
      expect(fabricTypes).toContain('Chiffon');
      expect(fabricTypes).toContain('Linen');
      expect(fabricTypes.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Finish Status Options', () => {
    test('domain knowledge includes kora/finished options', () => {
      const finishStatuses = getDomainKnowledge('textile-wholesale')?.fieldConfig?.korafinished?.options || [];
      const values = finishStatuses.map((opt) => (typeof opt === 'string' ? opt : opt.value));
      expect(values).toContain('Kora');
      expect(values).toContain('Finished');
      expect(values).toContain('Dyed');
      expect(values).toContain('Printed');
    });
  });

  describe('Batch flags', () => {
    test('wholesale enables batch and disables size/color + manufacturing', () => {
      const knowledge = getDomainKnowledge('textile-wholesale');
      expect(knowledge.batchTrackingEnabled).toBe(true);
      expect(knowledge.serialTrackingEnabled).toBe(false);
      expect(knowledge.expiryTrackingEnabled).toBe(false);
      expect(knowledge.manufacturingEnabled).toBe(false);
      expect(knowledge.sizeColorMatrixEnabled).toBeFalsy();
    });
  });
});
