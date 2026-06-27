'use client';

import { memo, useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Maximize2, RotateCcw, Settings, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HUB_CAPTION, HUB_LABEL } from '@/lib/utils/typography';

interface PortletProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    headerActions?: ReactNode;
    isCollapsible?: boolean;
    isLoading?: boolean;
    compact?: boolean;
}

/**
 * Reusable NetSuite-style Portlet Container
 */
export const Portlet = memo(function Portlet({
    title,
    description,
    children,
    className,
    headerActions,
    isCollapsible = true,
    isLoading = false,
    compact = false
}: PortletProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <Card className={cn(
            "border-gray-200 shadow-sm overflow-hidden group/portlet bg-white transition-all duration-300 hover:shadow-md",
            className
        )}>
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-2.5 px-3 flex flex-row items-center justify-between space-y-0 text-left">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3 text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover/portlet:opacity-100 transition-opacity" />
                        {isCollapsible && (
                            <ChevronDown
                                className={cn(
                                    "w-3.5 h-3.5 text-gray-400 group-hover/portlet:text-gray-600 cursor-pointer transition-transform",
                                    isCollapsed && "-rotate-90"
                                )}
                                onClick={() => setIsCollapsed(!isCollapsed)}
                            />
                        )}
                        <CardTitle className={cn(HUB_LABEL, 'text-gray-800 normal-case')}>
                            {title}
                        </CardTitle>
                    </div>
                    {description && (
                        <CardDescription className={cn(HUB_CAPTION, 'ml-8 normal-case')}>
                            {description}
                        </CardDescription>
                    )}
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover/portlet:opacity-100 transition-opacity">
                    {headerActions}
                    <div className="flex items-center gap-1 border-l pl-1.5 border-gray-200">
                        <RotateCcw className="w-3 h-3 text-gray-400 hover:text-wine cursor-pointer transition-colors" />
                        <Maximize2 className="w-3 h-3 text-gray-400 hover:text-wine cursor-pointer transition-colors" />
                        <Settings className="w-3 h-3 text-gray-400 hover:text-wine cursor-pointer transition-colors" />
                    </div>
                </div>
            </CardHeader>
            {!isCollapsed && (
                <CardContent className={cn("p-0 relative", isLoading && "opacity-50 pointer-events-none")}>
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px] z-10">
                            <div className="w-5 h-5 border-2 border-wine border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                    <div className={cn(compact ? "p-2" : "p-3")}>
                        {children}
                    </div>
                </CardContent>
            )}
        </Card>
    );
});
