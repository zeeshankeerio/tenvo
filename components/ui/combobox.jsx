'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    MOBILE_BOTTOM_SHEET,
    MOBILE_BOTTOM_SHEET_BODY,
    MOBILE_BOTTOM_SHEET_HANDLE,
    MOBILE_BOTTOM_SHEET_HEADER,
} from '@/lib/utils/mobileLayout';

function useHubMobilePicker() {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)');
        const sync = () => setIsMobile(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return isMobile;
}

function ComboboxOptions({
    options,
    value,
    onSelect,
    placeholder,
    emptyText,
    renderEmpty,
}) {
    return (
        <Command
            className="rounded-none"
            filter={(itemValue, search) => {
                if (!search) return 1;
                if (itemValue.toLowerCase().includes(search.toLowerCase())) return 1;
                return 0;
            }}
        >
            <CommandInput
                placeholder={placeholder}
                className="h-12 border-none focus:ring-0"
            />
            <CommandList className="max-h-[min(300px,50vh)] overscroll-contain">
                <CommandEmpty className="py-6 text-center text-sm font-medium whitespace-pre-wrap text-gray-500">
                    {renderEmpty ? renderEmpty() : emptyText}
                </CommandEmpty>
                <CommandGroup>
                    {options.map((option) => {
                        const searchValue = `${option.label} ${option.description || ''} ${option.value}`.trim();
                        const isSelected = String(option.value) === String(value);

                        return (
                            <CommandItem
                                key={option.value}
                                value={searchValue}
                                onSelect={() => onSelect(option)}
                                className="mx-1 my-0.5 flex cursor-pointer items-center justify-between gap-2 rounded-xl px-4 py-3 transition-colors hover:bg-blue-50/50 aria-selected:bg-blue-50"
                            >
                                <div className="pointer-events-none flex min-w-0 flex-1 flex-col">
                                    <span className="truncate font-bold text-gray-800">{option.label}</span>
                                    {option.description && (
                                        <span className="truncate text-[10px] font-medium text-gray-400">
                                            {option.description}
                                        </span>
                                    )}
                                </div>
                                <Check
                                    className={cn(
                                        'pointer-events-none h-4 w-4 shrink-0 text-blue-600',
                                        isSelected ? 'opacity-100' : 'opacity-0'
                                    )}
                                />
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
            </CommandList>
        </Command>
    );
}

/**
 * @typedef {Object} ComboboxOption
 * @property {string|number} value
 * @property {string} label
 * @property {string} [description]
 * @property {any} [extraData]
 */

/**
 * @typedef {Object} ComboboxProps
 * @property {ComboboxOption[]} [options]
 * @property {string|number} [value]
 * @property {(value: string|number) => void} [onChange]
 * @property {string} [placeholder]
 * @property {string} [emptyText]
 * @property {() => React.ReactNode} [renderEmpty]
 * @property {string} [className]
 * @property {boolean} [disabled]
 */

/** @type {React.FC<ComboboxProps>} */
export function Combobox({
    options = [],
    value,
    onChange,
    placeholder = "Select option...",
    emptyText = "No results found.",
    renderEmpty,
    className,
    disabled = false,
}) {
    const [open, setOpen] = React.useState(false);
    const isMobilePicker = useHubMobilePicker();

    const selectedOption = React.useMemo(
        () => options.find((option) => String(option.value) === String(value)),
        [options, value]
    );

    const handleSelect = React.useCallback(
        (option) => {
            onChange?.(option.value);
            setOpen(false);
        },
        [onChange]
    );

    const triggerButton = (
        <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            onClick={isMobilePicker ? () => setOpen(true) : undefined}
            className={cn(
                'h-11 w-full justify-between rounded-xl border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50/50',
                className
            )}
        >
            <span className="truncate text-left">
                {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
    );

    if (isMobilePicker) {
        return (
            <>
                {triggerButton}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent side="bottom" className={MOBILE_BOTTOM_SHEET}>
                        <div className={MOBILE_BOTTOM_SHEET_HANDLE} aria-hidden />
                        <SheetHeader className={MOBILE_BOTTOM_SHEET_HEADER}>
                            <SheetTitle className="text-base font-bold text-gray-900">{placeholder}</SheetTitle>
                        </SheetHeader>
                        <div className={MOBILE_BOTTOM_SHEET_BODY}>
                            <ComboboxOptions
                                options={options}
                                value={value}
                                onSelect={handleSelect}
                                placeholder={placeholder}
                                emptyText={emptyText}
                                renderEmpty={renderEmpty}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {triggerButton}
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[min(100%,16rem)] max-w-[min(calc(100vw-1.5rem),var(--radix-popover-trigger-width))] rounded-2xl border-gray-100 p-0 shadow-2xl"
                align="start"
                sideOffset={4}
                collisionPadding={12}
            >
                <ComboboxOptions
                    options={options}
                    value={value}
                    onSelect={handleSelect}
                    placeholder={placeholder}
                    emptyText={emptyText}
                    renderEmpty={renderEmpty}
                />
            </PopoverContent>
        </Popover>
    );
}
