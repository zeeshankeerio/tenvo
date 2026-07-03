import { isBatchTrackingEnabled, isSerialTrackingEnabled } from '@/lib/utils/domainHelpers';
import {
  filterMeaningfulBatches,
  filterMeaningfulSerials,
} from '@/lib/utils/inventoryTrackingHelpers';

/**
 * Map flat Excel grid columns (batch_number, batch_quantity, serial_number) into
 * composite upsert relation payloads before save.
 */
export function mapExcelRowForSave(item, category) {
  if (!item || typeof item !== 'object') return item;

  const out = { ...item };

  if (isSerialTrackingEnabled(category)) {
    const serial = out.serial_number;
    if (serial != null && String(serial).trim() !== '') {
      out.serial_numbers = filterMeaningfulSerials([{ serial_number: String(serial).trim() }]);
    }
    delete out.serial_number;
  }

  if (isBatchTrackingEnabled(category)) {
    const batchNumber = out.batch_number;
    const batchQty = out.batch_quantity;
    const hasBatch =
      (batchNumber != null && String(batchNumber).trim() !== '') ||
      (batchQty != null && batchQty !== '' && Number(batchQty) !== 0);

    if (hasBatch) {
      out.batches = filterMeaningfulBatches([
        {
          batch_number: batchNumber != null ? String(batchNumber).trim() : '',
          quantity: Number(batchQty ?? out.stock) || 0,
          expiry_date: out.expiry_date || null,
          manufacturing_date: out.manufacturing_date || null,
        },
      ]);
    }
    delete out.batch_quantity;
  }

  return out;
}

/** Build upsertIntegratedProductAction params from a grid/import row. */
export function rowToCompositeUpsertParams(mapped, category) {
  const isNew = Boolean(mapped._tempId) || !mapped.id;
  const batches = filterMeaningfulBatches(mapped.batches || []);
  const serials = filterMeaningfulSerials(
    mapped.serial_numbers || mapped.serialNumbers || []
  );
  const stock = Number(mapped.stock) || 0;

  const productData = { ...mapped };
  delete productData._tempId;
  delete productData.batches;
  delete productData.serial_numbers;
  delete productData.serialNumbers;
  delete productData.batch_number;
  delete productData.batch_quantity;
  delete productData.serial_number;
  delete productData.value;

  const hasBatchesOrSerials = batches.length > 0 || serials.length > 0;

  return {
    productData,
    batches,
    serialNumbers: serials,
    isUpdate: !isNew,
    productId: isNew ? null : mapped.id,
    initialStock: isNew && !hasBatchesOrSerials ? stock : 0,
  };
}

/** Map grid row → composite upsert params (Busy / Excel / import). */
export function prepareCompositeUpsertFromRow(row, category, businessId) {
  const mapped = mapExcelRowForSave({ ...row, business_id: businessId }, category);
  return rowToCompositeUpsertParams(mapped, category);
}
