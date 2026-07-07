export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8">
      <div className="mb-6 h-8 w-48 rounded-lg bg-neutral-200" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-200" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-neutral-200" />
      </div>
    </div>
  );
}
