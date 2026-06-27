import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { DATE_RANGE_PRESETS, getDateRangeFromPreset, isDateRangeEqual } from '@/lib/utils/datePresets';

interface DateRangePickerProps {
    className?: string;
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
    compact?: boolean;
    minimal?: boolean;
}

const calendarClassNames = {
    months: 'flex flex-row gap-4',
    month: 'space-y-2',
    month_caption: 'relative flex h-8 items-center justify-center',
    caption_label: 'text-xs font-semibold text-neutral-800',
    nav: 'flex items-center gap-0.5',
    button_previous:
        'absolute left-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-super-white text-neutral-600 hover:bg-half-white hover:text-neutral-900',
    button_next:
        'absolute right-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-super-white text-neutral-600 hover:bg-half-white hover:text-neutral-900',
    month_grid: 'w-full border-collapse',
    weekdays: 'flex',
    weekday: 'w-8 text-[10px] font-semibold uppercase tracking-wide text-neutral-400',
    week: 'mt-0.5 flex w-full',
    day: cn(
        'relative h-8 w-8 p-0 text-center text-sm',
        '[&:has([aria-selected].day-range-end)]:rounded-r-md',
        '[&:has([aria-selected].day-outside)]:bg-brand-50/60',
        '[&:has([aria-selected])]:bg-brand-50',
        'first:[&:has([aria-selected])]:rounded-l-md',
        'last:[&:has([aria-selected])]:rounded-r-md'
    ),
    day_button:
        'h-8 w-8 rounded-md p-0 text-xs font-medium text-neutral-700 hover:bg-half-white aria-selected:opacity-100',
    range_start: 'day-range-start rounded-l-md',
    range_end: 'day-range-end rounded-r-md',
    selected:
        'rounded-md bg-brand-primary text-white font-semibold hover:bg-brand-primary hover:text-white focus:bg-brand-primary focus:text-white',
    range_middle: 'rounded-none bg-brand-50 text-brand-primary-dark aria-selected:bg-brand-50',
    today: 'font-bold text-brand-primary ring-1 ring-brand-primary/30 ring-inset',
    outside: 'day-outside text-neutral-300 aria-selected:text-neutral-400',
    disabled: 'text-neutral-300 opacity-40',
    hidden: 'invisible',
};

