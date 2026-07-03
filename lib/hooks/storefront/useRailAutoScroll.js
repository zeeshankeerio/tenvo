'use client';

import { useEffect } from 'react';

/**
 * Gently auto-advances a horizontal scroll container (carousel / product rail).
 *
 * Behaviour, tuned for editorial storefronts (Zellbury / Khaadi style):
 * - Steps forward by roughly one card at a time using smooth `scrollBy`, so
 *   product cards stay readable (not a continuous marquee).
 * - Only runs when the track actually overflows, so wrapped/short rows stay put.
 * - Pauses while the visitor hovers, focuses, wheels, or touches the rail, and
 *   resumes after a short cooldown so manual browsing always wins.
 * - Pauses when the tab is hidden and respects `prefers-reduced-motion`.
 * - Loops back to the start once the end is reached.
 *
 * @param {import('react').RefObject<HTMLElement>} ref Scroll container ref.
 * @param {{
 *   enabled?: boolean;
 *   interval?: number;      // ms between advances
 *   step?: number;          // px per advance; defaults to first child width + gap
 *   cooldown?: number;      // ms to stay paused after a manual interaction
 * }} [options]
 */
export function useRailAutoScroll(ref, { enabled = true, interval = 3800, step, cooldown = 5000 } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof window === 'undefined') return undefined;
    const el = ref?.current;
    if (!el) return undefined;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) return undefined;

    let paused = false;
    let hovering = false;
    let cooldownTimer = null;
    let tickTimer = null;

    const hasOverflow = () => el.scrollWidth - el.clientWidth > 8;

    const computeStep = () => {
      if (typeof step === 'number' && step > 0) return step;
      const child = el.firstElementChild;
      if (child) {
        const styles = window.getComputedStyle(el);
        const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
        const width = child.getBoundingClientRect().width;
        if (width > 0) return width + gap;
      }
      return el.clientWidth * 0.8;
    };

    const advance = () => {
      if (paused || hovering || !hasOverflow()) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: computeStep(), behavior: 'smooth' });
      }
    };

    const beginCooldown = () => {
      paused = true;
      if (cooldownTimer) window.clearTimeout(cooldownTimer);
      cooldownTimer = window.setTimeout(() => {
        paused = false;
      }, cooldown);
    };

    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };
    const onVisibility = () => {
      paused = document.hidden;
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('focusin', onEnter);
    el.addEventListener('focusout', onLeave);
    el.addEventListener('wheel', beginCooldown, { passive: true });
    el.addEventListener('touchstart', beginCooldown, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    tickTimer = window.setInterval(advance, interval);

    return () => {
      if (tickTimer) window.clearInterval(tickTimer);
      if (cooldownTimer) window.clearTimeout(cooldownTimer);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('focusin', onEnter);
      el.removeEventListener('focusout', onLeave);
      el.removeEventListener('wheel', beginCooldown);
      el.removeEventListener('touchstart', beginCooldown);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ref, enabled, interval, step, cooldown]);
}
