'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight, CSS-driven scroll reveal for public storefront sections.
 * Uses a single IntersectionObserver, no framer-motion. Falls back to fully
 * visible when JS/IO is unavailable or the visitor prefers reduced motion.
 *
 * @param {{
 *   as?: keyof JSX.IntrinsicElements;
 *   stagger?: boolean;   // animate direct children in sequence
 *   enabled?: boolean;   // owner toggle; when false renders plain wrapper
 *   once?: boolean;
 *   threshold?: number;
 *   className?: string;
 *   children: React.ReactNode;
 * }} props
 */
export function StoreReveal({
  as: Tag = 'div',
  stagger = false,
  enabled = true,
  once = true,
  threshold = 0.12,
  className,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, once, threshold]);

  if (!enabled) {
    return (
      <Tag ref={ref} className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={cn(stagger ? 'sf-reveal-stagger' : 'sf-reveal', inView && 'is-in', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
