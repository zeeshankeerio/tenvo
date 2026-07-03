/**
 * Admin layout — server-side platform access guard.
 * Redirects non-platform users before the page is ever rendered.
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { isPlatformLevel } from '@/lib/config/platform';

export default async function AdminLayout({ children }) {
  let session = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    // Session lookup failure — treat as unauthenticated
  }

  if (!session?.user) {
    redirect('/login?next=/admin');
  }

  if (!isPlatformLevel(session.user)) {
    // Authenticated but not platform-level — show 403, do not expose admin routes
    redirect('/?access=denied');
  }

  return <>{children}</>;
}
