/**
 * SQL fragments for detecting membership SKUs in storefront order queries.
 * Keep in sync with `lib/memberships/membershipProductDetection.js` heuristics.
 */
export const MEMBERSHIP_PRODUCT_WHERE_SQL = `
  (
    lower(coalesce(p.category, '')) LIKE '%membership%'
    OR p.domain_data ? 'membershiptype'
    OR p.domain_data ? 'membership_type'
    OR lower(coalesce(p.name, '')) ~* '(membership|gym pass|gents gym|ladies section|membership pass)'
  )
`;

/** Count membership line items on an order (alias `o` = storefront_orders). */
export const MEMBERSHIP_ITEMS_COUNT_SUBQUERY = `
  (
    SELECT COUNT(*)::int
    FROM storefront_order_items oi
    JOIN products p ON p.id = oi.product_id AND p.business_id = o.business_id
    WHERE oi.order_id = o.id
      AND ${MEMBERSHIP_PRODUCT_WHERE_SQL}
  )
`;
