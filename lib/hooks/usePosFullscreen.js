'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Full-screen POS shell, attaches to a container ref (Browser Fullscreen API).
 */
export function usePosFullscreen() {
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch((err) => {
                console.warn('POS fullscreen:', err?.message || err);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    return { containerRef, isFullscreen, toggleFullscreen };
}
