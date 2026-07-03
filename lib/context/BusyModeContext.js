'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

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
});

export const useBusyMode = () => useContext(BusyModeContext);
export const useAppMode = () => {
    const ctx = useContext(BusyModeContext);
    return {
        appMode: ctx.appMode,
        setAppMode: ctx.setAppMode,
        isEasyMode: ctx.isEasyMode,
        isAdvancedMode: ctx.isAdvancedMode,
    };
};

export function BusyModeProvider({ children }) {
    const [isBusyMode, setIsBusyMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('tenvo_busy_mode') === 'true';
    });

    const [appMode, setAppModeState] = useState(() => {
        // Default to Simple (easy). Only respect a saved 'advanced' preference so
        // existing power users who opted in keep the advanced hub.
        if (typeof window === 'undefined') return 'easy';
        const stored = localStorage.getItem(APP_MODE_KEY);
        return stored === 'advanced' ? 'advanced' : 'easy';
    });

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
        }}>
            <div className={isBusyMode ? 'busy-mode-active' : 'standard-mode-active'}>
                {children}
            </div>
        </BusyModeContext.Provider>
    );
}
