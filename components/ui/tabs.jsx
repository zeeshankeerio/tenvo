import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

/**
 * @typedef {Object} TabsProps
 * @property {string} [className]
 * @property {string} [value]
 * @property {string} [defaultValue]
 * @property {(value: string) => void} [onValueChange]
 * @property {React.ReactNode} [children]
 */

/** @type {React.FC<TabsProps & React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>>} */
const Tabs = TabsPrimitive.Root

/** @type {React.ForwardRefExoticComponent<TabsProps & React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>} */
const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center gap-0.5 rounded-lg bg-neutral-100/90 p-1 text-neutral-600 border border-neutral-200/80",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/** @type {React.ForwardRefExoticComponent<TabsProps & React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>} */
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:text-sm data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-white/60 data-[state=inactive]:hover:text-neutral-900",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/** @type {React.ForwardRefExoticComponent<TabsProps & React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>} */
const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

