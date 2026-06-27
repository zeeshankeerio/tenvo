'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

/**
 * ProductBreadcrumbs
 *
 * Accepts two calling conventions:
 *   1. items[], generic: [{ label, href? }]
 *   2. category + categorySlug + productName, product-detail shorthand
 */
export function ProductBreadcrumbs({ items, businessDomain, category, categorySlug, productName }) {
  // Build items array from shorthand props if items not provided
  const breadcrumbs = items || [
    ...(category ? [{ label: category, href: categorySlug ? `/store/${businessDomain}/products?category=${categorySlug}` : `/store/${businessDomain}/products` }] : []),
    ...(productName ? [{ label: productName }] : []),
  ];

  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 py-4 flex-wrap" aria-label="Breadcrumb">
      <Link
        href={`/store/${businessDomain}`}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>

      {breadcrumbs.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          {item.href ? (
            <Link href={item.href} className="hover:text-gray-900 transition-colors truncate max-w-[160px]">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
