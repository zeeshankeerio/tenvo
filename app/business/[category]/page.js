import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const DashboardClient = nextDynamic(() => import('./DashboardClient'), {
  loading: () => (
    <div className="space-y-6 py-4 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  ),
  ssr: false,
});

export async function generateMetadata({ params }) {
  const { category: categoryParam } = await params;
  const category = categoryParam || 'retail-shop';
  const title = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    title: `${title} Dashboard | Tenvo Enterprise`,
    description: `Manage your ${title} operations, inventory, sales, and analytics with enterprise-grade tools.`,
  };
}

export default function BusinessDashboardPage() {
  return <DashboardClient />;
}
