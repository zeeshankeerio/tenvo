'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** @param {{ count?: number; density?: 'default' | 'catalog' | 'showcase' }} props */
export function ProductsSkeleton({ count = 12, density = 'default' }) {
  const gridClass =
    density === 'showcase'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3'
      : density === 'catalog'
        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4'
        : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4';

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} compact={density === 'showcase'} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton({ compact = false }) {
  return (
    <Card className="overflow-hidden border-slate-100">
      <Skeleton className="aspect-square w-full" />
      <CardContent className={compact ? 'space-y-2 p-2' : 'space-y-3 p-4'}>
        <Skeleton className={compact ? 'h-2.5 w-1/3' : 'h-4 w-3/4'} />
        <Skeleton className={compact ? 'h-3 w-full' : 'h-4 w-3/4'} />
        <Skeleton className={compact ? 'h-3 w-2/3' : 'h-3 w-1/2'} />
        <Skeleton className={compact ? 'h-4 w-16' : 'h-5 w-20'} />
        {compact ? <Skeleton className="h-7 w-full rounded-lg" /> : null}
      </CardContent>
    </Card>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Skeleton */}
        <Skeleton className="aspect-square rounded-2xl" />
        
        {/* Info Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-40" />
          </div>
          
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-10 w-64 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-24 h-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-10 w-48 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6 space-y-6">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CategoryNavSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
      ))}
    </div>
  );
}

export function SearchBarSkeleton() {
  return (
    <Skeleton className="h-12 w-full rounded-xl" />
  );
}
