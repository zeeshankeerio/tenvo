'use client';

import { memo, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getUnifiedActivityFeedAction } from '@/lib/actions/basic/audit';
import { FileText, CreditCard, UserPlus, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

/** Visible list height tuned for ~6 activity rows + tight rhythm */
const ACTIVITY_LIST_MAX_HEIGHT_CLASS = 'max-h-[min(21rem,42svh)]';

interface RecentActivityFeedProps {
    businessId?: string;
    onViewAll?: () => void;
    /** How many events to load; list scrolls when taller than the viewport window */
    feedLimit?: number;
}

type ActivityType = 'invoice' | 'payment' | 'customer' | 'alert' | 'system';

interface ActivityItem {
    id: string | number;
    type?: ActivityType;
    description?: string;
    date?: string | Date;
    amount?: number;
    status?: string;
}

function formatRelativeDate(dateValue?: string | Date): string {
    if (!dateValue) return 'just now';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return 'just now';
    return formatDistanceToNow(parsed, { addSuffix: true });
}

export const RecentActivityFeed = memo(function RecentActivityFeed({
    businessId,
    onViewAll,
    feedLimit = 40,
}: RecentActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!businessId) return;

        const fetchActivity = async () => {
            try {
                const res = await getUnifiedActivityFeedAction(businessId, feedLimit);
                if (res.success) {
                    setActivities(res.data);
                }
            } catch (error) {
                console.error('Failed to load activity feed', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [businessId, feedLimit]);

    if (loading) {
        return (
            <Card className="flex h-full min-h-0 flex-col border border-slate-200 bg-white shadow-sm">
                <CardHeader className="shrink-0 border-b border-slate-100 px-3.5 py-2.5">
                    <CardTitle className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                    <div
                        className={cn(
                            'min-h-0 overflow-hidden px-3.5 py-2',
                            ACTIVITY_LIST_MAX_HEIGHT_CLASS
                        )}
                    >
                        <div className="flex flex-col divide-y divide-slate-100">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex min-h-[3.25rem] items-center gap-3 py-2.5 animate-pulse">
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100" />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="h-2.5 w-[80%] max-w-[12rem] rounded bg-slate-100" />
                                        <div className="h-2 w-1/3 rounded bg-slate-50" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="shrink-0 border-t border-slate-100 px-3.5 pb-3 pt-2">
                        <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (activities.length === 0) {
        return (
            <Card className="flex h-full flex-col border border-slate-200 bg-white shadow-sm">
                <CardHeader className="shrink-0 border-b border-slate-100 px-3.5 py-2.5">
                    <CardTitle className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3.5 py-6 text-center text-xs italic text-slate-400">
                    No recent activity recorded.
                </CardContent>
            </Card>
        );
    }

    const getIcon = (type?: ActivityType) => {
        switch (type) {
            case 'invoice':
                return <FileText className="h-3.5 w-3.5 text-brand-primary" />;
            case 'payment':
                return <CreditCard className="h-3.5 w-3.5 text-emerald-500" />;
            case 'customer':
                return <UserPlus className="h-3.5 w-3.5 text-brand-primary" />;
            case 'alert':
                return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
            default:
                return <Clock className="h-3.5 w-3.5 text-slate-400" />;
        }
    };

    const getBg = (type?: ActivityType) => {
        switch (type) {
            case 'invoice':
                return 'bg-brand-50';
            case 'payment':
                return 'bg-emerald-50';
            case 'customer':
                return 'bg-brand-50';
            case 'alert':
                return 'bg-amber-50';
            default:
                return 'bg-slate-50';
        }
    };

    return (
        <Card className="flex min-h-0 flex-col border border-slate-200 bg-white shadow-sm">
            <CardHeader className="shrink-0 border-b border-slate-100 px-3.5 py-2.5">
                <CardTitle className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <ul
                    className={cn(
                        'min-h-0 list-none overflow-y-auto overscroll-y-contain px-3.5',
                        ACTIVITY_LIST_MAX_HEIGHT_CLASS
                    )}
                    aria-label="Recent activity list"
                >
                    {activities.map((item) => (
                        <li
                            key={item.id}
                            className="flex min-h-[3.25rem] gap-3 border-b border-slate-100 py-2.5 last:border-b-0"
                        >
                            <div
                                className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                                    getBg(item.type)
                                )}
                            >
                                {getIcon(item.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[11px] font-bold leading-tight text-slate-700">
                                    {item.description}
                                </p>
                                <div className="mt-1 flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {formatRelativeDate(item.date)}
                                    </span>
                                    {Number(item.amount || 0) > 0 && (
                                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                            {item.status === 'warning'
                                                ? Number(item.amount || 0)
                                                : `PKR ${Number(item.amount || 0).toLocaleString()}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="shrink-0 border-t border-slate-100 px-3.5 pb-3 pt-2">
                    <button
                        type="button"
                        onClick={onViewAll}
                        className="w-full rounded-full border border-slate-200 bg-white py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
                    >
                        View All Activity
                    </button>
                </div>
            </CardContent>
        </Card>
    );
});
