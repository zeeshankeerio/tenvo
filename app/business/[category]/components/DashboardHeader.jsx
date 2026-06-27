'use client';

import React from 'react';
import { Search, Plus, ListFilter, Download, LayoutGrid, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/context/LanguageContext';
import { QUICK_ACTION_IDS, getPrimaryQuickActionForTab } from '@/lib/config/quickActions';
import { HUB_LABEL } from '@/lib/utils/typography';
import { cn } from '@/lib/utils';

export function DashboardHeader({
    activeTab,
    onQuickAction,
    onExport,
}) {
    const { t } = useLanguage();

    const primaryAction = getPrimaryQuickActionForTab(activeTab, t);

    return (
        <div className="sticky top-0 z-30 pb-2.5 pt-1 -mx-4 px-4 bg-gray-50/40 backdrop-blur-sm border-b border-gray-200/30">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
                {/* Contextual Info / Breadcrumb extension */}
                <div className="flex items-center gap-2">
                    <div className="h-4 w-px bg-gray-200 mx-2" />
                    <span className={cn(HUB_LABEL, 'normal-case tracking-widest text-neutral-400')}>
                        {t?.quick_actions || 'Quick Actions'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filters & Actions */}
                    <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-gray-100">
                        <Button variant="ghost" className="h-8 px-2.5 rounded-lg gap-2 text-gray-500 hover:text-brand-primary hover:bg-white transition-all">
                            <ListFilter className="w-3.5 h-3.5" />
                            <span className={cn(HUB_LABEL, 'normal-case tracking-wider')}>{t?.filters || 'Filters'}</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg gap-2 text-gray-500 hover:text-brand-primary hover:bg-white transition-all"
                            onClick={onExport}
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className={cn(HUB_LABEL, 'normal-case tracking-wider')}>{t?.export || 'Export'}</span>
                        </Button>
                    </div>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg gap-1.5 px-3 font-semibold text-[10px] uppercase tracking-wider text-neutral-600 hover:bg-white hover:text-brand-primary border border-transparent hover:border-neutral-200 transition-all"
                        onClick={() => onQuickAction?.(QUICK_ACTION_IDS.OPEN_QUICK_ACTION)}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>{t?.quick_actions || 'Quick Actions'}</span>
                    </Button>

                    <Button
                        size="sm"
                        className="h-8 rounded-lg gap-1.5 px-3 font-bold text-[10px] uppercase tracking-wider bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-brand-100 transition-all shadow-sm"
                        onClick={() => onQuickAction?.(primaryAction.id)}
                    >
                        <Plus className="w-3.5 h-3.5 text-brand-primary" />
                        <span>{primaryAction.label}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
