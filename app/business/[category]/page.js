import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const DashboardClient = nextDynamic(() => import('./DashboardClient'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[80vh] w-full bg-background">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-foreground">Loading Workspace</h3>
          <p className="text-sm text-muted-foreground animate-pulse">Preparing your enterprise environment...</p>
        </div>
      </div>
    </div>
  )
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
