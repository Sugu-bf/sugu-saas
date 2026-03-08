export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-3 animate-fade-in lg:space-y-5">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-64 rounded-lg bg-gray-200 animate-shimmer" />
          <div className="h-4 w-44 rounded bg-gray-200 animate-shimmer" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-gray-200 animate-shimmer" />
      </div>
      {/* KPIs skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-card h-20 rounded-2xl animate-shimmer"
          />
        ))}
      </div>
      {/* Filter bar skeleton */}
      <div className="glass-card h-14 rounded-2xl animate-shimmer" />
      {/* Table skeleton */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="h-12 bg-gray-50/30 animate-shimmer" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-gray-50 animate-shimmer"
          />
        ))}
        <div className="h-14 animate-shimmer" />
      </div>
    </div>
  );
}
