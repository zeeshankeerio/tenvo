import { describe, it, expect } from 'vitest';
import {
  normalizeInventoryMobileView,
  DEFAULT_INVENTORY_MOBILE_VIEW,
  INVENTORY_MOBILE_VIEWS,
} from '@/lib/utils/inventoryMobileView';
import { resolveExcelMobileEssentialKeys } from '@/lib/utils/inventoryExcelMobile';
import { buildInventoryGridColumns } from '@/lib/utils/inventoryGridColumns';
import { getDomainKnowledge } from '@/lib/domainKnowledge';

describe('inventoryMobileView', () => {
  it('migrates legacy list preference to visual', () => {
    expect(normalizeInventoryMobileView('list')).toBe('visual');
    expect(normalizeInventoryMobileView('busy')).toBe('busy');
    expect(normalizeInventoryMobileView('bogus')).toBe(DEFAULT_INVENTORY_MOBILE_VIEW);
  });

  it('exposes visual, busy, and cards modes', () => {
    expect(INVENTORY_MOBILE_VIEWS.visual.id).toBe('visual');
    expect(INVENTORY_MOBILE_VIEWS.busy.id).toBe('busy');
    expect(INVENTORY_MOBILE_VIEWS.cards.id).toBe('cards');
  });
});

describe('visual/busy domain column parity', () => {
  const category = 'garments';
  const options = {
    countryIso: 'PK',
    domainKnowledge: getDomainKnowledge(category, { countryIso: 'PK' }),
  };

  it('includes domain_data columns in visual and busy modes', () => {
    const visual = buildInventoryGridColumns(category, { mode: 'visual', ...options });
    const busy = buildInventoryGridColumns(category, { mode: 'busy', ...options });
    const visualDomain = visual.filter((c) => c.accessorKey?.startsWith('domain_data.'));
    const busyDomain = busy.filter((c) => c.accessorKey?.startsWith('domain_data.'));
    expect(visualDomain.length).toBeGreaterThan(0);
    expect(busyDomain.length).toBe(visualDomain.length);
  });

  it('mobile essential keys include top domain fields for garments', () => {
    const essential = resolveExcelMobileEssentialKeys(category, options);
    const domainKeys = [...essential].filter((k) => k.startsWith('domain_data.'));
    expect(domainKeys.length).toBeGreaterThan(0);
    expect(domainKeys.length).toBeLessThanOrEqual(4);
  });
});
