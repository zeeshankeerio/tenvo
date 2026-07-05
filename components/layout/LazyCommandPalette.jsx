'use client';

import dynamic from 'next/dynamic';

const CommandPalette = dynamic(
  () => import('@/components/layout/CommandPalette').then((mod) => mod.CommandPalette),
  { ssr: false }
);

export function LazyCommandPalette() {
  return <CommandPalette />;
}
