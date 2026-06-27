'use client';

import { cn } from '@/lib/utils';

/**
 * Calendly-style CSS mesh backdrop — radial gradients with optional slow drift.
 * Respects prefers-reduced-motion via globals.css motion-safe utilities.
 */
export default function MarketingMeshBackground({
  children,
  className,
  variant = 'hero',
  as: Tag = 'div',
}) {
  return (
    <Tag
      className={cn(
        'relative overflow-x-clip',
        variant === 'hero' && 'marketing-mesh-hero',
        variant === 'trust' && 'marketing-mesh-trust',
        variant === 'subtle' && 'marketing-mesh-subtle',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 marketing-mesh-drift"
        aria-hidden
      >
        <div className="absolute -left-[10%] top-[5%] h-[28rem] w-[28rem] rounded-full bg-brand-primary/[0.07] blur-3xl" />
        <div className="absolute -right-[5%] top-[15%] h-[24rem] w-[24rem] rounded-full bg-[var(--brand-secondary)]/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[20rem] w-[32rem] rounded-full bg-brand-primary/[0.04] blur-3xl" />
      </div>
      <div className="relative z-[1]">{children}</div>
    </Tag>
  );
}
