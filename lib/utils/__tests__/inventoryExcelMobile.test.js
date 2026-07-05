import { describe, expect, it } from 'vitest';
import {
  buildExcelMobileHiddenColumnKeys,
  EXCEL_MOBILE_ESSENTIAL_KEYS,
  filterExcelMobileEditableColumns,
  resolveExcelMobileColumnWidth,
  resolveExcelMobileEssentialKeys,
} from '@/lib/utils/inventoryExcelMobile';

describe('inventoryExcelMobile', () => {
  it('hides non-essential columns on mobile profile', () => {
    const columns = [
      { accessorKey: 'name' },
      { accessorKey: 'hsn_code' },
      { accessorKey: 'location' },
      { id: 'status_dot' },
    ];
    const hidden = buildExcelMobileHiddenColumnKeys(columns);
    expect(hidden.has('hsn_code')).toBe(true);
    expect(hidden.has('location')).toBe(true);
    expect(EXCEL_MOBILE_ESSENTIAL_KEYS.has('name')).toBe(true);
  });

  it('includes domain_data keys for marketplace-style verticals', () => {
    const keys = resolveExcelMobileEssentialKeys('auto-marketplace', {});
    const hasDomain = [...keys].some((k) => k.startsWith('domain_data.'));
    expect(hasDomain).toBe(true);
  });

  it('filters editable card columns', () => {
    const cols = filterExcelMobileEditableColumns(
      [
        { accessorKey: 'name' },
        { accessorKey: 'value', readOnly: true },
        { accessorKey: 'mrp' },
      ],
      new Set(['mrp'])
    );
    expect(cols.map((c) => c.accessorKey)).toEqual(['name']);
  });

  it('widens touch columns when touchOptimized', () => {
    expect(resolveExcelMobileColumnWidth({ accessorKey: 'name' }, true)).toBe(160);
    expect(resolveExcelMobileColumnWidth({ accessorKey: 'unknown_field' }, true)).toBe(96);
    expect(resolveExcelMobileColumnWidth({ accessorKey: 'name' }, false)).toBeNull();
  });
});
