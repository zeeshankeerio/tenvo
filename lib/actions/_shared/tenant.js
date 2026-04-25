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

function normalizeEntityKey(entityType) {
  return String(entityType || '').trim().toLowerCase();
}

export async function assertEntityBelongsToBusiness(client, entityType, id, businessId, messageLabel = null) {
  if (!id) return;

  const key = normalizeEntityKey(entityType);
  const table = OWNED_ENTITY_TABLES[key];
  if (!table) {
    throw new Error(`Unsupported ownership check for entity: ${entityType}`);
  }

  const result = await client.query(
    `SELECT 1 FROM ${table} WHERE id = $1 AND business_id = $2 LIMIT 1`,
    [id, businessId]
  );

  if (result.rows.length === 0) {
    throw new Error(`${messageLabel || key} does not belong to this business`);
  }
}
