/**
 * Hub layout — server-side session guard before client shell renders.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/rbac';
import { BusinessShellLayout } from '@/components/layout/BusinessShellLayout';

export default async function BusinessLayout({ children }) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  return <BusinessShellLayout>{children}</BusinessShellLayout>;
}
