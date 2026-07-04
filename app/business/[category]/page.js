import DashboardClientDynamic from './DashboardClientDynamic';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { category: categoryParam } = await params;
  const category = categoryParam || 'retail-shop';
  const title = category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title: `${title} Dashboard | Tenvo Enterprise`,
    description: `Manage your ${title} operations, inventory, sales, and analytics with enterprise-grade tools.`,
  };
}

export default function BusinessDashboardPage() {
  return <DashboardClientDynamic />;
}
