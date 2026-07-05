import { ProductsSkeleton } from '@/components/storefront/LoadingSkeletons';

export default function StoreProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-md bg-neutral-200" />
      <ProductsSkeleton count={12} />
    </div>
  );
}
