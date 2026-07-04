'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { findProductByScanCode } from '@/lib/utils/productScanLookup';
import { getPosDomainFlags } from '@/lib/config/posDomains';
import { isProductExpired, productRequiresBatch } from '@/lib/utils/posPharmacy';
import { getWholesaleUnitPrice, validateWholesaleQuantity } from '@/lib/utils/posWholesale';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { getProductAvailableStock } from '@/lib/utils/posHelpers';

/**
 * Shared POS product-add pipeline — pharmacy, wholesale, stock guards.
 */
export function usePosProductAdd({
    category,
    posSettings,
    effectiveTaxRate = 0,
    setCart,
    setPharmacyProduct,
    onAdded,
}) {
    const domainFlags = getPosDomainFlags(category);

    const tryAddProduct = useCallback((product, batchMeta = null) => {
        const stock = getProductAvailableStock(product);
        if (stock <= 0 && !product.allow_negative_stock) {
            toast.error(`${product.name} is out of stock`, { id: 'pos-stock' });
            return false;
        }
        if (posSettings?.blockExpiredProducts && isProductExpired(product)) {
            toast.error(`${product.name} is expired and cannot be sold`, { id: 'pos-expiry' });
            return false;
        }
        if (
            domainFlags.pharmacyMode
            && posSettings?.enforcePharmacyBatch
            && productRequiresBatch(product, category)
            && !batchMeta
        ) {
            setPharmacyProduct?.(product);
            return false;
        }

        const moqCheck = domainFlags.wholesaleMode && posSettings?.enforceWholesaleMoq
            ? validateWholesaleQuantity(product, 1)
            : { ok: true, moq: 1 };
        if (!moqCheck.ok) {
            toast.error(moqCheck.message, { id: 'pos-moq' });
            return false;
        }

        const isWeightItem = product.unit === 'kg' || product.unit === 'g'
            || product.unit === 'lb' || product.is_weight_item
            || product.domain_data?.is_weight_item;
        const startQty = isWeightItem ? 1.0 : Math.max(1, moqCheck.moq || 1);
        const unitPrice = domainFlags.wholesaleMode
            ? getWholesaleUnitPrice(product, startQty)
            : parseFloat(product.selling_price || product.price || 0);

        setCart((prev) => {
            const batchKey = batchMeta?.batchId || null;
            const existing = prev.findIndex(
                (i) => i.productId === product.id && (i.batchId || null) === batchKey
            );
            if (existing >= 0 && !isWeightItem) {
                const nextQty = prev[existing].quantity + 1;
                if (domainFlags.wholesaleMode && posSettings?.enforceWholesaleMoq) {
                    const check = validateWholesaleQuantity(product, nextQty);
                    if (!check.ok) {
                        toast.error(check.message, { id: 'pos-moq' });
                        return prev;
                    }
                }
                const updated = [...prev];
                updated[existing] = {
                    ...updated[existing],
                    quantity: nextQty,
                    unitPrice: domainFlags.wholesaleMode
                        ? getWholesaleUnitPrice(product, nextQty)
                        : updated[existing].unitPrice,
                };
                return updated;
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,
                imageUrl: getEffectiveProductImageUrl(product, category),
                unitPrice,
                quantity: startQty,
                taxPercent: parseFloat(product.tax_percent ?? product.taxPercent ?? effectiveTaxRate),
                isWeightItem,
                unit: product.unit || (isWeightItem ? 'kg' : 'pcs'),
                batchId: batchMeta?.batchId || null,
                batchNumber: batchMeta?.batchNumber || null,
                maxStock: stock,
            }];
        });

        onAdded?.(product);
        return true;
    }, [category, domainFlags, posSettings, effectiveTaxRate, setCart, setPharmacyProduct, onAdded]);

    const handleScanCode = useCallback((products, code, { clearSearch } = {}) => {
        const product = findProductByScanCode(products, code);
        if (product) {
            tryAddProduct(product);
            clearSearch?.();
            return product;
        }
        toast.error(`No product for "${code}"`, { id: 'pos-scan-miss' });
        return null;
    }, [tryAddProduct]);

    return { tryAddProduct, handleScanCode, domainFlags };
}
