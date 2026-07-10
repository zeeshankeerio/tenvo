'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// --- App Mode: 'easy' for beginners, 'advanced' for power users ---
// Easy (Simple) is the default; users who explicitly switch to Advanced keep it.
const APP_MODE_KEY = 'tenvo_app_mode';

const BusyModeContext = createContext({
    isBusyMode: false,
    toggleBusyMode: () => { },
    appMode: 'easy',     // 'easy' | 'advanced'
    setAppMode: (_mode) => { },
    isEasyMode: true,
    isAdvancedMode: false,
    modeReady: false,
});

export const useBusyMode = () => useContext(BusyModeContext);
export const useAppMode = () => {
    const ctx = useContext(BusyModeContext);
    return {
        appMode: ctx.appMode,
        setAppMode: ctx.setAppMode,
        isEasyMode: ctx.isEasyMode,
        isAdvancedMode: ctx.isAdvancedMode,
        modeReady: ctx.modeReady,
    };
};

export function BusyModeProvider({ children }) {
    // Start with SSR-safe defaults, hydrate from localStorage in useEffect
    const [isBusyMode, setIsBusyMode] = useState(false);
    const [appMode, setAppModeState] = useState('easy');
    const [modeReady, setModeReady] = useState(false);

    // Hydrate from localStorage after mount — prevents SSR/client mismatch flash
    useEffect(() => {
        const storedBusy = localStorage.getItem('tenvo_busy_mode') === 'true';
        const storedMode = localStorage.getItem(APP_MODE_KEY);
        const resolvedMode = storedMode === 'advanced' ? 'advanced' : 'easy';
        setIsBusyMode(storedBusy);
        setAppModeState(resolvedMode);
        // Mark ready in next frame so one consistent render happens
        queueMicrotask(() => setModeReady(true));
    }, []);

    const toggleBusyMode = () => {
        setIsBusyMode(prev => {
            const next = !prev;
            localStorage.setItem('tenvo_busy_mode', String(next));
            return next;
        });
    };

    const setAppMode = useCallback((mode) => {
        const validMode = mode === 'easy' ? 'easy' : 'advanced';
        setAppModeState(validMode);
        if (typeof window !== 'undefined') {
            localStorage.setItem(APP_MODE_KEY, validMode);
        }
    }, []);

    return (
        <BusyModeContext.Provider value={{
            isBusyMode,
            toggleBusyMode,
            appMode,
            setAppMode,
            isEasyMode: appMode === 'easy',
            isAdvancedMode: appMode === 'advanced',
            modeReady,
        }}>
            <div className={isBusyMode ? 'busy-mode-active' : 'standard-mode-active'}>
                {children}
            </div>
        </BusyModeContext.Provider>
    );
}
