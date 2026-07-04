'use client';

import { PosCameraScanner } from '@/components/pos/shared/PosCameraScanner';

/**
 * @deprecated Use PosCameraScanner directly. Thin wrapper for legacy call sites.
 */
export function BarcodeScanner({ onScan, onClose, title = 'Scan barcode or QR' }) {
    return (
        <PosCameraScanner
            open
            onClose={onClose}
            onScan={onScan}
            title={title}
            hint="Align code in frame or type SKU / barcode below"
        />
    );
}
