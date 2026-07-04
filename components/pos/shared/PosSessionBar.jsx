'use client';

import React from 'react';
import { Clock, LogOut, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Session status banner shared across POS variants.
 */
export function PosSessionBar({
    hasSession,
    terminalLabel = 'Counter',
    sessionStartedLabel,
    isStartingSession,
    onStartSession,
    onCloseSession,
    className,
}) {
    return (
        <div
            className={cn(
                'mx-4 mt-3 mb-0 px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3',
                hasSession
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700',
                className
            )}
        >
            <div className="flex items-center gap-2 min-w-0">
                {hasSession ? (
                    <Clock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                ) : null}
                <span className="truncate">
                    {hasSession
                        ? `POS Session Active · ${terminalLabel}${sessionStartedLabel ? ` · Opened ${sessionStartedLabel}` : ''}`
                        : 'No active session — sales will use invoice fallback until you start a shift'}
                </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                {!hasSession ? (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] gap-1"
                        onClick={onStartSession}
                        disabled={isStartingSession}
                    >
                        <Play className="w-3 h-3" />
                        {isStartingSession ? 'Starting…' : 'Start Session'}
                    </Button>
                ) : onCloseSession ? (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                        onClick={onCloseSession}
                    >
                        <LogOut className="w-3 h-3" />
                        Close Shift
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
