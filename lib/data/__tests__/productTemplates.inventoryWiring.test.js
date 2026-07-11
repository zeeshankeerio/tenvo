import { describe, it, expect } from 'vitest';
import {
  getTemplatesForDomain,
  normalizeProductTemplate,
} from '@/lib/data/productTemplates.js';
import {
  detectColumnMapping,
  nestMappedDomainData,
} from '@/lib/utils/inventoryColumnMapping.js';

describe('product templates + inventory column mapping', () => {
  it('resolves textile alias to wholesale templates', () => {
    expect(getTemplatesForDomain('textile').length).toBeGreaterThan(0);
    expect(getTemplatesForDomain('textile-wholesale').length).toBe(
      getTemplatesForDomain('textile').length
    );
  });

  it('nests textile flat keys and costPrice for composite save', () => {
    const raw = getTemplatesForDomain('textile-wholesale')[0];
    const normalized = normalizeProductTemplate(raw, 'textile');
    expect(normalized.cost_price).toBe(raw.costPrice);
    expect(normalized.costPrice).toBeUndefined();
    expect(normalized.domain_data).toMatchObject({
      articleno: raw.articleno,
      designno: raw.designno,
      fabrictype: raw.fabrictype,
      widtharz: raw.widtharz,
    });
    expect(normalized.articleno).toBeUndefined();
  });

  it('maps textile Article No to domain_data not sku', () => {
    const mapping = detectColumnMapping(
      ['Article Name', 'Article No', 'Design No', 'Fabric Type', 'Rate', 'Cost'],
      { category: 'textile-wholesale' }
    );
    expect(mapping.name).toBe('Article Name');
    expect(mapping['domain_data.articleno']).toBe('Article No');
    expect(mapping['domain_data.designno']).toBe('Design No');
    expect(mapping['domain_data.fabrictype']).toBe('Fabric Type');
    expect(mapping.sku).toBeUndefined();
    expect(mapping.price).toBe('Rate');
    expect(mapping.cost_price).toBe('Cost');
  });

  it('nests mapped domain_data.* keys', () => {
    const nested = nestMappedDomainData({
      name: 'Lawn Suit',
      'domain_data.articleno': 'GA-1',
      'domain_data.designno': 'D-2',
    });
    expect(nested.domain_data).toEqual({ articleno: 'GA-1', designno: 'D-2' });
    expect(nested['domain_data.articleno']).toBeUndefined();
  });
});
