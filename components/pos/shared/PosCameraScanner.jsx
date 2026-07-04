'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Camera, Flashlight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

/** Retail + QR formats for POS (EAN, UPC, Code128, QR). */
const POS_SCAN_FORMATS = [
    'QR_CODE',
    'EAN_13',
    'EAN_8',
    'UPC_A',
    'UPC_E',
    'CODE_128',
    'CODE_39',
    'ITF',
];

const SCAN_COOLDOWN_MS = 1200;

/**
 * Mobile-first camera scanner — html5-qrcode with 1D + QR support.
 */
export function PosCameraScanner({
    open,
    onClose,
    onScan,
    title = 'Scan product',
    hint = 'Supports QR, EAN-13, UPC, Code 128 · USB scanners work in the search field',
}) {
    const reactId = useId().replace(/:/g, '');
    const regionId = `pos-scanner-${reactId}`;
    const scannerRef = useRef(null);
    const lastScanRef = useRef(0);
    const onScanRef = useRef(onScan);
    const onCloseRef = useRef(onClose);

    const [manualCode, setManualCode] = useState('');
    const [status, setStatus] = useState('idle'); // idle | starting | active | error
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        onScanRef.current = onScan;
        onCloseRef.current = onClose;
    }, [onScan, onClose]);

    const handleDecoded = useCallback((decoded) => {
        const code = String(decoded || '').trim();
        if (!code) return;
        const now = Date.now();
        if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
        lastScanRef.current = now;

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
        }

        onScanRef.current?.(code);
        toast.success(`Scanned ${code}`, { id: 'pos-scan', duration: 2000 });
        onCloseRef.current?.();
    }, []);

    const stopScanner = useCallback(async () => {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (!scanner) return;
        try {
            if (scanner.isScanning?.()) {
                await scanner.stop();
            }
        } catch {
            /* ignore stop race */
        }
        try {
            await scanner.clear();
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;

        async function start() {
            setStatus('starting');
            setErrorMsg('');

            try {
                const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
                if (cancelled) return;

                const formatMap = Html5QrcodeSupportedFormats;
                const formatsToSupport = POS_SCAN_FORMATS
                    .map((name) => formatMap[name])
                    .filter((v) => v !== undefined);

                const scanner = new Html5Qrcode(regionId, {
                    formatsToSupport,
                    verbose: false,
                });
                scannerRef.current = scanner;

                let cameraIdOrConfig = { facingMode: 'environment' };
                try {
                    const cameras = await Html5Qrcode.getCameras();
                    const back = cameras.find((c) =>
                        /back|rear|environment/i.test(c.label)
                    );
                    if (back?.id) cameraIdOrConfig = back.id;
                    else if (cameras[0]?.id) cameraIdOrConfig = cameras[0].id;
                } catch {
                    /* use facingMode fallback */
                }

                const config = {
                    fps: 12,
                    aspectRatio: 1.777778,
                    disableFlip: false,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const w = Math.min(viewfinderWidth, viewfinderHeight) * 0.88;
                        return { width: Math.floor(w), height: Math.floor(w * 0.42) };
                    },
                };

                await scanner.start(
                    cameraIdOrConfig,
                    config,
                    handleDecoded,
                    () => {}
                );

                if (!cancelled) setStatus('active');
            } catch (err) {
                console.warn('[PosCameraScanner]', err);
                if (!cancelled) {
                    setStatus('error');
                    setErrorMsg(
                        err?.message?.includes('Permission')
                            ? 'Camera permission denied — allow camera access or enter code manually'
                            : 'Could not start camera — use manual entry or USB scanner'
                    );
                }
            }
        }

        const timer = setTimeout(start, 80);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            stopScanner();
            setStatus('idle');
        };
    }, [open, regionId, handleDecoded, stopScanner]);

    useEffect(() => {
        if (!open || typeof document === 'undefined') return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    const submitManual = () => {
        const code = manualCode.trim();
        if (!code) return;
        handleDecoded(code);
        setManualCode('');
    };

    return (
        <div
            className="fixed inset-0 z-[120] flex flex-col bg-black/70 backdrop-blur-sm touch-manipulation"
            role="dialog"
            aria-modal="true"
            aria-label="Scan barcode or QR code"
        >
            <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
                <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold text-sm">{title}</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white hover:bg-white/10"
                    onClick={onClose}
                    aria-label="Close scanner"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 flex flex-col px-3 pb-4 min-h-0">
                <div className="relative flex-1 min-h-[240px] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                    <div id={regionId} className="w-full h-full min-h-[240px]" />

                    {status === 'starting' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <p className="text-sm text-white/80 animate-pulse">Starting camera…</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-6 text-center">
                            <Flashlight className="w-8 h-8 text-amber-400 opacity-80" />
                            <p className="text-sm text-white/90">{errorMsg}</p>
                        </div>
                    )}

                    {status === 'active' && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70 bg-black/40 px-3 py-1 rounded-full">
                                Align barcode in frame
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-4 space-y-2 shrink-0 pb-[env(safe-area-inset-bottom)]">
                    <div className="flex gap-2">
                        <Input
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder="Type SKU / EAN / barcode"
                            className="h-12 bg-white/95 text-base rounded-xl border-0"
                            inputMode="text"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
                        />
                        <Button
                            className="h-12 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 shrink-0"
                            onClick={submitManual}
                        >
                            Add
                        </Button>
                    </div>
                    <p className="text-[11px] text-center text-white/60">
                        {hint}
                    </p>
                </div>
            </div>
        </div>
    );
}
