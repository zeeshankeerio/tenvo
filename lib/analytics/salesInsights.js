/**
 * Unified sales analytics SQL — invoices, POS, and storefront orders.
 * Single source for hub Sales tab and premium analytics bundles.
 */

/** Non-cancelled storefront orders count toward gross sales (stock already committed). */
export const STOREFRONT_GROSS_SALE_FILTER = `
  LOWER(COALESCE(o.status, '')) NOT IN ('cancelled', 'refunded', 'voided')
`;

/** Paid storefront orders only — for cash-collected KPIs. */
export const STOREFRONT_PAID_FILTER = `
  ${STOREFRONT_GROSS_SALE_FILTER.trim()}
  AND LOWER(COALESCE(o.payment_status, '')) = 'paid'
`;

export const INVOICE_SALE_FILTER = `
  (i.is_deleted = false OR i.is_deleted IS NULL)
  AND LOWER(COALESCE(i.status, '')) NOT IN ('draft', 'voided', 'cancelled')
`;

export const POS_SALE_FILTER = `
  pt.is_voided = false
  AND LOWER(COALESCE(pt.payment_status, '')) = 'completed'
`;

/** Params: $1 business_id, $2 trend_anchor::date */
export const SALES_TREND_UNIFIED_SQL = `
  WITH anchor AS (SELECT $2::date AS d),
  months AS (
    SELECT generate_series(
      date_trunc('month', (SELECT d FROM anchor)) - INTERVAL '5 months',
      date_trunc('month', (SELECT d FROM anchor)),
      '1 month'::interval
    ) AS month
  ),
  invoice_sales AS (
    SELECT
      date_trunc('month', i.date) AS month,
      COALESCE(SUM(i.grand_total), 0) AS sales,
      COALESCE(COUNT(i.id), 0) AS count
    FROM invoices i
    CROSS JOIN anchor a
    WHERE i.business_id = $1
      AND ${INVOICE_SALE_FILTER}
      AND i.date >= date_trunc('month', a.d) - INTERVAL '5 months'
      AND i.date::date <= a.d
    GROUP BY 1
  ),
  pos_sales AS (
    SELECT
      date_trunc('month', pt.created_at) AS month,
      COALESCE(SUM(pt.total_amount), 0) AS sales,
      COALESCE(COUNT(pt.id), 0) AS count
    FROM pos_transactions pt
    CROSS JOIN anchor a
    WHERE pt.business_id = $1
      AND ${POS_SALE_FILTER}
      AND pt.created_at >= date_trunc('month', a.d) - INTERVAL '5 months'
      AND pt.created_at::date <= a.d
    GROUP BY 1
  ),
  storefront_sales AS (
    SELECT
      date_trunc('month', o.created_at) AS month,
      COALESCE(SUM(o.total_amount), 0) AS sales,
      COALESCE(COUNT(o.id), 0) AS count
    FROM storefront_orders o
    CROSS JOIN anchor a
    WHERE o.business_id = $1
      AND ${STOREFRONT_GROSS_SALE_FILTER}
      AND o.created_at >= date_trunc('month', a.d) - INTERVAL '5 months'
      AND o.created_at::date <= a.d
    GROUP BY 1
  ),
  monthly_profit AS (
    SELECT
      date_trunc('month', e.transaction_date) AS month,
      COALESCE(SUM(CASE WHEN LOWER(a.type) IN ('revenue', 'income') THEN (e.credit - e.debit) ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN LOWER(a.type) = 'expense' THEN (e.debit - e.credit) ELSE 0 END), 0) AS profit
    FROM gl_entries e
    JOIN gl_accounts a ON e.account_id = a.id
    CROSS JOIN anchor an
    WHERE a.business_id = $1
      AND e.transaction_date >= date_trunc('month', an.d) - INTERVAL '5 months'
      AND e.transaction_date::date <= an.d
    GROUP BY 1
  )
  SELECT
    to_char(m.month, 'Mon') AS date,
    COALESCE(inv.sales, 0) + COALESCE(pos.sales, 0) + COALESCE(sf.sales, 0) AS sales,
    COALESCE(inv.count, 0) + COALESCE(pos.count, 0) + COALESCE(sf.count, 0) AS count,
    COALESCE(p.profit, 0) AS profit
  FROM months m
  LEFT JOIN invoice_sales inv ON inv.month = m.month
  LEFT JOIN pos_sales pos ON pos.month = m.month
  LEFT JOIN storefront_sales sf ON sf.month = m.month
  LEFT JOIN monthly_profit p ON p.month = m.month
  ORDER BY m.month ASC
`;

