'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  buildClothingAttributeRows,
  buildPartsAttributeRows,
  buildStorefrontFilterHref,
} from '@/lib/storefront/productAttributeChips';

/**
 * Domain-aware product attribute rows with optional filter links.
 */
export function ProductAttributeList({
  product,
  businessDomain,
  showFashionMeta = false,
  showPartsMeta = false,
  /** Keys already rendered as top-level badges (e.g. sourcing on ProductInfo). */
  hideBadgeKeys = [],
}) {
  const rows = showFashionMeta
    ? buildClothingAttributeRows(product)
    : showPartsMeta
      ? buildPartsAttributeRows(product)
      : [];

  const visibleRows = rows.filter(
    (row) => !(row.badge && hideBadgeKeys.includes(row.key))
  );

  if (!visibleRows.length && !product.sku) return null;

  return (
    <dl className="space-y-1.5 text-sm text-gray-500">
      {visibleRows.map((row) => {
        const filterVal = row.filterValue ?? row.value;
        const href =
          row.filterKey && businessDomain
            ? buildStorefrontFilterHref(businessDomain, row.filterKey, filterVal)
            : null;

        const valueNode = href ? (
          <Link href={href} className="font-medium text-gray-800 hover:underline">
            {row.value}
          </Link>
        ) : (
          <span className="font-medium text-gray-800">{row.value}</span>
        );

        if (row.badge) {
          return (
            <div key={row.key} className="flex flex-wrap items-center gap-2">
              <dt className="sr-only">{row.label}</dt>
              <dd>
                <Badge
                  variant={row.value === 'Imported' ? 'secondary' : 'outline'}
                  className="text-xs capitalize"
                >
                  {row.value}
                </Badge>
              </dd>
            </div>
          );
        }

        return (
          <div key={row.key} className="flex flex-wrap gap-x-1">
            <dt className="shrink-0">{row.label}:</dt>
            <dd>{valueNode}</dd>
          </div>
        );
      })}
      {product.sku ? (
        <div className="flex flex-wrap gap-x-1 pt-1 border-t border-gray-100">
          <dt className="shrink-0">SKU:</dt>
          <dd className="font-medium text-gray-700 tabular-nums">{product.sku}</dd>
        </div>
      ) : null}
    </dl>
  );
}
