'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { findProductByScanCode } from '@/lib/utils/productScanLookup';
import { serialAPI } from '@/lib/api/serial';

/**
 * Inventory scan pipeline — product lookup, optional serial fallback (domain-aware).
 */
export function useInventoryScan({
    products,
    businessId,
    isSerialEnabled = false,
}) {
    const resolveScan = useCallback(async (code) => {
        const trimmed = String(code || '').trim();
        if (!trimmed) return { type: 'empty' };

        const product = findProductByScanCode(products, trimmed);
        if (product) {
            return { type: 'product', product, code: trimmed };
        }

        if (isSerialEnabled && businessId) {
            try {
                const serial = await serialAPI.getSerial(businessId, trimmed);
                if (serial) {
                    const linkedProduct = (products || []).find(
                        (p) => p.id === serial.product_id
                    );
                    return {
                        type: 'serial',
                        serial,
                        product: linkedProduct || null,
                        code: trimmed,
                    };
                }
            } catch {
                /* fall through to miss */
            }
        }

        return { type: 'miss', code: trimmed };
    }, [products, businessId, isSerialEnabled]);

    const applyScanToInventory = useCallback(async (code, {
        setActiveTab,
        setSearchTerm,
        setProductToView,
        setSelectedProduct,
        setShowSerialScanner,
    } = {}) => {
        const result = await resolveScan(code);

        if (result.type === 'empty') return result;

        setActiveTab?.('products');

        if (result.type === 'product') {
            const { product } = result;
            setSearchTerm?.(product.barcode || product.sku || result.code);
            setProductToView?.(product);
            toast.success(`Found: ${product.name}`, { id: 'inv-scan' });
            return result;
        }

        if (result.type === 'serial') {
            const label = result.product?.name || result.code;
            if (result.product) {
                setSearchTerm?.(result.code);
                setSelectedProduct?.(result.product);
                setShowSerialScanner?.(true);
                toast.success(`Serial matched: ${label}`, { id: 'inv-scan' });
            } else {
                toast.success(`Serial ${result.code} (${result.serial.status || 'registered'})`, {
                    id: 'inv-scan',
                });
            }
            return result;
        }

        setSearchTerm?.(result.code);
        toast.error(`No product for "${result.code}"`, { id: 'inv-scan-miss' });
        return result;
    }, [resolveScan]);

    return { resolveScan, applyScanToInventory };
}
