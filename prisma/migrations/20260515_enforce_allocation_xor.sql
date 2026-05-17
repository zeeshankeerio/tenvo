-- Enforce XOR constraint on payment_allocations
ALTER TABLE payment_allocations
ADD CONSTRAINT chk_allocation_xor
CHECK (
    (invoice_id IS NOT NULL AND purchase_id IS NULL) OR
    (invoice_id IS NULL AND purchase_id IS NOT NULL)
);

-- Optional: Add index for performance on filtered lookups
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id_not_null ON payment_allocations(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_allocations_purchase_id_not_null ON payment_allocations(purchase_id) WHERE purchase_id IS NOT NULL;