function formatRangeLabel(range: DateRange | undefined, short = false) {
    if (!range?.from) return short ? 'Dates' : 'Select range';
    if (!range.to) return format(range.from, short ? 'MMM d, yyyy' : 'LLL dd, y');
    if (short) return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`;
    return `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}`;
}

export function DateRangePicker({
    className,
    date,
    onDateChange,
    compact = false,
    minimal = false,
}: DateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<DateRange | undefined>(date);
    const [monthCount, setMonthCount] = useState(2);

    const navigationBounds = useMemo(() => {
        const now = new Date();
        return {
            startMonth: new Date(now.getFullYear() - 5, 0, 1),
            endMonth: new Date(now.getFullYear() + 2, 11, 1),
        };
    }, []);

    useEffect(() => {
        const syncMonths = () => setMonthCount(window.innerWidth < 768 ? 1 : 2);
        syncMonths();
        window.addEventListener('resize', syncMonths);
        return () => window.removeEventListener('resize', syncMonths);
    }, []);

    useEffect(() => {
        if (open) setDraft(date);
    }, [open, date]);

    const isPresetSelected = (presetKey: string) => {
        if (!draft?.from || !draft?.to) return false;
        const presetRange = getDateRangeFromPreset(presetKey);
        return isDateRangeEqual(draft, presetRange);
    };

    const buttonLabel = useMemo(
        () => formatRangeLabel(date, compact || minimal),
        [date, compact, minimal]
    );

    const triggerTitle = date?.from && date?.to
        ? `${format(date.from, 'MMM d, yyyy')} - ${format(date.to, 'MMM d, yyyy')}`
        : 'Select date range';

    const canApply = Boolean(draft?.from && draft?.to);

    const handleApply = () => {
        if (canApply) {
            onDateChange(draft);
            setOpen(false);
        }
    };

    const handlePreset = (presetKey: string) => {
        const range = getDateRangeFromPreset(presetKey);
        if (range) {
            setDraft(range);
            onDateChange(range);
            setOpen(false);
        }
    };

    return (
        <div className={cn('grid gap-1', className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant="outline"
                        title={triggerTitle}
                        aria-label={triggerTitle}
                        className={cn(
                            'rounded-lg border-neutral-200 bg-super-white font-semibold shadow-sm transition-colors hover:bg-half-white',
                            minimal
                                ? 'h-7 w-7 shrink-0 p-0'
                                : cn(
                                    'w-full justify-start text-left',
                                    compact ? 'h-7 px-1.5 text-[10px]' : 'h-8 px-2.5 text-[11px]',
                                ),
                            !date?.from && 'text-neutral-500'
                        )}
                    >
                        <CalendarIcon
                            className={cn(
                                'shrink-0 text-brand-primary',
                                minimal ? 'h-3.5 w-3.5' : compact ? 'mr-1 h-3 w-3' : 'mr-2 h-3.5 w-3.5',
                            )}
                        />
                        {!minimal && (
                            <>
                                <span className="truncate text-neutral-800">{buttonLabel}</span>
                                {!compact && <ChevronDown className="ml-1 h-3 w-3 shrink-0 text-neutral-400" />}
                            </>
                        )}
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="w-[min(680px,calc(100vw-1rem))] overflow-hidden rounded-xl border border-neutral-200 bg-super-white p-0 shadow-xl"
                >
                    <div className="flex max-h-[min(520px,calc(100dvh-6rem))] flex-col md:flex-row">
                        {/* Presets, Odoo/Zoho-style quick ranges */}
                        <aside className="shrink-0 border-b border-neutral-100 bg-half-white md:w-[148px] md:border-b-0 md:border-r">
                            <p className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                Quick ranges
                            </p>
                            <div className="grid grid-cols-2 gap-0.5 px-2 pb-2 md:grid-cols-1 md:pb-3">
                                {DATE_RANGE_PRESETS.map((preset) => (
                                    <button
                                        key={preset.key}
                                        type="button"
                                        onClick={() => handlePreset(preset.key)}
                                        className={cn(
                                            'flex items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] font-semibold transition-colors',
                                            isPresetSelected(preset.key)
                                                ? 'bg-brand-50 text-brand-primary'
                                                : 'text-neutral-600 hover:bg-white hover:text-neutral-900'
                                        )}
                                    >
                                        <span className="truncate">{preset.label}</span>
                                        {isPresetSelected(preset.key) && (
                                            <Check className="ml-1 h-3 w-3 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {/* Calendar + summary */}
                        <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-100 bg-super-white px-3 py-2">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                        From
                                    </p>
                                    <p className="truncate text-xs font-semibold text-neutral-900">
                                        {draft?.from ? format(draft.from, 'EEE, MMM d, yyyy') : ', '}
                                    </p>
                                </div>
                                <div className="hidden h-8 w-px bg-neutral-200 sm:block" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                        To
                                    </p>
                                    <p className="truncate text-xs font-semibold text-neutral-900">
                                        {draft?.to ? format(draft.to, 'EEE, MMM d, yyyy') : ', '}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto overflow-y-auto p-2">
                                <Calendar
                                    mode="range"
                                    defaultMonth={draft?.from ?? date?.from}
                                    selected={draft}
                                    onSelect={setDraft}
                                    numberOfMonths={monthCount}
                                    fixedWeeks
                                    showOutsideDays
                                    startMonth={navigationBounds.startMonth}
                                    endMonth={navigationBounds.endMonth}
                                    className="p-0"
                                    classNames={{
                                        ...calendarClassNames,
                                        months: monthCount === 1 ? 'flex flex-col' : 'flex flex-row gap-3',
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2 border-t border-neutral-100 bg-half-white px-3 py-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800"
                                    onClick={() => setDraft(undefined)}
                                >
                                    Clear
                                </Button>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg border-neutral-200 px-3 text-[11px] font-semibold"
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={!canApply}
                                        className="h-8 rounded-lg bg-brand-primary px-4 text-[11px] font-semibold text-white hover:bg-brand-primary-dark disabled:opacity-40"
                                        onClick={handleApply}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
