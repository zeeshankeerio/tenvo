export default function BusinessLoading() {
  return (
    <div className="space-y-6 py-4 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl border border-gray-100" />
        ))}
      </div>
      <div className="h-64 bg-gray-50 rounded-xl border border-gray-100" />
    </div>
  );
}
