'use client';

/**
 * Shared placeholder while a hub tab code-split chunk loads.
 * Keeps layout stable and avoids blank panels on tab switch.
 */
export function HubTabLoadingSkeleton({ variant = 'panel' }) {
  if (variant === 'compact') {
    return (
      <div className="space-y-3 py-2 animate-pulse" aria-busy="true" aria-label="Loading tab">
        <div className="h-9 w-48 rounded-lg bg-gray-100" />
        <div className="h-40 rounded-xl border border-gray-100 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2 animate-pulse" aria-busy="true" aria-label="Loading tab">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-40 rounded-lg bg-gray-100" />
        <div className="h-9 w-28 rounded-lg bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-gray-100 bg-white" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-gray-100 bg-white" />
    </div>
  );
}
