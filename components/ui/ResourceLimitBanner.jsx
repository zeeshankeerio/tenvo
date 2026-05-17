'use client';

import React from 'react';
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * ResourceLimitBanner -- Shows a warning when a resource is near or at its plan limit.
 *
 * Props:
 *   message     - from useResourceLimits().getLimitMessage()
 *   isAtLimit   - true = hard block (red), false = warning (amber)
 *   onUpgrade   - callback to show upgrade flow
 *   className   - additional classes
 */
export function ResourceLimitBanner({ message, isAtLimit, onUpgrade, className }) {
    if (!message) return null;

    return (
        <div className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium',
            isAtLimit
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800',
            className
        )}>
            {isAtLimit ? (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
            ) : (
                <TrendingUp className="w-4 h-4 flex-shrink-0 text-amber-500" />
            )}

            <span className="flex-1">{message}</span>

            {onUpgrade && (
                <Button
                    size="sm"
                    variant={isAtLimit ? 'default' : 'outline'}
                    className={cn(
                        'h-7 text-xs font-bold gap-1',
                        isAtLimit && 'bg-red-600 hover:bg-red-700'
                    )}
                    onClick={onUpgrade}
                >
                    <Zap className="w-3 h-3" />
                    Upgrade
                </Button>
            )}
        </div>
    );
}
