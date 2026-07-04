'use client';

import { memo, useState, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NetsuiteDashboardProps {
    children: ReactNode;
    className?: string;
}

/**
 * NetSuite-Inspired Dashboard Grid Layout
 */
export default function NetsuiteDashboard({
    children,
    className
}: NetsuiteDashboardProps) {
    const [layout, setLayout] = useState<'grid' | 'list'>('grid');

    // Listen for global layout toggle from Header
    useEffect(() => {
        const handleLayoutToggle = () => {
            setLayout(prev => prev === 'grid' ? 'list' : 'grid');
        };
        window.addEventListener('change-layout', handleLayoutToggle);
        return () => window.removeEventListener('change-layout', handleLayoutToggle);
    }, []);

    return (
        <div className={cn("animate-in fade-in duration-500", className)}>
            {/* Portlet Grid */}
            <div className={cn(
                "grid gap-3 mt-1 items-start",
                layout === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-12" : "grid-cols-1"
            )}>
                {children}
            </div>
        </div>
    );
}

interface PortletColumnProps {
    children: ReactNode;
    span?: number;
    className?: string;
}

/**
 * Helper to define portlet column spans in the 12-column grid
 */
export const PortletColumn = memo(function PortletColumn({
    children,
    span = 4,
    className
}: PortletColumnProps) {
    return (
        <div className={cn(
            span === 4 ? "lg:col-span-4" :
                span === 8 ? "lg:col-span-8" :
                    span === 12 ? "lg:col-span-12" :
                        `lg:col-span-${span}`,
            className
        )}>
            {children}
        </div>
    );
});