/** Params: $1 business_id, $2 limit, $3 from, $4 to */
export const TOP_MOVING_PRODUCTS_UNIFIED_SQL = `
  WITH line AS (
    SELECT
      COALESCE(ii.product_id::text, 'nolink:' || ii.id::text) AS product_key,
      COALESCE(p.name, NULLIF(TRIM(ii.name), ''), 'Unknown') AS name,
      COALESCE(p.category, 'Uncategorized') AS category,
      SUM(COALESCE(ii.quantity, 0)) AS volume,
      SUM(
        COALESCE(
          ii.total_amount,
          COALESCE(ii.unit_price, 0) * COALESCE(ii.quantity, 0)
            + COALESCE(ii.tax_amount, 0)
            - COALESCE(ii.discount_amount, 0)
        )
      ) AS revenue
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE i.business_id = $1
      AND ${INVOICE_SALE_FILTER}
      AND i.date::date >= $3::date
      AND i.date::date <= $4::date
    GROUP BY product_key, COALESCE(p.name, NULLIF(TRIM(ii.name), ''), 'Unknown'), COALESCE(p.category, 'Uncategorized')

    UNION ALL

    SELECT
      p.id::text AS product_key,
      COALESCE(p.name, 'Unknown') AS name,
      COALESCE(p.category, 'Uncategorized') AS category,
      SUM(pti.quantity) AS volume,
      SUM(COALESCE(pti.total_amount, pti.unit_price * pti.quantity)) AS revenue
    FROM pos_transaction_items pti
    JOIN pos_transactions pt ON pt.id = pti.transaction_id
    JOIN products p ON p.id = pti.product_id
    WHERE pt.business_id = $1
      AND ${POS_SALE_FILTER}
      AND pt.created_at::date >= $3::date
      AND pt.created_at::date <= $4::date
      AND pti.product_id IS NOT NULL
    GROUP BY p.id, p.name, p.category

    UNION ALL

    SELECT
      p.id::text AS product_key,
      COALESCE(p.name, soi.product_name, 'Unknown') AS name,
      COALESCE(p.category, 'Uncategorized') AS category,
      SUM(soi.quantity) AS volume,
      SUM(COALESCE(soi.total_price, soi.unit_price * soi.quantity)) AS revenue
    FROM storefront_order_items soi
    JOIN storefront_orders o ON o.id = soi.order_id
    LEFT JOIN products p ON p.id = soi.product_id
    WHERE o.business_id = $1
      AND ${STOREFRONT_GROSS_SALE_FILTER}
      AND o.created_at::date >= $3::date
      AND o.created_at::date <= $4::date
      AND soi.product_id IS NOT NULL
    GROUP BY p.id, p.name, p.category, soi.product_name
  )
  SELECT product_key, name, category, SUM(volume) AS volume, SUM(revenue) AS revenue
  FROM line
  GROUP BY product_key, name, category
  ORDER BY revenue DESC
  LIMIT $2
`;

/** Params: $1 business_id, $2 dfrom, $3 dto */
export const REVENUE_GROWTH_UNIFIED_SQL = `
  WITH b AS (
    SELECT $2::date AS dfrom, $3::date AS dto, ($3::date - $2::date + 1) AS span_days
  )
  SELECT
    (
      (SELECT COALESCE(SUM(i.grand_total), 0)
       FROM invoices i, b
       WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
         AND i.date::date BETWEEN b.dfrom AND b.dto)
      + (SELECT COALESCE(SUM(pt.total_amount), 0)
         FROM pos_transactions pt, b
         WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
           AND pt.created_at::date BETWEEN b.dfrom AND b.dto)
      + (SELECT COALESCE(SUM(o.total_amount), 0)
         FROM storefront_orders o, b
         WHERE o.business_id = $1 AND ${STOREFRONT_GROSS_SALE_FILTER}
           AND o.created_at::date BETWEEN b.dfrom AND b.dto)
    ) AS cur_total,
    (
      (SELECT COALESCE(SUM(i.grand_total), 0)
       FROM invoices i, b
       WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
         AND i.date::date BETWEEN (b.dfrom - b.span_days) AND (b.dfrom - 1))
      + (SELECT COALESCE(SUM(pt.total_amount), 0)
         FROM pos_transactions pt, b
         WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
           AND pt.created_at::date BETWEEN (b.dfrom - b.span_days) AND (b.dfrom - 1))
      + (SELECT COALESCE(SUM(o.total_amount), 0)
         FROM storefront_orders o, b
         WHERE o.business_id = $1 AND ${STOREFRONT_GROSS_SALE_FILTER}
           AND o.created_at::date BETWEEN (b.dfrom - b.span_days) AND (b.dfrom - 1))
    ) AS prev_total
  FROM b
`;

