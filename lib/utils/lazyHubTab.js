'use client';

import dynamic from 'next/dynamic';
import { HubTabLoadingSkeleton } from '@/components/guards/HubTabLoadingSkeleton';

/**
 * Hub tab code-split helper. Options must live in this module as an object literal
 * (Next.js rejects non-literal dynamic options at call sites).
 */
export function lazyHubTab(loader) {
  return dynamic(loader, {
    loading: () => <HubTabLoadingSkeleton />,
  });
}
