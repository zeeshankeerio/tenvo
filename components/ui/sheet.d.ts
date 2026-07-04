import type * as React from 'react';

type SheetSide = 'top' | 'bottom' | 'left' | 'right';

export const Sheet: React.ComponentType<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}>;

export const SheetPortal: React.ComponentType<{ children?: React.ReactNode }>;
export const SheetOverlay: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>;
export const SheetTrigger: React.ForwardRefExoticComponent<
  React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>
>;
export const SheetClose: React.ForwardRefExoticComponent<
  React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>
>;

export const SheetContent: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & {
    side?: SheetSide;
    hideCloseButton?: boolean;
  } & React.RefAttributes<HTMLDivElement>
>;

export const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export const SheetFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;

export const SheetTitle: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>
>;

export const SheetDescription: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>
>;