/** Params: $1 business_id, $2 cur_start, $3 cur_end, $4 prev_start, $5 prev_end */
export const SALES_KPI_PERIOD_SQL = `
  SELECT
    (
      (SELECT COALESCE(SUM(i.grand_total), 0) FROM invoices i
       WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
         AND i.date::date BETWEEN $2::date AND $3::date)
      + (SELECT COALESCE(SUM(pt.total_amount), 0) FROM pos_transactions pt
         WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
           AND pt.created_at::date BETWEEN $2::date AND $3::date)
      + (SELECT COALESCE(SUM(o.total_amount), 0) FROM storefront_orders o
         WHERE o.business_id = $1 AND ${STOREFRONT_GROSS_SALE_FILTER}
           AND o.created_at::date BETWEEN $2::date AND $3::date)
    ) AS gross_total,
    (
      (SELECT COALESCE(COUNT(i.id), 0) FROM invoices i
       WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
         AND i.date::date BETWEEN $2::date AND $3::date)
      + (SELECT COALESCE(COUNT(pt.id), 0) FROM pos_transactions pt
         WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
           AND pt.created_at::date BETWEEN $2::date AND $3::date)
      + (SELECT COALESCE(COUNT(o.id), 0) FROM storefront_orders o
         WHERE o.business_id = $1 AND ${STOREFRONT_GROSS_SALE_FILTER}
           AND o.created_at::date BETWEEN $2::date AND $3::date)
    ) AS order_count,
    (
      (SELECT COALESCE(SUM(i.grand_total), 0) FROM invoices i
       WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
         AND LOWER(COALESCE(i.payment_status, i.status, '')) IN ('paid', 'partial')
         AND i.date::date BETWEEN $2::date AND $3::date)
      + (SELECT COALESCE(SUM(pt.total_amount), 0) FROM pos_transactions pt
         WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
           AND pt.created_at::date BETWEEN $2::date AND $3::date)
      + (SELECT COALESCE(SUM(o.total_amount), 0) FROM storefront_orders o
         WHERE o.business_id = $1 AND ${STOREFRONT_PAID_FILTER}
           AND o.created_at::date BETWEEN $2::date AND $3::date)
    ) AS collected_total,
    (
      SELECT COUNT(DISTINCT x.customer_key) FROM (
        SELECT COALESCE(i.customer_id::text, 'anon:' || i.id::text) AS customer_key
        FROM invoices i
        WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
          AND i.date::date BETWEEN $2::date AND $3::date
        UNION
        SELECT COALESCE(pt.customer_id::text, 'walkin:' || pt.id::text)
        FROM pos_transactions pt
        WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
          AND pt.created_at::date BETWEEN $2::date AND $3::date
        UNION
        SELECT COALESCE(NULLIF(TRIM(o.customer_email), ''), 'guest:' || o.id::text)
        FROM storefront_orders o
        WHERE o.business_id = $1 AND ${STOREFRONT_GROSS_SALE_FILTER}
          AND o.created_at::date BETWEEN $2::date AND $3::date
      ) x
    ) AS active_customers
`;

/** Params: $1 business_id, $2 limit */
export const RECENT_SALES_ACTIVITY_SQL = `
  (
    SELECT
      'invoice' AS source,
      i.id::text AS id,
      i.invoice_number AS ref,
      COALESCE(c.name, i.customer_name, 'Walk-in') AS party,
      i.grand_total AS amount,
      COALESCE(i.payment_status, i.status) AS payment_status,
      i.status,
      i.date AS occurred_at
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.business_id = $1 AND ${INVOICE_SALE_FILTER}
  )
  UNION ALL
  (
    SELECT
      'pos',
      pt.id::text,
      pt.transaction_number,
      COALESCE(c.name, 'Walk-in'),
      pt.total_amount,
      pt.payment_status,
      'completed',
      pt.created_at
    FROM pos_transactions pt
    LEFT JOIN customers c ON c.id = pt.customer_id
    WHERE pt.business_id = $1 AND ${POS_SALE_FILTER}
  )
  UNION ALL
  (
    SELECT
      'storefront',
      o.id::text,
      o.order_number,
      COALESCE(NULLIF(TRIM(o.customer_name), ''), o.customer_email, 'Online guest'),
      o.total_amount,
      o.payment_status,
      o.status,
      o.created_at
    FROM storefront_orders o
    WHERE o.business_id = $1 AND ${STOREFRONT_GROSS_SALE_FILTER}
  )
  ORDER BY occurred_at DESC
  LIMIT $2
`;

/**
 * @param {import('pg').QueryResultRow} row
 */
export function mapSalesTrendRow(row) {
  return {
    date: row.date,
    revenue: parseFloat(row.sales) || 0,
    profit: parseFloat(row.profit) || 0,
    orderCount: parseInt(row.count, 10) || 0,
    sales: parseInt(row.count, 10) || 0,
    expenses: 0,
  };
}

/**
 * @param {import('pg').QueryResultRow} row
 */
export function mapTopProductRow(row) {
  return {
    name: row.name,
    revenue: parseFloat(row.revenue) || 0,
    value: parseFloat(row.revenue) || 0,
    volume: Math.round(parseFloat(row.volume) || 0),
    sales: Math.round(parseFloat(row.volume) || 0),
    category: row.category,
  };
}
