import Link from 'next/link';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StorefrontUnavailable({ domain }) {
  const label = domain ? `@${domain}` : 'this store';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Store className="h-7 w-7 text-gray-400" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Store unavailable</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          The online storefront for {label} is not open right now. The owner may have paused
          public sales while updating inventory or settings.
        </p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/">Back to Tenvo</Link>
        </Button>
      </div>
    </div>
  );
}
