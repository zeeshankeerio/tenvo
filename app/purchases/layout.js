/**
 * Purchases layout — require authenticated session (outside /business shell).
 */
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/rbac';

export default async function PurchasesLayout({ children }) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login?next=/purchases');
  }

  return children;
}
