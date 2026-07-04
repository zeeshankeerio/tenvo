/**
 * Shared KPI card visual themes — AIC-inspired tinted gradients per metric.
 */

export type KpiTheme = 'cyan' | 'emerald' | 'violet' | 'rose' | 'amber' | 'slate';

export const KPI_THEMES: Record<
    KpiTheme,
    {
        card: string;
        icon: string;
        sparkStroke: string;
        sparkFill: string;
        orb: string;
    }
> = {
    cyan: {
        card: 'border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/30',
        icon: 'bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-cyan-500/25',
        sparkStroke: 'stroke-cyan-500',
        sparkFill: 'fill-cyan-500/20',
        orb: 'bg-cyan-400/20',
    },
    emerald: {
        card: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/30',
        icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25',
        sparkStroke: 'stroke-emerald-500',
        sparkFill: 'fill-emerald-500/20',
        orb: 'bg-emerald-400/20',
    },
    violet: {
        card: 'border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-purple-50/30',
        icon: 'bg-gradient-to-br from-violet-500 to-violet-600 shadow-violet-500/25',
        sparkStroke: 'stroke-violet-500',
        sparkFill: 'fill-violet-500/20',
        orb: 'bg-violet-400/20',
    },
    rose: {
        card: 'border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-red-50/30',
        icon: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/25',
        sparkStroke: 'stroke-rose-500',
        sparkFill: 'fill-rose-500/15',
        orb: 'bg-rose-400/20',
    },
    amber: {
        card: 'border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/30',
        icon: 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/25',
        sparkStroke: 'stroke-amber-500',
        sparkFill: 'fill-amber-500/20',
        orb: 'bg-amber-400/20',
    },
    slate: {
        card: 'border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/40',
        icon: 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/20',
        sparkStroke: 'stroke-slate-500',
        sparkFill: 'fill-slate-500/15',
        orb: 'bg-slate-400/15',
    },
};
