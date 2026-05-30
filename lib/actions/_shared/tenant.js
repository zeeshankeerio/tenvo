import { db, withBusinessContext } from '@/lib/db';

const OWNED_ENTITY_TABLES = {
  product: 'products',
  vendor: 'vendors',
  warehouse: 'warehouse_locations',
  customer: 'customers',
  purchase: 'purchases',
  invoice: 'invoices',
  // Phase 1 additions - expanded entity coverage
  invoice_item: 'invoice_items',
  purchase_item: 'purchase_items',
  sales_order: 'sales_orders',
  quotation: 'quotations',
  delivery_challan: 'delivery_challans',
  pos_transaction: 'pos_transactions',
  journal_entry: 'journal_entries',
  gl_account: 'gl_accounts',
  product_batch: 'product_batches',
  product_serial: 'product_serials',
  product_variant: 'product_variants',
  payment: 'payments',
  expense: 'expenses',
  stock_movement: 'stock_movements',
  stock_transfer: 'stock_transfers',
  production_order: 'production_orders',
  bom: 'boms',
  pos_session: 'pos_sessions',
  pos_terminal: 'pos_terminals',
  credit_note: 'credit_notes',
  fiscal_period: 'fiscal_periods',
};

// Reverse map: table name -> Prisma model name
// Prisma model names match the table names in our schema
const PRISMA_MODEL_MAP = {
  products: 'products',
  vendors: 'vendors',
  warehouse_locations: 'warehouse_locations',
  customers: 'customers',
  purchases: 'purchases',
  invoices: 'invoices',
  invoice_items: 'invoice_items',
  purchase_items: 'purchase_items',
  sales_orders: 'sales_orders',
  quotations: 'quotations',
  delivery_challans: 'delivery_challans',
  pos_transactions: 'pos_transactions',
  journal_entries: 'journal_entries',
  gl_accounts: 'gl_accounts',
  product_batches: 'product_batches',
  product_serials: 'product_serials',
  product_variants: 'product_variants',
  payments: 'payments',
  expenses: 'expenses',
  stock_movements: 'stock_movements',
  stock_transfers: 'stock_transfers',
  production_orders: 'production_orders',
  boms: 'boms',
  pos_sessions: 'pos_sessions',
  pos_terminals: 'pos_terminals',
  credit_notes: 'credit_notes',
  fiscal_periods: 'fiscal_periods',
};

function normalizeEntityKey(entityType) {
  return String(entityType || '').trim().toLowerCase();
}

/**
 * Prisma-native tenant isolation assertion.
 * Verifies that an entity belongs to the given business.
 *
 * Supports two modes:
 * 1. Prisma mode (default): Uses db or a Prisma transaction client
 * 2. Legacy pg pool mode: If `client` has a `.query` method, uses raw SQL
 *
 * @param {object|null} client - Prisma tx client, pg PoolClient, or null (uses global db)
 * @param {string} entityType - Entity key (e.g. 'invoice', 'product')
 * @param {string} id - Entity UUID
 * @param {string} businessId - Business UUID
 * @param {string|null} messageLabel - Optional custom error label
 */
export async function assertEntityBelongsToBusiness(client, entityType, id, businessId, messageLabel = null) {
  if (!id) return;

  const key = normalizeEntityKey(entityType);
  const table = OWNED_ENTITY_TABLES[key];
  if (!table) {
    throw new Error(`Unsupported ownership check for entity: ${entityType}`);
  }

  // Legacy pg pool client path (has .query method)
  if (client && typeof client.query === 'function') {
    const result = await client.query(
      `SELECT 1 FROM ${table} WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [id, businessId]
    );
    if (result.rows.length === 0) {
      throw new Error(`${messageLabel || key} does not belong to this business`);
    }
    return;
  }

  // Prisma path (client is a Prisma tx, or null to use global db)
  const prismaModel = PRISMA_MODEL_MAP[table];
  if (!prismaModel) {
    throw new Error(`No Prisma model mapping for table: ${table}`);
  }

  const prismaClient = client || db;

  if (!client) {
    const record = await withBusinessContext(businessId, () =>
      prismaClient[prismaModel].findFirst({
        where: { id },
        select: { id: true },
      })
    );
    if (!record) {
      throw new Error(`${messageLabel || key} does not belong to this business`);
    }
    return;
  }

  const record = await prismaClient[prismaModel].findFirst({
    where: { id, business_id: businessId },
    select: { id: true },
  });

  if (!record) {
    throw new Error(`${messageLabel || key} does not belong to this business`);
  }
}
